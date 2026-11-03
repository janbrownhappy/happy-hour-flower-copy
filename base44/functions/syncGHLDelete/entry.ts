import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { requireAutomationCaller } from '../../shared/automationAuth.ts';
import { secrets } from 'base44:runtime';

/**
 * Delete propagation (app -> GHL).
 * Fired by the entity-trigger workflows on Profile/Venue delete.
 * Looks up the GHL contact by email and applies 'churned' + 'inactive' tags
 * (without removing the contact) so marketing can run win-back sequences.
 *
 * Payload from the workflow: { event: { entity_name }, data } (or payload_too_large + entity_id).
 * Every attempt is logged to GHLSyncLog.
 */
const GHL_API_BASE = 'https://services.leadconnectorhq.com';

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const denied = await requireAutomationCaller(base44, req);
    if (denied) return denied;
    const apiKey = secrets.get('GHL_LOCATION_API_KEY');
    if (!apiKey) {
      return Response.json({ error: 'GHL_LOCATION_API_KEY not configured' }, { status: 500 });
    }

    const body = await req.json();
    const event = body.event;
    const entityName = event?.entity_name;
    const data = body.data;

    if (!entityName || !data) {
      return Response.json({ error: 'Missing entity event/data' }, { status: 400 });
    }

    let email = '';
    let triggerKey = '';
    if (entityName === 'Profile') {
      email = data.email || '';
      triggerKey = 'consumer_churned';
    } else if (entityName === 'Venue') {
      email = data.email || '';
      triggerKey = 'venue_churned';
    } else {
      return Response.json({ success: false, skipped: 'unsupported_entity' });
    }

    const log = async (status, detail, httpStatus, payload) => {
      try {
        await base44.asServiceRole.entities.GHLSyncLog.create({
          email, trigger_key: triggerKey, source_entity: entityName,
          status, http_status: httpStatus, detail, payload,
        });
      } catch (_) { /* never block */ }
    };

    if (!email) {
      await log('skipped', 'No email on deleted record');
      return Response.json({ success: false, skipped: 'no_email' });
    }

    const authHeaders = {
      'Authorization': `Bearer ${apiKey}`,
      'Version': '2021-07-28',
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    // 1. Look up the contact by email
    const searchRes = await fetch(
      `${GHL_API_BASE}/contacts/?query=${encodeURIComponent(email)}`,
      { method: 'GET', headers: authHeaders }
    );
    const searchText = await searchRes.text().catch(() => '');
    if (!searchRes.ok) {
      await log('failed', `GHL contact search error: ${searchText.slice(0, 500)}`, searchRes.status);
      return Response.json({ success: false, error: 'GHL contact search failed', details: searchText }, { status: searchRes.status });
    }

    let contactId = '';
    try {
      const parsed = JSON.parse(searchText);
      const match = (parsed.contacts || []).find(
        (c) => (c.email || '').toLowerCase() === email.toLowerCase()
      ) || (parsed.contacts || [])[0];
      contactId = match?.id || '';
    } catch (_) { /* fall through */ }

    if (!contactId) {
      await log('skipped', 'No matching GHL contact to tag as churned', searchRes.status);
      return Response.json({ success: false, skipped: 'no_ghl_contact' });
    }

    // 2. Add the churned/inactive tags to the contact
    const tagRes = await fetch(`${GHL_API_BASE}/contacts/${contactId}/tags`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ tags: ['churned', 'inactive'] }),
    });
    const tagText = await tagRes.text().catch(() => '');

    await log(
      tagRes.ok ? 'success' : 'failed',
      tagRes.ok ? 'Tagged GHL contact churned + inactive' : `GHL tag error: ${tagText.slice(0, 500)}`,
      tagRes.status,
      { contactId, tags: ['churned', 'inactive'] }
    );

    if (!tagRes.ok) {
      return Response.json({ success: false, status: tagRes.status, error: 'GHL tag failed', details: tagText }, { status: tagRes.status });
    }

    return Response.json({ success: true, email, contactId, trigger_key: triggerKey });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}