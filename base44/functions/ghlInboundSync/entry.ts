import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { secrets } from 'base44:runtime';

/**
 * Reverse sync (GHL -> app).
 * GHL's outbound webhook POSTs a contact payload here when a contact is
 * created or updated in GHL. We authenticate via a shared-secret header,
 * resolve the matching Profile AND Venue by email, and update whichever
 * records exist with the fields GHL sends. We NEVER create new records
 * from inbound data — unmatched contacts are skipped + logged.
 *
 * Auth: header `x-ghl-webhook-secret` must equal the GHL_WEBHOOK_SECRET secret.
 * Configure this header in the GHL outbound-webhook setup.
 *
 * Feedback-loop guard: writes go through base44.asServiceRole.entities.*.update.
 * If those writes re-fire the app->GHL sync workflow, syncToGHL just upserts the
 * same contact by email (idempotent), so no infinite loop or duplicates result.
 */
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);

    const expectedSecret = secrets.get('GHL_WEBHOOK_SECRET');
    const providedSecret =
      req.headers.get('x-ghl-webhook-secret') ||
      req.headers.get('X-GHL-Webhook-Secret') ||
      '';
    if (!expectedSecret || providedSecret !== expectedSecret) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));

    // GHL payloads vary; pull common shapes for email/name/phone.
    const contact = body.contact || body;
    const email = (contact.email || body.email || '').trim();
    const fullName =
      contact.full_name ||
      contact.name ||
      [contact.first_name, contact.last_name].filter(Boolean).join(' ') ||
      [body.first_name, body.last_name].filter(Boolean).join(' ') ||
      '';
    const phone = contact.phone || body.phone || '';
    // Any app-owned custom fields GHL echoes back
    const custom = contact.customField || contact.custom_fields || body.customField || {};

    const log = async (status, detail, extra) => {
      try {
        await base44.asServiceRole.entities.GHLSyncLog.create({
          email: email || '',
          trigger_key: 'ghl_inbound',
          source_entity: 'ghl_webhook',
          status,
          detail,
          payload: { email, fullName, phone, ...(extra || {}) },
        });
      } catch (_) { /* never block */ }
    };

    if (!email) {
      await log('skipped', 'Inbound GHL payload had no email');
      return Response.json({ success: false, skipped: 'no_email' });
    }

    const results = { profile_updated: false, venue_updated: false };

    // ---- Profile ----
    const profiles = await base44.asServiceRole.entities.Profile.filter({ email });
    if (profiles.length > 0) {
      const updates = {};
      if (fullName) updates.display_name = fullName;
      if (phone) updates.phone = phone;
      if (custom.app_zip_code) updates.zip_code = custom.app_zip_code;
      if (Object.keys(updates).length > 0) {
        await base44.asServiceRole.entities.Profile.update(profiles[0].id, updates);
        results.profile_updated = true;
      }
    }

    // ---- Venue ----
    const venues = await base44.asServiceRole.entities.Venue.filter({ email });
    if (venues.length > 0) {
      const vUpdates = {};
      if (fullName) vUpdates.name = fullName;
      if (phone) vUpdates.phone = phone;
      if (custom.venue_website) vUpdates.website = custom.venue_website;
      if (custom.venue_address) vUpdates.address = custom.venue_address;
      if (custom.venue_city) vUpdates.city = custom.venue_city;
      if (custom.zip_code) vUpdates.zip_code = custom.zip_code;
      if (Object.keys(vUpdates).length > 0) {
        await base44.asServiceRole.entities.Venue.update(venues[0].id, vUpdates);
        results.venue_updated = true;
      }
    }

    if (!results.profile_updated && !results.venue_updated) {
      await log('skipped', 'No matching Profile or Venue for inbound GHL contact', results);
      return Response.json({ success: false, skipped: 'no_match' });
    }

    await log('success', 'Applied inbound GHL update to app record(s)', results);
    return Response.json({ success: true, email, ...results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}