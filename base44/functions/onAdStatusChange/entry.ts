import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { secrets } from 'base44:runtime';
import { requireAutomationCaller } from '../../shared/automationAuth.ts';

// Entity automation handler: fires on AdCampaign updates.
// When status transitions INTO 'approved' or 'rejected', emails the venue owner
// instantly via sendAdStatusEmail (which uses the editable ad_* EmailTemplates).
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const denied = await requireAutomationCaller(base44, req);
    if (denied) return denied;
    const payload = await req.json();

    const event = payload?.event || {};
    let data = payload?.data;
    const oldData = payload?.old_data;
    const entityId = event.entity_id;

    // Re-fetch if the payload was too large to include the data inline.
    if (payload?.payload_too_large && entityId) {
      data = await base44.asServiceRole.entities.AdCampaign.get(entityId).catch(() => null);
    }
    if (!data) return Response.json({ skipped: true, reason: 'No data' });

    const newStatus = data.status;
    const prevStatus = oldData?.status;

    // Only act on a real transition into approved/rejected.
    if (newStatus !== 'approved' && newStatus !== 'rejected') {
      return Response.json({ skipped: true, reason: 'Status not approved/rejected' });
    }
    if (newStatus === prevStatus) {
      return Response.json({ skipped: true, reason: 'Status unchanged' });
    }

    const res = await base44.functions.invoke('sendAdStatusEmail', {
      campaign_id: entityId || data.id,
      kind: newStatus, // 'approved' or 'rejected'
      internal_key: secrets.get('HHF_WEBHOOK_KEY'),
    });

    return Response.json({ success: true, kind: newStatus, result: res?.data ?? null });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});