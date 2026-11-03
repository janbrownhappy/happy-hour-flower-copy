import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

// Maps a required tier to the plans/paywall route that handles its checkout.
const TIER_ROUTE = {
  premium: '/plans/consumer',
  venue_premium: '/plans/venue',
  platinum: '/plans/venue',
};

/**
 * useUpgradePrompt — sends the user straight to the paywall/plans page.
 *
 * The intermediate popup was redundant (the plans page lists the same
 * features), so requireFeature now navigates directly to the right plan.
 *
 * Usage:
 *   const { promptProps, requireFeature } = useUpgradePrompt();
 *
 *   // In JSX (kept as a no-op so existing call sites don't break):
 *   <UpgradePrompt {...promptProps} />
 *
 *   // When user hits gated action:
 *   if (!isPremium) { requireFeature('Advanced Filters', 'premium'); return; }
 */
export function useUpgradePrompt() {
  const navigate = useNavigate();

  const requireFeature = useCallback((feature, requiredTier = 'premium') => {
    navigate(TIER_ROUTE[requiredTier] || TIER_ROUTE.premium);
  }, [navigate]);

  // Popup is disabled — keep promptProps so JSX usages remain harmless.
  return {
    promptProps: { open: false, onClose: () => {}, feature: '', requiredTier: 'premium' },
    requireFeature,
  };
}