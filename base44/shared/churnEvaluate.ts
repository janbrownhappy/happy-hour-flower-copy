// Per-account signal evaluation + score persistence. Imported by scoreRetention (chunked
// engine) and recalcRetentionAccount (single-account manual recalc) so both compute
// identical scores and write identical RetentionProfile / ChurnSignal / ChurnScoreHistory rows.

import {
  DAY_MS,
  riskCategoryForScore,
  RISK_LABELS,
  lifecycleForDays,
  conversionScore,
  isEngagementDeclining,
} from './churnScoring.ts';

const SIGNIFICANT_MOVE = 15; // score delta that forces a history row

// Estimate a monthly $ figure for a paid account. Uses known list prices; falls back to 0.
function estimateMrr(entityType, tier) {
  if (!tier || tier === 'free') return 0;
  if (entityType === 'consumer') return tier === 'premium' ? 4.99 : 0;
  if (entityType === 'venue') {
    if (tier === 'premium') return 29.99;
    if (tier === 'platinum') return 99.99;
  }
  return 0;
}

// Evaluate all active rules for a single VENUE and return fired signals.
function evaluateVenue(venue, rulesByKey, ctx) {
  const now = Date.now();
  const fired = [];
  const fire = (key, extra = {}) => {
    const rule = rulesByKey[key];
    if (!rule || !rule.is_active) return;
    fired.push({ rule_key: key, label: rule.label, points: rule.points, severity: rule.severity, ...extra });
  };

  if (venue.billing_status === 'past_due') fire('payment_failed');

  if (venue.subscription_expires_at) {
    const exp = new Date(venue.subscription_expires_at).getTime();
    if (!isNaN(exp)) {
      if (exp < now) fire('subscription_lapsed');
      else if (exp - now < 14 * DAY_MS) fire('subscription_expiring_soon');
    }
  }

  if (typeof venue.health_score === 'number' && venue.health_score < 60) fire('low_health_score');

  if (ctx.ownerLastActiveAt != null) {
    const days = (now - ctx.ownerLastActiveAt) / DAY_MS;
    if (days >= 14) fire('owner_no_login_14d');
  }

  if (ctx.lastOfferActivityAt == null || (now - ctx.lastOfferActivityAt) >= 30 * DAY_MS) {
    fire('no_offer_activity_30d');
  }

  if (ctx.hasStaleListings) fire('stale_listings');

  if (ctx.lastTrafficAt == null || (now - ctx.lastTrafficAt) >= 30 * DAY_MS) {
    fire('no_traffic_30d');
  }

  return fired;
}

// Evaluate all active rules for a single CONSUMER and return fired signals.
function evaluateConsumer(profile, rulesByKey, ctx) {
  const now = Date.now();
  const fired = [];
  const fire = (key, extra = {}) => {
    const rule = rulesByKey[key];
    if (!rule || !rule.is_active) return;
    fired.push({ rule_key: key, label: rule.label, points: rule.points, severity: rule.severity, ...extra });
  };

  if (profile.billing_status === 'past_due') fire('payment_failed');

  if (profile.subscription_expires_at) {
    const exp = new Date(profile.subscription_expires_at).getTime();
    if (!isNaN(exp)) {
      if (exp < now) fire('subscription_lapsed');
      else if (exp - now < 14 * DAY_MS) fire('subscription_expiring_soon');
    }
  }

  if (ctx.lastActiveAt == null) {
    fire('no_login_30d');
  } else {
    const days = (now - ctx.lastActiveAt) / DAY_MS;
    if (days >= 30) fire('no_login_30d');
    else if (days >= 14) fire('no_login_14d');
  }

  if (isEngagementDeclining(ctx.rollups)) fire('engagement_decline');
  if ((ctx.favoriteCount || 0) === 0) fire('never_favorited');
  if (profile.notif_push === false) fire('push_disabled');

  return fired;
}

// Build the derived RetentionProfile fields from fired signals + context.
export function buildScore({ entityType, source, fired, ctx }) {
  const rawScore = fired.reduce((a, s) => a + (s.points || 0), 0);
  const churnScore = Math.max(0, Math.min(100, Math.round(rawScore)));
  const riskCategory = riskCategoryForScore(churnScore);

  // Primary reason = highest-weighted fired signal.
  const top = [...fired].sort((a, b) => (b.points || 0) - (a.points || 0))[0];
  const primaryReason = top ? top.label : RISK_LABELS[riskCategory];

  const tier = source.subscription_tier || 'free';
  const isPaid = !!tier && tier !== 'free';
  const mrr = estimateMrr(entityType, tier);
  const revenueAtRisk = Math.round(mrr * (churnScore / 100) * 100) / 100;

  let lifecycleStatus = null;
  let convScore = null;
  if (entityType === 'consumer' && !isPaid) {
    const days = ctx.lastActiveAt == null ? null : (Date.now() - ctx.lastActiveAt) / DAY_MS;
    lifecycleStatus = lifecycleForDays(days);
    convScore = conversionScore(ctx.rollups);
  }

  return { churnScore, riskCategory, primaryReason, isPaid, mrr, revenueAtRisk, lifecycleStatus, convScore, tier };
}

// Decide whether a ChurnScoreHistory row should be written this run.
export function shouldRecordHistory(prevProfile, newScore, newCategory, forceWeekly) {
  if (!prevProfile) return { record: true, reason: 'category_change' };
  const prevCat = prevProfile.risk_category || 'healthy';
  const prevScore = prevProfile.churn_score || 0;
  if (prevCat !== newCategory) return { record: true, reason: 'category_change' };
  if (Math.abs(newScore - prevScore) >= SIGNIFICANT_MOVE) return { record: true, reason: 'significant_move' };
  if (forceWeekly) return { record: true, reason: 'weekly_snapshot' };
  return { record: false };
}

export { evaluateVenue, evaluateConsumer, estimateMrr };