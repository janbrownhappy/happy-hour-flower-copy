import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { getClientConfig } from '@/lib/clientConfig';
import { consumerHasFeature, venueHasFeature } from '@/lib/featureTiers';

const SubscriptionContext = createContext(null);

// Database-first subscription state.
//
// The UI NEVER talks to a payment SDK directly. The single source of truth is
// the user's Profile entity, which is kept current by the backend:
//   - verifyStripeCheckout  (web / Stripe purchases)
//
// This makes the provider fast and crash-proof: a payment SDK failure can never
// blank the screen, because the UI only ever does a simple DB read.

export function SubscriptionProvider({ children, user }) {
  const [tier, setTier] = useState('free');           // 'free' | 'premium' | 'platinum'
  const [userType, setUserType] = useState('consumer'); // 'consumer' | 'venue_owner'
  const [loading, setLoading] = useState(true);
  // Set of consumer feature keys that an admin has globally DISABLED.
  // A feature in this set is treated as unavailable for everyone, even premium users.
  const [disabledFeatures, setDisabledFeatures] = useState(() => new Set());
  // Per-venue feature overrides for the current venue owner, keyed by feature_key
  // -> boolean. An entry forces that feature ON/OFF regardless of the tier baseline.
  const [venueOverrides, setVenueOverrides] = useState(() => ({}));

  // Load the admin-controlled feature flags once. Missing/erroring = everything enabled.
  useEffect(() => {
    getClientConfig()
      .then((cfg) => setDisabledFeatures(new Set(cfg.disabled_features || [])))
      .catch(() => setDisabledFeatures(new Set()));
  }, []);

  const loadSubscription = useCallback(async () => {
    if (!user) {
      setTier('free');
      setLoading(false);
      return;
    }

    const resolvedUserType = user.role === 'venue_owner' ? 'venue_owner' : 'consumer';
    setUserType(resolvedUserType);

    // Read tier straight from the Profile entity. Match by Base44 user id first
    // (the reliable key); fall back to email only if needed.
    let dbTier = 'free';
    try {
      let profiles = await base44.entities.Profile.filter({ created_by_id: user.id });
      if (profiles.length === 0) {
        profiles = await base44.entities.Profile.filter({ email: user.email });
      }
      if (profiles.length > 0 && profiles[0].subscription_tier) {
        dbTier = profiles[0].subscription_tier.toLowerCase();
      }
    } catch (_) {
      // On any read error, default to free — never block the UI.
    }
    setTier(dbTier);

    // For venue owners, load any per-venue feature overrides (baseline exceptions).
    // An admin can force a specific feature ON or OFF for an individual venue.
    if (resolvedUserType === 'venue_owner') {
      try {
        const cfg = await getClientConfig();
        if (cfg.venue_overrides) {
          setVenueOverrides(cfg.venue_overrides);
        } else {
          setVenueOverrides({});
        }
      } catch (_) {
        setVenueOverrides({});
      }
    } else {
      setVenueOverrides({});
    }

    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadSubscription();
  }, [loadSubscription]);

  const isPremium = tier === 'premium' || tier === 'platinum';
  const isPlatinum = tier === 'platinum';

  const hasFeature = useCallback((feature) => {
    if (userType === 'venue_owner') {
      // A per-venue override (if present) wins over everything else.
      if (Object.prototype.hasOwnProperty.call(venueOverrides, feature)) {
        return venueOverrides[feature];
      }
      // A globally admin-disabled feature is unavailable to all venues.
      if (disabledFeatures.has(feature)) return false;
      return venueHasFeature(tier, feature);
    }
    // Admin-disabled consumer features are unavailable to everyone.
    if (disabledFeatures.has(feature)) return false;
    return consumerHasFeature(tier, feature);
  }, [tier, userType, disabledFeatures, venueOverrides]);

  const value = {
    tier,
    userType,
    isPremium,
    isPlatinum,
    loading,
    hasFeature,
    // refresh() now just re-reads the DB — used after returning from checkout.
    refresh: loadSubscription,
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const ctx = useContext(SubscriptionContext);
  // Safe defaults when used outside SubscriptionProvider (e.g. unauthenticated pages)
  if (!ctx) return {
    tier: 'free',
    userType: 'consumer',
    isPremium: false,
    isPlatinum: false,
    loading: false,
    hasFeature: () => false,
    refresh: () => {},
  };
  return ctx;
}