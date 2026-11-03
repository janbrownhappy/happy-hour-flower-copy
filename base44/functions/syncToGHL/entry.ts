import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { requireAutomationCaller } from '../../shared/automationAuth.ts';

/**
 * Syncs a contact to GoHighLevel (GHL) via an inbound webhook URL.
 * Mirrors syncToMailerLite so both pipelines can run in PARALLEL during testing —
 * this function does NOT touch or replace the MailerLite flow.
 *
 * Two ways to call:
 *  1. Directly: { email, name, fields:{...} }
 *  2. From an entity automation: { event, data, old_data } — the function
 *     maps the entity record to a GHL contact payload.
 *
 * Uses email as the upsert key. GHL inbound webhooks dedupe on email, so
 * repeated syncs update the existing contact instead of creating duplicates.
 *
 * Every attempt (success or failure) is logged to ActivityLog so you can
 * audit the sync from the admin dashboard while bulletproofing.
 */
// Format a YYYY-MM-DD date into GHL's expected "MMM D, YYYY" (e.g. "May 15, 1990").
// Returns '' for empty/invalid input so GHL's date field isn't rejected.
const GHL_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function formatGhlDate(value) {
  if (!value) return '';
  const m = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return '';
  const [, year, month, day] = m;
  const monthName = GHL_MONTHS[parseInt(month, 10) - 1];
  if (!monthName) return '';
  return `${monthName} ${parseInt(day, 10)}, ${year}`;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const denied = await requireAutomationCaller(base44, req);
    if (denied) return denied;
    const webhookUrl = Deno.env.get('GHL_WEBHOOK_URL');
    if (!webhookUrl) {
      return Response.json({ error: 'GHL_WEBHOOK_URL not configured' }, { status: 500 });
    }

    const body = await req.json();

    // DEBUG: report the masked webhook URL we're actually POSTing to, so we can
    // diff it against the URL the GHL trigger expects (no secret exposed).
    if (body.debug_url_check) {
      let masked = webhookUrl;
      try {
        const u = new URL(webhookUrl);
        const seg = u.pathname.split('/').filter(Boolean);
        const lastId = seg[seg.length - 1] || '';
        const maskedId = lastId.length > 10
          ? `${lastId.slice(0, 6)}…${lastId.slice(-4)}`
          : lastId;
        if (seg.length) seg[seg.length - 1] = maskedId;
        masked = `${u.host}/${seg.join('/')}`;
      } catch (_) { masked = 'unparseable'; }
      return Response.json({ debug: true, webhook_host_path: masked });
    }

    // Resolve the contact from either a direct call or an automation payload
    let email = body.email || '';
    let name = body.name || '';
    let phone = body.phone || '';
    let fields = body.fields || {};
    let triggerKey = body.trigger_key || '';

    const event = body.event;
    if (event && event.entity_name) {
      const entityName = event.entity_name;
      let data = body.data;
      if (body.payload_too_large && event.entity_id) {
        data = await base44.asServiceRole.entities.get(entityName, event.entity_id);
      }
      if (!data) {
        return Response.json({ error: 'Missing entity data' }, { status: 400 });
      }

      if (entityName === 'Profile') {
        email = data.email || '';
        name = data.display_name || '';
        phone = data.phone || '';
        const tier = data.subscription_tier || (data.is_premium ? 'premium' : 'free');
        fields = {
          contact_type: tier && tier !== 'free' ? 'consumer-premium' : 'consumer-free',
          app_subscription_tier: tier,
          app_subscription_status: data.subscription_status || 'active',
          app_subscription_expires_at: data.subscription_expires_at || '',
          app_zip_code: data.zip_code || '',
          app_consumer_date_of_birth: data.date_of_birth || '',
          app_notif_new_deals: data.notif_new_deals === true,
          app_location_services_enabled: data.location_services_enabled === true,
          app_preferred_neighborhood: data?.location_preferences?.neighborhood || '',
          app_preferred_city: data?.location_preferences?.city || '',
        };
        triggerKey = tier && tier !== 'free' ? 'consumer_premium' : 'consumer_signup';
      } else if (entityName === 'Waitlist') {
        email = data.email || '';
        name = [data.first_name, data.last_name].filter(Boolean).join(' ');
        phone = data.phone || '';
        fields = { zip_code: data.zip_code || '' };
        triggerKey = 'waitlist_signup';
      } else if (entityName === 'Lead') {
        email = data.email || '';
        name = [data.first_name, data.last_name].filter(Boolean).join(' ');
        phone = data.phone || '';
        fields = { contact_type: 'lead', zip_code: data.zip_code || '', venue_name: data.venue_name || '' };
        triggerKey = data.role === 'venue_owner' ? 'lead_venue_owner' : 'lead_consumer';
      } else if (entityName === 'Venue') {
        email = data.email || '';
        name = data.name || '';
        phone = data.phone || '';
        const venueTier = data.subscription_tier || 'free';
        fields = {
          contact_type: `venue-${venueTier}`,
          venue_name: data.name || '',
          app_subscription_tier: venueTier,
          venue_address: data.address || '',
          venue_city: data.city || '',
          zip_code: data.zip_code || '',
          venue_neighborhood: data.neighborhood || '',
          venue_category: data.category || '',
          venue_phone: data.phone || '',
          venue_website: data.website || '',
          venue_facebook_url: data.facebook_url || '',
          venue_instagram_url: data.instagram_url || '',
          venue_tiktok_url: data.tiktok_url || '',
          venue_threads_url: data.threads_url || '',
          venue_youtube_url: data.youtube_url || '',
          venue_x_url: data.x_url || '',
          venue_reservation_policy: data.reservation_policy || '',
          venue_happy_hour_start: data.happy_hour_start || '',
          venue_happy_hour_end: data.happy_hour_end || '',
          venue_days: Array.isArray(data.days) ? data.days.join(', ') : '',
          venue_billing_status: data.billing_status || '',
          venue_verification_status: data.verification_status || '',
          venue_view_count: typeof data.view_count === 'number' ? data.view_count : 0,
          venue_favorite_count: typeof data.favorite_count === 'number' ? data.favorite_count : 0,
        };
        triggerKey = `venue_${venueTier}`;
      }
    }

    if (!email) {
      try {
        await base44.asServiceRole.entities.GHLSyncLog.create({
          email: '', trigger_key: triggerKey || '', source_entity: event?.entity_name || 'direct',
          status: 'skipped', detail: 'No email on record',
        });
      } catch (_) { /* never block */ }
      return Response.json({ success: false, skipped: 'no_email' });
    }

    // Build GHL inbound-webhook payload. Split name into first/last for GHL's contact model.
    const [firstName, ...rest] = (name || '').trim().split(' ');
    const lastName = rest.join(' ');
    // Send custom fields BOTH ways so GHL merge tags resolve no matter how the
    // inbound-webhook trigger captured its reference sample:
    //   - nested under `customField` -> {{inboundWebhookRequest.customField.app_zip_code}}
    //   - flat at the root           -> {{inboundWebhookRequest.app_zip_code}}
    const ghlPayload = {
      email,
      first_name: firstName || '',
      last_name: lastName || '',
      full_name: name || '',
      phone: phone || '',
      tags: ['app-user', triggerKey].filter(Boolean),
      trigger_key: triggerKey || '',
      customField: { ...fields },
      ...fields,
    };

    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(ghlPayload),
    });

    const resText = await res.text().catch(() => '');

    // Log every attempt for auditability while we bulletproof the pipeline
    try {
      await base44.asServiceRole.entities.GHLSyncLog.create({
        email,
        trigger_key: triggerKey || '',
        source_entity: event?.entity_name || 'direct',
        status: res.ok ? 'success' : 'failed',
        http_status: res.status,
        detail: res.ok ? 'Synced to GHL' : `GHL webhook error: ${resText?.slice(0, 500)}`,
        payload: ghlPayload,
      });
    } catch (_) { /* logging optional — never block the sync */ }

    if (!res.ok) {
      return Response.json({ success: false, status: res.status, error: 'GHL webhook error', details: resText }, { status: res.status });
    }

    return Response.json({ success: true, email, trigger_key: triggerKey || null });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});