// Shared risk-category presentation helpers for the Retention admin UI.

export const RISK_META = {
  healthy: { label: 'Healthy', badge: 'bg-emerald-50 border-emerald-200 text-emerald-700', dot: '#10b981' },
  watch: { label: 'Watch', badge: 'bg-sky-50 border-sky-200 text-sky-700', dot: '#0ea5e9' },
  at_risk: { label: 'At Risk', badge: 'bg-amber-50 border-amber-200 text-amber-700', dot: '#f59e0b' },
  high_risk: { label: 'High Risk', badge: 'bg-orange-50 border-orange-200 text-orange-700', dot: '#f97316' },
  critical: { label: 'Critical', badge: 'bg-red-50 border-red-200 text-red-700', dot: '#ef4444' },
};

export const LIFECYCLE_META = {
  active: { label: 'Active', color: 'text-emerald-600' },
  cooling: { label: 'Cooling', color: 'text-sky-600' },
  dormant: { label: 'Dormant', color: 'text-amber-600' },
  churned: { label: 'Churned', color: 'text-red-600' },
  reactivated: { label: 'Reactivated', color: 'text-violet-600' },
};

export const RISK_ORDER = ['critical', 'high_risk', 'at_risk', 'watch', 'healthy'];

export function riskMeta(cat) {
  return RISK_META[cat] || RISK_META.healthy;
}

export function money(n) {
  const v = Number(n) || 0;
  return `$${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}