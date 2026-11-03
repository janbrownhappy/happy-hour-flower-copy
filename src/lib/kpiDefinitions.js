// Executive KPI catalog. `geo` = available per State/Market/Area; otherwise company-wide only.
// `missing` metrics have no reliable source yet and always render as unavailable.
const NC = 'Data Source Not Connected';
const ID = 'Insufficient Data';

export const KPI_SECTIONS = [
  { id: 'consumers', label: 'Consumer Health' },
  { id: 'engagement', label: 'Engagement' },
  { id: 'venues', label: 'Venue Health' },
  { id: 'revenue', label: 'Revenue & Subscriptions' },
  { id: 'acquisition', label: 'Acquisition & Attribution' },
  { id: 'ambassadors', label: 'Ambassador Program' },
];

export const KPIS = [
  { key: 'consumers_total', label: 'Consumer accounts', section: 'consumers', def: 'Registered users excluding admins and venue owners.' },
  { key: 'profiles_total', label: 'Consumer profiles', section: 'consumers', geo: true, def: 'Profiles; geography uses saved location preference.' },
  { key: 'consumers_paid', label: 'Paid consumers', section: 'consumers', geo: true, def: 'Profiles marked premium or on a paid tier.' },
  { key: 'consumers_free', label: 'Free consumers', section: 'consumers', geo: true },
  { key: 'paid_conversion_pct', label: 'Free → paid conversion', section: 'consumers', geo: true, fmt: 'pct' },
  { key: 'new_profiles_30d', label: 'New profiles (30d)', section: 'consumers', geo: true },
  { key: 'consumer_churn_pct', label: 'Consumer churn', section: 'consumers', missing: ID, def: 'Requires subscription-history snapshots over time.' },
  { key: 'consumer_retention_90d', label: '90-day retention', section: 'consumers', missing: ID, def: 'Requires signup cohorts tracked over 90 days.' },

  { key: 'dau', label: 'Daily active users', section: 'engagement', def: 'Distinct users with an app session in the last 24h.' },
  { key: 'wau', label: 'Weekly active users', section: 'engagement' },
  { key: 'mau', label: 'Monthly active users', section: 'engagement' },
  { key: 'stickiness_pct', label: 'Stickiness (DAU/MAU)', section: 'engagement', fmt: 'pct' },
  { key: 'avg_session_minutes', label: 'Avg session (min)', section: 'engagement' },
  { key: 'favorites_30d', label: 'Favorites (30d)', section: 'engagement' },
  { key: 'checkins_30d', label: 'Check-ins (30d)', section: 'engagement' },
  { key: 'offer_views', label: 'Offer views (all time)', section: 'engagement' },
  { key: 'offer_redeem_clicks', label: 'Redeem clicks (all time)', section: 'engagement' },
  { key: 'special_views', label: 'Special views / saves', section: 'engagement', missing: ID, def: 'Durable per-user event tracking not yet in place.' },
  { key: 'directions_requests', label: 'Directions requests', section: 'engagement', missing: ID },
  { key: 'happy_hour_activity', label: 'Qualified Happy Hour activity', section: 'engagement', missing: ID },

  { key: 'venues_active', label: 'Active venues', section: 'venues', geo: true },
  { key: 'venues_total', label: 'All venues', section: 'venues', geo: true },
  { key: 'venues_paid', label: 'Paid venues', section: 'venues', geo: true },
  { key: 'venues_free', label: 'Free venues', section: 'venues', geo: true },
  { key: 'venues_paid_pct', label: 'Paid venue mix', section: 'venues', geo: true, fmt: 'pct' },
  { key: 'venues_verified', label: 'Owner-verified venues', section: 'venues', geo: true },
  { key: 'venues_contacts_verified', label: 'Contacts verified', section: 'venues', geo: true },
  { key: 'venues_fresh_pct', label: 'Fresh venue coverage', section: 'venues', geo: true, fmt: 'pct', def: 'Provisional: active venues with happy hour, scraped within 30 days.' },
  { key: 'venues_avg_health', label: 'Avg health score', section: 'venues', geo: true },
  { key: 'specials_total', label: 'Specials listed', section: 'venues', geo: true },
  { key: 'venues_new_30d', label: 'New venues (30d)', section: 'venues', geo: true },
  { key: 'venues_unmapped', label: 'Venues without market', section: 'venues' },
  { key: 'venue_churn_pct', label: 'Venue churn', section: 'venues', missing: ID, def: 'Requires subscription-history snapshots over time.' },

  { key: 'mrr_total', label: 'MRR', section: 'revenue', fmt: 'usd' },
  { key: 'mrr_venue', label: 'Venue MRR', section: 'revenue', fmt: 'usd' },
  { key: 'mrr_consumer', label: 'Consumer MRR', section: 'revenue', fmt: 'usd' },
  { key: 'arr_total', label: 'ARR (run-rate)', section: 'revenue', fmt: 'usd' },
  { key: 'active_subscriptions', label: 'Active subscriptions', section: 'revenue' },
  { key: 'venue_subscriptions', label: 'Venue subscriptions', section: 'revenue' },
  { key: 'consumer_subscriptions', label: 'Consumer subscriptions', section: 'revenue' },

  { key: 'attributions_total', label: 'Attributed users', section: 'acquisition' },
  { key: 'attributed_signups', label: 'QR-attributed signups', section: 'acquisition' },
  { key: 'qr_scans_30d', label: 'QR scans (30d)', section: 'acquisition' },
  { key: 'ad_spend', label: 'Paid ad spend', section: 'acquisition', missing: NC, def: 'Meta Ads not connected.' },
  { key: 'cac', label: 'CAC', section: 'acquisition', missing: NC },
  { key: 'roas', label: 'ROAS', section: 'acquisition', missing: NC },

  { key: 'ambassadors_total', label: 'Ambassadors', section: 'ambassadors' },
  { key: 'ambassador_referrals', label: 'Referrals', section: 'ambassadors' },
  { key: 'ambassador_clicks', label: 'Referral clicks', section: 'ambassadors' },
  { key: 'ambassador_earnings', label: 'Commission earned', section: 'ambassadors', fmt: 'usd' },
];

export const DEFAULT_OVERVIEW = ['consumers_total', 'mau', 'consumers_paid', 'venues_active', 'venues_paid', 'venues_fresh_pct', 'mrr_total', 'ambassador_referrals'];

export const kpiByKey = Object.fromEntries(KPIS.map((k) => [k.key, k]));

export function formatKpi(v, fmt) {
  if (v == null || !Number.isFinite(Number(v))) return '—';
  if (fmt === 'pct') return `${v}%`;
  if (fmt === 'usd') return `$${Number(v).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  return Number(v).toLocaleString();
}

export function pctChange(cur, prev) {
  if (cur == null || prev == null || prev === 0) return null;
  return Math.round(((cur - prev) / Math.abs(prev)) * 1000) / 10;
}