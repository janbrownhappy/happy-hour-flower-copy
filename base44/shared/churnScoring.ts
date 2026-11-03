// Shared churn/retention scoring logic — imported by scoreRetention, seedChurnRules,
// recalcRetentionAccount and the payment-failure hook. Keep all scoring math here so
// there is a single source of truth for rules, thresholds, and lifecycle bands.

export const DAY_MS = 24 * 60 * 60 * 1000;

// Risk-category thresholds evaluated against the 0-100 churn score (inclusive lower bound).
// A higher score means MORE likely to churn.
export const RISK_THRESHOLDS = [
  { category: 'critical', min: 80 },
  { category: 'high_risk', min: 60 },
  { category: 'at_risk', min: 40 },
  { category: 'watch', min: 20 },
  { category: 'healthy', min: 0 },
];

export function riskCategoryForScore(score) {
  const s = Math.max(0, Math.min(100, Number(score) || 0));
  for (const t of RISK_THRESHOLDS) {
    if (s >= t.min) return t.category;
  }
  return 'healthy';
}

export const RISK_LABELS = {
  healthy: 'Healthy',
  watch: 'Watch',
  at_risk: 'At Risk',
  high_risk: 'High Risk',
  critical: 'Critical',
};

// Risk bands that should trigger prevention outreach.
export const OUTREACH_RISK_CATEGORIES = ['at_risk', 'high_risk', 'critical'];

// Default seeded scoring rules. `rule_key` must match the keys the engine evaluates below.
export const DEFAULT_RULES = [
  // Paid signals (both venue + consumer where relevant)
  { rule_key: 'payment_failed', label: 'Payment failed (past due)', description: 'Billing status is past_due', applies_to: 'both', points: 30, severity: 'critical', sort_order: 1 },
  { rule_key: 'subscription_expiring_soon', label: 'Subscription expiring within 14 days', description: 'Paid subscription expires in the next 14 days', applies_to: 'both', points: 15, severity: 'high', sort_order: 2 },
  { rule_key: 'subscription_lapsed', label: 'Subscription lapsed', description: 'Paid subscription expiry date has passed', applies_to: 'both', points: 25, severity: 'critical', sort_order: 3 },
  // Consumer engagement signals
  { rule_key: 'no_login_14d', label: 'No app open in 14 days', description: 'Consumer has not opened the app in 14+ days', applies_to: 'consumer', points: 20, severity: 'high', sort_order: 10 },
  { rule_key: 'no_login_30d', label: 'No app open in 30 days', description: 'Consumer has not opened the app in 30+ days', applies_to: 'consumer', points: 30, severity: 'critical', sort_order: 11 },
  { rule_key: 'engagement_decline', label: 'Engagement declining', description: 'Last 7 days activity is well below the prior 28-day weekly average', applies_to: 'consumer', points: 20, severity: 'high', sort_order: 12 },
  { rule_key: 'never_favorited', label: 'Never favorited a venue', description: 'Consumer has no favorites — low investment', applies_to: 'consumer', points: 10, severity: 'medium', sort_order: 13 },
  { rule_key: 'push_disabled', label: 'Push notifications disabled', description: 'Consumer turned off push notifications', applies_to: 'consumer', points: 8, severity: 'medium', sort_order: 14 },
  // Venue engagement / health signals
  { rule_key: 'low_health_score', label: 'Low listing health score', description: 'Venue profile completeness below 60', applies_to: 'venue', points: 20, severity: 'high', sort_order: 20 },
  { rule_key: 'owner_no_login_14d', label: 'Owner no dashboard login in 14 days', description: 'Venue owner has not opened the app in 14+ days', applies_to: 'venue', points: 15, severity: 'high', sort_order: 21 },
  { rule_key: 'no_offer_activity_30d', label: 'No offer activity in 30 days', description: 'No views or redeem clicks on venue offers in 30+ days', applies_to: 'venue', points: 18, severity: 'high', sort_order: 22 },
  { rule_key: 'stale_listings', label: 'Deals gone stale', description: 'All deals expired or none present', applies_to: 'venue', points: 12, severity: 'medium', sort_order: 23 },
  { rule_key: 'no_traffic_30d', label: 'No foot traffic in 30 days', description: 'No check-ins, reviews, or favorites in 30+ days', applies_to: 'venue', points: 15, severity: 'high', sort_order: 24 },
];

// Free-consumer lifecycle bands, computed from days since last app activity.
export function lifecycleForDays(daysSinceActivity) {
  if (daysSinceActivity == null) return 'dormant';
  if (daysSinceActivity <= 7) return 'active';
  if (daysSinceActivity <= 14) return 'cooling';
  if (daysSinceActivity <= 30) return 'dormant';
  return 'churned';
}

// Premium conversion likelihood (0-100) for FREE consumers — high recent engagement
// + premium-feature attempts signal intent to convert.
export function conversionScore(rollups) {
  if (!rollups || rollups.length === 0) return 0;
  const recent = rollups.slice(0, 4); // last 4 weeks
  const attempts = recent.reduce((a, r) => a + (r.premium_feature_attempts || 0), 0);
  const opens = recent.reduce((a, r) => a + (r.app_opens || 0), 0);
  const favorites = recent.reduce((a, r) => a + (r.favorites_added || 0), 0);
  let score = 0;
  score += Math.min(40, attempts * 10);      // premium-feature attempts are the strongest intent
  score += Math.min(30, opens * 2);          // frequent opens
  score += Math.min(20, favorites * 4);      // building a favorites list
  score += recent.length >= 3 ? 10 : 0;      // sustained presence
  return Math.max(0, Math.min(100, Math.round(score)));
}

// Compare last-7-days activity vs prior-28-day weekly average to detect decline.
// rollups: newest-first array of ConsumerEngagementRollup rows.
export function isEngagementDeclining(rollups) {
  if (!rollups || rollups.length < 2) return false;
  const lastWeek = rollups[0]?.total_activity || 0;
  const prior = rollups.slice(1, 5); // up to 4 prior weeks
  if (prior.length === 0) return false;
  const priorAvg = prior.reduce((a, r) => a + (r.total_activity || 0), 0) / prior.length;
  if (priorAvg < 2) return false; // not enough baseline to call a decline
  return lastWeek < priorAvg * 0.4; // dropped to under 40% of baseline
}

export function mondayOf(date) {
  const d = new Date(date);
  const day = d.getUTCDay(); // 0=Sun
  const diff = (day === 0 ? -6 : 1) - day; // shift to Monday
  d.setUTCDate(d.getUTCDate() + diff);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

export function isoDate(date) {
  return new Date(date).toISOString().slice(0, 10);
}