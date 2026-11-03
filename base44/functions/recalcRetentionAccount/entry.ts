import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { requireAutomationCaller } from '../../shared/automationAuth.ts';
import { DAY_MS } from '../../shared/churnScoring.ts';
import { scoreAndPersistAccount, buildRulesByKey } from '../../shared/churnPersist.ts';

// Recalculates the churn score for a SINGLE account on demand (admin manual recalc, or
// an event-driven recalc like a payment failure). Reuses the exact same scoring logic as
// the chunked engine. Payload: { entity_type: "venue"|"consumer", account_ref_id, reason? }
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const denied = await requireAutomationCaller(base44, req);
    if (denied) return denied;

    let body = {};
    try { body = await req.json(); } catch { body = {}; }
    const { entity_type: entityType, account_ref_id: accountRefId, reason } = body;
    if (!entityType || !accountRefId) {
      return Response.json({ error: 'entity_type and account_ref_id are required' }, { status: 400 });
    }

    const rules = await base44.asServiceRole.entities.ChurnScoringRule.list('', 500).catch(() => []);
    const rulesByKey = buildRulesByKey(rules, entityType);
    const now = Date.now();

    const existing = await base44.asServiceRole.entities.RetentionProfile.filter(
      { account_ref_id: accountRefId }, '-created_date', 1
    ).catch(() => []);

    const maxTime = (arr, field) => arr.reduce((m, r) => {
      const t = new Date(r[field] || r.created_date || 0).getTime();
      return isNaN(t) ? m : Math.max(m, t);
    }, null);

    let result;
    if (entityType === 'venue') {
      const v = await base44.asServiceRole.entities.Venue.get(accountRefId).catch(() => null);
      if (!v) return Response.json({ error: 'Venue not found' }, { status: 404 });

      const [offerStats, listings, checkins, favorites, reviews, ownerSessions] = await Promise.all([
        base44.asServiceRole.entities.OfferStat.filter({ venue_id: v.id }, '-last_activity_at', 50).catch(() => []),
        base44.asServiceRole.entities.Listing.filter({ venue_ref_id: v.id }, '-created_date', 50).catch(() => []),
        base44.asServiceRole.entities.CheckIn.filter({ venue_id: v.id }, '-created_date', 20).catch(() => []),
        base44.asServiceRole.entities.Favorite.filter({ venue_id: v.id }, '-created_date', 20).catch(() => []),
        base44.asServiceRole.entities.Review.filter({ venue_id: v.id }, '-created_date', 20).catch(() => []),
        v.owner_id ? base44.asServiceRole.entities.AppSession.filter({ user_id: v.owner_id }, '-started_at', 1).catch(() => []) : Promise.resolve([]),
      ]);
      const lastOfferActivityAt = maxTime(offerStats, 'last_activity_at');
      const lastTrafficAt = [maxTime(checkins, 'created_date'), maxTime(favorites, 'created_date'), maxTime(reviews, 'created_date')]
        .filter(x => x != null).reduce((m, t) => m == null ? t : Math.max(m, t), null);
      const ownerLastActiveAt = ownerSessions[0] ? new Date(ownerSessions[0].started_at).getTime() : null;
      const activeListings = listings.filter(l => {
        if (!l.expires_at) return true;
        const e = new Date(l.expires_at).getTime();
        return isNaN(e) || e >= now;
      });
      const hasStaleListings = listings.length === 0 || activeListings.length === 0;
      let ownerEmail = '';
      if (v.owner_id) {
        const owner = await base44.asServiceRole.entities.User.get(v.owner_id).catch(() => null);
        ownerEmail = owner?.email || '';
      }
      const lastActivityIso = (lastTrafficAt || lastOfferActivityAt)
        ? new Date(Math.max(lastTrafficAt || 0, lastOfferActivityAt || 0)).toISOString() : null;

      result = await scoreAndPersistAccount(base44, {
        entityType: 'venue', source: v, rulesByKey,
        ctx: { lastOfferActivityAt, lastTrafficAt, ownerLastActiveAt, hasStaleListings, ownerEmail, lastActivityIso, lastActiveAt: ownerLastActiveAt },
        existingProfile: existing[0] || null,
        historyReasonOverride: reason === 'manual' ? 'manual_recalc' : null,
      });
    } else {
      const p = await base44.asServiceRole.entities.Profile.get(accountRefId).catch(() => null);
      if (!p) return Response.json({ error: 'Profile not found' }, { status: 404 });
      const consumerId = p.created_by_id;
      const [sessions, favorites, rollups] = await Promise.all([
        consumerId ? base44.asServiceRole.entities.AppSession.filter({ user_id: consumerId }, '-started_at', 1).catch(() => []) : Promise.resolve([]),
        consumerId ? base44.asServiceRole.entities.Favorite.filter({ created_by_id: consumerId }, '-created_date', 1).catch(() => []) : Promise.resolve([]),
        consumerId ? base44.asServiceRole.entities.ConsumerEngagementRollup.filter({ consumer_id: consumerId }, '-week_start', 6).catch(() => []) : Promise.resolve([]),
      ]);
      const lastActiveAt = sessions[0] ? new Date(sessions[0].started_at).getTime() : null;
      const source = {
        id: p.id,
        created_by_id: consumerId,
        display_name: p.display_name,
        email: p.email,
        subscription_tier: p.subscription_tier || (p.is_premium ? 'premium' : 'free'),
        subscription_expires_at: p.subscription_expires_at,
        billing_status: p.subscription_status === 'past_due' ? 'past_due' : undefined,
        notif_push: p.notif_push,
      };
      result = await scoreAndPersistAccount(base44, {
        entityType: 'consumer', source, rulesByKey,
        ctx: { lastActiveAt, favoriteCount: favorites.length, rollups, lastActivityIso: lastActiveAt ? new Date(lastActiveAt).toISOString() : null },
        existingProfile: existing[0] || null,
        historyReasonOverride: reason === 'manual' ? 'manual_recalc' : null,
      });
    }

    return Response.json({ success: true, churn_score: result.churnScore, risk_category: result.riskCategory, profile_id: result.profileId });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}