import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { requireAutomationCaller } from '../../shared/automationAuth.ts';

/**
 * Syncs a subscriber to MailerLite — upserts the contact and optionally
 * adds them to a group (which can trigger a MailerLite automation sequence).
 *
 * Two ways to call:
 *  1. Directly: { email, name, fields:{...}, group_id }
 *  2. From an entity automation: { event, data, old_data } — the function
 *     maps the entity record to a subscriber and a configured group.
 *
 * Group routing for automations is driven by the MailerLiteGroupMap entity,
 * so groups/sequences can be configured from the admin UI without code changes.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const denied = await requireAutomationCaller(base44, req);
    if (denied) return denied;
    const apiKey = Deno.env.get('MAILERLITE_API_KEY');
    if (!apiKey) {
      return Response.json({ error: 'MAILERLITE_API_KEY not configured' }, { status: 500 });
    }

    const body = await req.json();

    // Resolve the subscriber + target group from either a direct call or an automation payload
    let email = body.email || '';
    let name = body.name || '';
    let fields = body.fields || {};
    let groupId = body.group_id || '';
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
        fields = {
          zip_code: data.zip_code || '',
          tier: data.subscription_tier || (data.is_premium ? 'premium' : 'free'),
          city: data?.location_preferences?.city || '',
          neighborhood: data?.location_preferences?.neighborhood || '',
        };
        triggerKey = data.subscription_tier && data.subscription_tier !== 'free' ? 'consumer_premium' : 'consumer_signup';
      } else if (entityName === 'Waitlist') {
        email = data.email || '';
        name = [data.first_name, data.last_name].filter(Boolean).join(' ');
        fields = { zip_code: data.zip_code || '' };
        triggerKey = 'waitlist_signup';
      } else if (entityName === 'Lead') {
        email = data.email || '';
        name = [data.first_name, data.last_name].filter(Boolean).join(' ');
        fields = { zip_code: data.zip_code || '', venue_name: data.venue_name || '' };
        triggerKey = data.role === 'venue_owner' ? 'lead_venue_owner' : 'lead_consumer';
      } else if (entityName === 'Venue') {
        email = data.email || '';
        name = data.name || '';
        fields = {
          zip_code: data.zip_code || '',
          tier: data.subscription_tier || 'free',
          venue_name: data.name || '',
        };
        triggerKey = 'venue_active';
      }
    }

    if (!email) {
      return Response.json({ success: false, skipped: 'no_email' });
    }

    // If no explicit group was passed, look one up by trigger key from the admin-managed map
    if (!groupId && triggerKey) {
      try {
        const maps = await base44.asServiceRole.entities.MailerLiteGroupMap.filter({ trigger_key: triggerKey, is_active: true });
        if (maps && maps.length > 0) groupId = maps[0].group_id;
      } catch (_) { /* entity may not exist yet */ }
    }

    // Build MailerLite subscriber payload. The upsert endpoint also accepts a `groups` array.
    const subscriberPayload = {
      email,
      fields: { name: name || undefined, ...fields },
    };
    if (groupId) subscriberPayload.groups = [String(groupId)];

    const res = await fetch('https://connect.mailerlite.com/api/subscribers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(subscriberPayload),
    });

    const resBody = await res.json().catch(() => ({}));
    if (!res.ok) {
      return Response.json({ success: false, status: res.status, error: resBody?.message || 'MailerLite error', details: resBody }, { status: res.status });
    }

    return Response.json({ success: true, subscriber_id: resBody?.data?.id, email, group_id: groupId || null, trigger_key: triggerKey || null });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});