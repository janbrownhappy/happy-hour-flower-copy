export const DAYS = [
  { key: 'Mon', slug: 'monday', name: 'Monday' },
  { key: 'Tue', slug: 'tuesday', name: 'Tuesday' },
  { key: 'Wed', slug: 'wednesday', name: 'Wednesday' },
  { key: 'Thu', slug: 'thursday', name: 'Thursday' },
  { key: 'Fri', slug: 'friday', name: 'Friday' },
  { key: 'Sat', slug: 'saturday', name: 'Saturday' },
  { key: 'Sun', slug: 'sunday', name: 'Sunday' },
];

// Markets whose SEO pages are on until an admin sets the toggle explicitly.
const DEFAULT_SEO_MARKET_IDS = ['sc_greenville_upstate'];
export const isSeoEnabled = (m) => m.seo_pages_enabled ?? DEFAULT_SEO_MARKET_IDS.includes(m.market_id);

export const slugify = (s = '') => s.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
export const marketSlug = (marketId) => marketId.replace(/_/g, '-');
export const marketIdFromSlug = (slug) => slug.replace(/-/g, '_');
export const findDay = (slug) => DAYS.find(d => d.slug === slug);
export const siteUrl = (path) => `https://happyhourflower.com${path}`;