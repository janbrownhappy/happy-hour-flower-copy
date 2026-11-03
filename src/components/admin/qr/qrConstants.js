export const PLACEMENTS = ['coaster', 'window_cling', 'table_tent', 'magazine', 'hotel', 'visitor_center', 'event', 'poster', 'flyer', 'business_card', 'venue_signage', 'social', 'email', 'ambassador', 'other'];

export const DESTINATIONS = [
  { value: 'venue', label: 'Venue' },
  { value: 'special', label: 'Special' },
  { value: 'event', label: 'Event' },
  { value: 'consumer_premium', label: 'Consumer Premium' },
  { value: 'venue_premium', label: 'Venue Premium' },
  { value: 'signup', label: 'Signup' },
  { value: 'onboarding', label: 'Onboarding' },
  { value: 'url', label: 'Approved URL (same-site path)' },
];

export const labelize = (s) => String(s || '').replace(/_/g, ' ');
export const pct = (n, d) => (d ? `${((n / d) * 100).toFixed(1)}%` : '—');