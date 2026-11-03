import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { requireAutomationCaller } from '../../shared/automationAuth.ts';
import { mondayOf, isoDate, DAY_MS } from '../../shared/churnScoring.ts';

// Weekly consumer engagement rollup. Aggregates the PRIOR completed week (Mon-Sun)
// of per-consumer activity from AppSession + CheckIn + Favorite into ConsumerEngagementRollup,
// giving the scoring engine a queryable behavioral baseline. Admin/scheduled only.
//
// Note: search / venue_view / premium_feature_attempt / directions counts come from
// analytics.track() which is not queryable per-user, so those columns stay 0 for now
// (Phase 2 enrichment). app_opens, favorites_added and checkins are entity-backed and real.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const denied = await requireAutomationCaller(base44, req);
    if (denied) return denied;

    // The most recently completed week: the Monday before this week's Monday.
    const thisMonday = mondayOf(new Date());
    const weekStart = new Date(thisMonday.getTime() - 7 * DAY_MS);
    const weekEnd = new Date(thisMonday.getTime() - 1);
    const weekStartKey = isoDate(weekStart);

    const inWeek = (iso) => {
      if (!iso) return false;
      const t = new Date(iso).getTime();
      return t >= weekStart.getTime() && t <= weekEnd.getTime();
    };

    // Pull the week's activity. These are bounded to a single week so counts stay reasonable.
    const [sessions, checkins, favorites] = await Promise.all([
      base44.asServiceRole.entities.AppSession.filter({}, '-started_at', 5000).catch(() => []),
      base44.asServiceRole.entities.CheckIn.filter({}, '-created_date', 5000).catch(() => []),
      base44.asServiceRole.entities.Favorite.filter({}, '-created_date', 5000).catch(() => []),
    ]);

    const perConsumer = {};
    const bump = (uid, field) => {
      if (!uid) return;
      if (!perConsumer[uid]) {
        perConsumer[uid] = { app_opens: 0, favorites_added: 0, checkins: 0 };
      }
      perConsumer[uid][field] += 1;
    };

    for (const s of sessions) {
      if (inWeek(s.started_at)) bump(s.user_id || s.created_by_id, 'app_opens');
    }
    for (const c of checkins) {
      if (inWeek(c.checked_in_at || c.created_date)) bump(c.user_id || c.created_by_id, 'checkins');
    }
    for (const f of favorites) {
      if (inWeek(f.created_date)) bump(f.created_by_id || f.user_id, 'favorites_added');
    }

    const consumerIds = Object.keys(perConsumer);
    if (consumerIds.length === 0) {
      return Response.json({ success: true, week_start: weekStartKey, rolled_up: 0 });
    }

    // Load existing rollups for this week to avoid duplicates (idempotent re-runs).
    const existing = await base44.asServiceRole.entities.ConsumerEngagementRollup.filter(
      { week_start: weekStartKey }, '-created_date', 5000
    ).catch(() => []);
    const existingByConsumer = {};
    for (const r of existing) existingByConsumer[r.consumer_id] = r;

    const toCreate = [];
    const toUpdate = [];
    for (const uid of consumerIds) {
      const counts = perConsumer[uid];
      const total = counts.app_opens + counts.favorites_added + counts.checkins;
      const row = {
        consumer_id: uid,
        week_start: weekStartKey,
        week_key: `${uid}::${weekStartKey}`,
        app_opens: counts.app_opens,
        searches: 0,
        venue_views: 0,
        premium_feature_attempts: 0,
        favorites_added: counts.favorites_added,
        directions_requested: 0,
        checkins: counts.checkins,
        total_activity: total,
      };
      const prev = existingByConsumer[uid];
      if (prev) toUpdate.push({ id: prev.id, ...row });
      else toCreate.push(row);
    }

    if (toCreate.length > 0) await base44.asServiceRole.entities.ConsumerEngagementRollup.bulkCreate(toCreate);
    if (toUpdate.length > 0) await base44.asServiceRole.entities.ConsumerEngagementRollup.bulkUpdate(toUpdate);

    return Response.json({
      success: true,
      week_start: weekStartKey,
      rolled_up: consumerIds.length,
      created: toCreate.length,
      updated: toUpdate.length,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}