import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { secrets } from 'base44:runtime';

// Admin-only: approve or reject a paid, pending ad campaign.
// On approve: status -> approved (enters rotation) + fires the "ad approved" email.
// On reject:  status -> rejected with an optional note.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const { campaign_id, action, note } = await req.json();
    if (!campaign_id || !action) {
      return Response.json({ error: 'campaign_id and action are required' }, { status: 400 });
    }

    const campaign = await base44.asServiceRole.entities.AdCampaign.get(campaign_id).catch(() => null);
    if (!campaign) return Response.json({ error: 'Ad campaign not found' }, { status: 404 });

    const now = new Date().toISOString();

    if (action === 'approve') {
      if (campaign.payment_status !== 'paid') {
        return Response.json({ error: 'Cannot approve an unpaid ad' }, { status: 400 });
      }
      await base44.asServiceRole.entities.AdCampaign.update(campaign_id, {
        status: 'approved',
        approved_at: now,
        admin_note: note || campaign.admin_note || '',
      });
      await base44.asServiceRole.functions.invoke('sendAdStatusEmail', {
        campaign_id,
        kind: 'approved',
        internal_key: secrets.get('HHF_WEBHOOK_KEY'),
      }).catch(() => {});
      return Response.json({ ok: true, status: 'approved' });
    }

    if (action === 'reject') {
      await base44.asServiceRole.entities.AdCampaign.update(campaign_id, {
        status: 'rejected',
        rejected_at: now,
        admin_note: note || '',
      });
      return Response.json({ ok: true, status: 'rejected' });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});