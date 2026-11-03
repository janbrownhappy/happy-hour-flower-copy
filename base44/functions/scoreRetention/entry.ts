import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { DAY_MS } from '../../shared/churnScoring.ts';
import { requireAutomationCaller } from '../../shared/automationAuth.ts';
import { scoreAndPersistAccount, buildRulesByKey } from '../../shared/churnPersist.ts';

// Chunked, resumable retention-scoring engine. Processes ~CHUNK accounts per run using a
// cursor stored in AppSetting so the full population (venues + consumers) cycles roughly
// every 24h without exceeding Base44's 5-min function / 3-min workflow limits.
//
// Cursor format in AppSetting key "retention_scoring_cursor" value_string:
//   JSON { phase: "venue"|"consumer", offset: number, weekly_snapshot: bool }
// When both phases complete, the cursor resets and weekly_snapshot toggles roughly weekly.

const CHUNK = 500;
const CURSOR_KEY = 'retention_scoring_cursor';
const LASTRUN_KEY = 'retention_scoring_lastrun';

async function getCursor(base44) {
  const rows = await base44.asServiceRole.entities.AppSetting.filter({ key: CURSOR_KEY }).catch(() => []);
  const row = rows[0];
  let parsed = { phase: 'venue', offset: 0, weekly_snapshot: false, cycle_started_at: new Date().toISOString() };
  if (row?.value_string) {
    try { parsed = { ...parsed, ...JSON.parse(row.value_string) }; } catch { /* keep defaults */ }
  }
  return { row, parsed };
}

async function saveCursor(base44, row, next) {
  const value_string = JSON.stringify(next);
  if (row) await base44.asServiceRole.entities.AppSetting.update(row.id, { value_string });
  else await base44.asServiceRole.entities.AppSetting.create({ key: CURSOR_KEY, value_string });
}

async function recordLastRun(base44, summary) {
  const rows = await base44.asServiceRole.entities.AppSetting.filter({ key: LASTRUN_KEY }).catch(() => []);
  const value_string = JSON.stringify({ ...summary, at: new Date().toISOString() });
  if (rows[0]) await base44.asServiceRole.entities.AppSetting.update(rows[0].id, { value_string });
  else await base44.asServiceRole.entities.AppSetting.create({ key: LASTRUN_KEY, value_string });
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const denied = await requireAutomationCaller(base44, req);
    if (denied) return denied;

    const rules = await base44.asServiceRole.entities.ChurnScoringRule.list('', 500).catch(() => []);
    const venueRules = buildRulesByKey(rules, 'venue');
    const consumerRules = buildRulesByKey(rules, 'consumer');

    const { row: cursorRow, parsed: cursor } = await getCursor(base44);
    const now = Date.now();

    let processed = 0;
    let phase = cursor.phase;
    let offset = cursor.offset;
    const forceWeekly = !!cursor.weekly_snapshot;

    if (phase === 'venue') {
      const venues = await base44.asServiceRole.entities.Venue.filter(
        { status: 'active' }, '-created_date', CHUNK, offset
      ).catch(() => []);

      for (const v of venues) {
        // Gather context for this venue.
        const [offerStats, listings, checkins, favorites, reviews, ownerSessions, existing] = await Promise.all([
          base44.asServiceRole.entities.OfferStat.filter({ venue_id: v.id }, '-last_activity_at', 50).catch(() => []),
          base44.asServiceRole.entities.Listing.filter({ venue_ref_id: v.id }, '-created_date', 50).catch(() => []),
          base44.asServiceRole.entities.CheckIn.filter({ venue_id: v.id }, '-created_date', 20).catch(() => []),
          base44.asServiceRole.entities.Favorite.filter({ venue_id: v.id }, '-created_date', 20).catch(() => []),
          base44.asServiceRole.entities.Review.filter({ venue_id: v.id }, '-created_date', 20).catch(() => []),
          v.owner_id ? base44.asServiceRole.entities.AppSession.filter({ user_id: v.owner_id }, '-started_at', 1).catch(() => []) : Promise.resolve([]),
          base44.asServiceRole.entities.RetentionProfile.filter({ account_ref_id: v.id }, '-created_date', 1).catch(() => []),
        ]);

        const maxTime = (arr, field) => arr.reduce((m, r) => {
          const t = new Date(r[field] || r.created_date || 0).getTime();
          return isNaN(t) ? m : Math.max(m, t);
        }, null);

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

        const lastActivityIso = lastTrafficAt || lastOfferActivityAt
          ? new Date(Math.max(lastTrafficAt || 0, lastOfferActivityAt || 0)).toISOString() : null;

        await scoreAndPersistAccount(base44, {
          entityType: 'venue',
          source: v,
          rulesByKey: venueRules,
          ctx: { lastOfferActivityAt, lastTrafficAt, ownerLastActiveAt, hasStaleListings, ownerEmail, lastActivityIso, lastActiveAt: ownerLastActiveAt },
          existingProfile: existing[0] || null,
          forceWeekly,
        });
        processed++;
      }

      if (venues.length < CHUNK) {
        phase = 'consumer';
        offset = 0;
      } else {
        offset += venues.length;
      }
    } else {
      // Consumer phase.
      const profiles = await base44.asServiceRole.entities.Profile.filter(
        {}, '-created_date', CHUNK, offset
      ).catch(() => []);

      for (const p of profiles) {
        const consumerId = p.created_by_id;
        const [sessions, favorites, rollups, existing] = await Promise.all([
          consumerId ? base44.asServiceRole.entities.AppSession.filter({ user_id: consumerId }, '-started_at', 1).catch(() => []) : Promise.resolve([]),
          consumerId ? base44.asServiceRole.entities.Favorite.filter({ created_by_id: consumerId }, '-created_date', 1).catch(() => []) : Promise.resolve([]),
          consumerId ? base44.asServiceRole.entities.ConsumerEngagementRollup.filter({ consumer_id: consumerId }, '-week_start', 6).catch(() => []) : Promise.resolve([]),
          base44.asServiceRole.entities.RetentionProfile.filter({ account_ref_id: p.id }, '-created_date', 1).catch(() => []),
        ]);

        const lastActiveAt = sessions[0] ? new Date(sessions[0].started_at).getTime() : null;
        const favoriteCount = favorites.length;
        // Source shape the evaluator expects.
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

        await scoreAndPersistAccount(base44, {
          entityType: 'consumer',
          source,
          rulesByKey: consumerRules,
          ctx: { lastActiveAt, favoriteCount, rollups, lastActivityIso: lastActiveAt ? new Date(lastActiveAt).toISOString() : null },
          existingProfile: existing[0] || null,
          forceWeekly,
        });
        processed++;
      }

      if (profiles.length < CHUNK) {
        // Full cycle complete — reset. Toggle weekly snapshot ~once/week.
        const cycleStart = new Date(cursor.cycle_started_at || now).getTime();
        const weeklyDue = (now - cycleStart) >= 7 * DAY_MS;
        await saveCursor(base44, cursorRow, {
          phase: 'venue', offset: 0,
          weekly_snapshot: weeklyDue ? true : false,
          cycle_started_at: new Date().toISOString(),
        });
        await recordLastRun(base44, { processed, phase, completed_cycle: true });
        return Response.json({ success: true, processed, phase, completed_cycle: true });
      }
      offset += profiles.length;
    }

    await saveCursor(base44, cursorRow, { ...cursor, phase, offset });
    await recordLastRun(base44, { processed, phase, completed_cycle: false });
    return Response.json({ success: true, processed, phase, offset });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}