/**
 * HAPPY HOUR FLOWER — ENTITLEMENT ENFORCEMENT
 *
 * Central source of truth for the *numeric limits* each tier enforces.
 * featureTiers.js answers "does this tier have feature X?" (boolean);
 * this module answers "how many is this tier allowed?" and clamps data
 * to those limits before it is saved.
 *
 * Keeping enforcement here means the dashboard, the setup wizard, and the
 * favoriting flow all apply identical rules.
 */
import { venueHasFeature, consumerHasFeature } from '@/lib/featureTiers';

const norm = (t) => (t || 'free').toLowerCase();

/* ───────────────── VENUE LIMITS ───────────────── */

// Max photos a venue may have on its listing.
export function maxVenuePhotos(tier) {
  return venueHasFeature(norm(tier), 'unlimited-photos') ? Infinity : 1;
}

// Max specials/deals a venue may list per day.
export function maxSpecialsPerDay(tier) {
  return venueHasFeature(norm(tier), 'unlimited-specials') ? Infinity : 1;
}

// Max characters allowed in a venue's public description.
// Free = 200 (short blurb), Premium/Platinum = 1,000 (extended description).
export function maxDescriptionLength(tier) {
  return venueHasFeature(norm(tier), 'enhanced-venue-profile') ? 1000 : 200;
}

/**
 * Monthly promotional push/SMS credits included with the venue's plan.
 * Free venues cannot message fans at all; Premium includes 10/mo and
 * Platinum gets a higher allowance.
 */
export const LEGACY_MESSAGE_LIMIT = 20; // pre-tier default, treated as "unset"
export function monthlyMessageCredits(tier) {
  const t = norm(tier);
  if (t === 'platinum') return 30;
  if (t === 'premium') return 10;
  return 0;
}

/**
 * Clamp a venue save payload to the venue's tier limits.
 * Trims photos to the max and caps each day's deals (both deals_by_day and
 * the legacy global deals array). Returns a NEW payload — never mutates input.
 */
export function enforceVenueLimits(tier, payload) {
  const next = { ...payload };
  const photoMax = maxVenuePhotos(tier);
  const dealMax = maxSpecialsPerDay(tier);
  const descMax = maxDescriptionLength(tier);

  if (typeof next.description === 'string' && next.description.length > descMax) {
    next.description = next.description.slice(0, descMax);
  }

  if (Array.isArray(next.photo_urls) && next.photo_urls.length > photoMax) {
    next.photo_urls = next.photo_urls.slice(0, photoMax);
  }

  if (Array.isArray(next.deals) && next.deals.length > dealMax) {
    next.deals = next.deals.slice(0, dealMax);
  }

  if (next.deals_by_day && typeof next.deals_by_day === 'object') {
    const capped = {};
    Object.entries(next.deals_by_day).forEach(([day, dayDeals]) => {
      capped[day] = Array.isArray(dayDeals) ? dayDeals.slice(0, dealMax) : dayDeals;
    });
    next.deals_by_day = capped;
  }

  return next;
}

/* ───────────────── GEOFENCE / BEACON ADD-ON ───────────────── */

/**
 * Whether a venue may actually use geofencing & beacon proximity features.
 * These are a paid add-on on top of Platinum: the venue must be Platinum AND
 * carry an active add-on subscription (geofence_addon_status === 'active').
 */
export function canUseGeofenceAddon(venue) {
  if (!venue) return false;
  return norm(venue.subscription_tier) === 'platinum' && venue.geofence_addon_status === 'active';
}

/* ───────────────── CONSUMER LIMITS ───────────────── */

// Max venues a consumer may save to favorites. Free = 1, Premium = unlimited.
export function maxFavorites(tier) {
  return consumerHasFeature(norm(tier), 'unlimited-saved-favorites') ? Infinity : 1;
}