// Display reference for the risk-category thresholds — mirrors RISK_THRESHOLDS in
// base44/shared/churnScoring.ts. Kept as a small standalone module for the settings UI.
export const RISK_THRESHOLDS_INFO = [
  { category: 'healthy', label: 'Healthy', range: '0–19', badge: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
  { category: 'watch', label: 'Watch', range: '20–39', badge: 'bg-sky-50 border-sky-200 text-sky-700' },
  { category: 'at_risk', label: 'At Risk', range: '40–59', badge: 'bg-amber-50 border-amber-200 text-amber-700' },
  { category: 'high_risk', label: 'High Risk', range: '60–79', badge: 'bg-orange-50 border-orange-200 text-orange-700' },
  { category: 'critical', label: 'Critical', range: '80–100', badge: 'bg-red-50 border-red-200 text-red-700' },
];