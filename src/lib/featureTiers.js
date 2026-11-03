/**
 * HAPPY HOUR FLOWER — FEATURE TIER DEFINITIONS
 * Source of truth for what each subscription tier can access.
 * Use these constants to gate features throughout the app.
 */

export const CONSUMER_TIERS = {
  free: {
    label: 'Free',
    features: [
      'browse-venues',
      'view-basic-specials',
      'search-by-location',
      'basic-search',           // one level only
      'view-venue-profiles',
      'basic-map-results',
      'one-saved-favorites-list', // max 1 list
    ],
  },
  premium: {
    label: 'Premium',
    features: [
      // Everything in Free, plus:
      'unlimited-saved-favorites',
      'advanced-filters',
      'near-me-now',
      'ad-free-browsing',
      'premium-only-specials',
      'arrival-alerts',
      'unlimited-deal-tracking',
      'early-access-features',
    ],
  },
};

export const VENUE_TIERS = {
  free: {
    label: 'Free',
    features: [
      'claim-listing',
      'basic-venue-profile',
      'basic-hours-contact',
      'one-photo',              // max 1 photo
      'one-special-per-day',   // max 1 special per day
      'basic-category-tags',
      'appear-in-search-map',
    ],
  },
  premium: {
    label: 'Premium',
    features: [
      // Everything in Free, plus:
      'unlimited-specials',
      'unlimited-photos',
      'enhanced-venue-profile',
      'real-time-updates',
      'recurring-special-scheduling',
      'featured-placement',
      'premium-badge',
      'direct-messaging-lead-capture',
      'analytics-dashboard',
      'weekly-performance-report',
      'push-notification-credits',
      'enhanced-map-pin',
      'custom-tags-amenities',
      'calendar-integration',
      'social-promotion-tools',
      'priority-approval',
      'priority-support',
    ],
  },
  platinum: {
    label: 'Platinum',
    features: [
      // Everything in Premium, plus:
      'top-search-placement',
      'featured-home-screen',
      'priority-map-visibility',
      'sponsored-special-placement',
      'more-push-notification-credits',
      'geo-targeted-promotion',
      'exclusive-offer-campaigns',
      'follower-growth-tools',
      'advanced-analytics',
      'monthly-performance-report',
      'competitive-visibility-report',
      'custom-promotional-campaigns',
      'newsletter-feature-opportunities',
      'social-media-spotlight',
      'qr-code-campaign-support',
      'dedicated-onboarding-assistance',
      'fastest-support-response',
      'multi-location-support',
      'wallet-passes',
    ],
  },
};

/**
 * Helper: check if a venue owner's subscription tier includes a feature.
 * tier: 'free' | 'premium' | 'platinum'
 * feature: one of the feature slugs above
 */
export function venueHasFeature(tier, feature) {
  const t = (tier || 'free').toLowerCase();
  if (t === 'platinum') {
    return (
      VENUE_TIERS.free.features.includes(feature) ||
      VENUE_TIERS.premium.features.includes(feature) ||
      VENUE_TIERS.platinum.features.includes(feature)
    );
  }
  if (t === 'premium') {
    return (
      VENUE_TIERS.free.features.includes(feature) ||
      VENUE_TIERS.premium.features.includes(feature)
    );
  }
  return VENUE_TIERS.free.features.includes(feature);
}

/**
 * Helper: check if a consumer's subscription tier includes a feature.
 * tier: 'free' | 'premium'
 * feature: one of the feature slugs above
 */
export function consumerHasFeature(tier, feature) {
  const t = (tier || 'free').toLowerCase();
  if (t === 'premium') {
    return (
      CONSUMER_TIERS.free.features.includes(feature) ||
      CONSUMER_TIERS.premium.features.includes(feature)
    );
  }
  return CONSUMER_TIERS.free.features.includes(feature);
}