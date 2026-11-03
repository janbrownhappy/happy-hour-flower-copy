/**
 * HAPPY HOUR FLOWER — CENTRAL PRICE SOURCE OF TRUTH
 * -------------------------------------------------
 * Every UI surface (plan pages, upgrade prompts, dashboard cards, feature
 * gates) must read prices from here so they can never drift apart.
 *
 * Prices are display strings; the actual amounts charged are controlled by
 * the Stripe Price IDs configured in the backend (createStripeCheckout /
 * createGeofenceAddonCheckout). Keep the two in sync when prices change.
 */

// ── Consumer (Explorer) ──
export const CONSUMER_PREMIUM = {
  monthly: { price: 4.95, display: '$4.95/mo' },
  annual: { price: 49.5, display: '$49.50/yr' },
};

// ── Venue ──
export const VENUE_PREMIUM = {
  monthly: { price: 49.95, display: '$49.95/mo' },
  annual: { price: 499.95, display: '$499.95/yr' },
};

export const VENUE_PLATINUM = {
  monthly: { price: 99.95, display: '$99.95/mo' },
  annual: { price: 999.95, display: '$999.95/yr' },
};

export const VENUE_PLATINUM_PLUS = {
  monthly: { price: 199.95, display: '$199.95/mo' },
  annual: { price: 1999.5, display: '$1,999.50/yr' },
  setupFee: { price: 249.9, display: '$249.90' },
};

// ── Beacon & Geofencing add-on (Platinum only) ──
export const GEOFENCE_ADDON = {
  monthly: { price: 99.95, display: '$99.95/mo' },
  annual: { price: 999.95, display: '$999.95/yr' },
  setupFee: { price: 249.9, display: '$249.90' },
};

// Annual savings badge helper (e.g. "Save ~17%").
export function annualSavingsPct({ monthly, annual }) {
  const yearlyIfMonthly = monthly.price * 12;
  if (!yearlyIfMonthly) return 0;
  return Math.round(((yearlyIfMonthly - annual.price) / yearlyIfMonthly) * 100);
}