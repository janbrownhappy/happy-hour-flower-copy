import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Returns the full retention detail for a single account: the RetentionProfile, its active
// + resolved signals, its score history, and (for consumers) recent engagement rollups.
// Admin-only. Payload: { account_ref_id }
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    let body = {};
    try { body = await req.json(); } catch { body = {}; }
    const accountRefId = body.account_ref_id;
    if (!accountRefId) return Response.json({ error: 'account_ref_id required' }, { status: 400 });

    const profiles = await base44.asServiceRole.entities.RetentionProfile.filter(
      { account_ref_id: accountRefId }, '-created_date', 1
    ).catch(() => []);
    const profile = profiles[0] || null;
    if (!profile) return Response.json({ error: 'No retention profile for this account' }, { status: 404 });

    const [signals, history, rollups] = await Promise.all([
      base44.asServiceRole.entities.ChurnSignal.filter({ account_ref_id: accountRefId }, '-detected_at', 100).catch(() => []),
      base44.asServiceRole.entities.ChurnScoreHistory.filter({ account_ref_id: accountRefId }, '-recorded_at', 60).catch(() => []),
      profile.entity_type === 'consumer' && profile.consumer_id
        ? base44.asServiceRole.entities.ConsumerEngagementRollup.filter({ consumer_id: profile.consumer_id }, '-week_start', 8).catch(() => [])
        : Promise.resolve([]),
    ]);

    return Response.json({
      success: true,
      profile,
      signals,
      history: history.slice().reverse(), // oldest -> newest for charting
      rollups,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}