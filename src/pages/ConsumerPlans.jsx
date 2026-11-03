import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Crown, Check, ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/AuthContext';
import useEntitlementRefresh from '@/hooks/useEntitlementRefresh';
import { consumerCheckoutUrl, openExternal, CONSUMER_PACKAGES } from '@/lib/revenuecat';
import PurchaseStatus from '@/components/plans/PurchaseStatus';
import ManageSubscriptionLink from '@/components/plans/ManageSubscriptionLink';
import { useSubscription } from '@/lib/SubscriptionContext';
import BillingToggle from '@/components/BillingToggle';
import { CONSUMER_PREMIUM, annualSavingsPct } from '@/lib/pricing';
import { trackEvent, trackOnce } from '@/lib/analytics';
import { creditEvent } from '@/lib/attributionClient';

// Maps a plan card to the subscription_tier value it represents.
const PLAN_TIER_MAP = {
  'consumer-free': 'free',
  'consumer-premium': 'premium',
};

const CONSUMER_PLANS = [
  {
    id: 'consumer-free',
    label: 'Free Tier – Consumer',
    price: 'Free',
    color: 'border-border',
    badge: null,
    features: [
      'Full access to interactive map with all venue locations',
      'Browse complete happy hour listings across Greenville metro',
      'Real-time geolocation and distance calculations',
      'Daily push notifications for nearby happy hours',
      'Create 1 personal must-visit list',
      'Save unlimited favorite venues',
    ],
  },
  {
    id: 'consumer-premium',
    label: 'Premium Tier – Consumer',
    pricing: CONSUMER_PREMIUM,
    color: 'border-amber-500',
    badge: '⭐ Most Popular',
    features: [
      'Everything in Free, plus:',
      'Unlimited personal must-visit lists',
      'ZIP code-specific text alerts',
      'Exclusive premium specials',
      'Direct messaging to businesses',
      'Direct messaging to administrators',
      'Advanced date-range filtering',
      'Fan Favorites access',
      'Enhanced AI recommendations',
      'Early access to new features',
      'Ad-free experience',
      'Premium badge',
      'Add quick notes to saved venues',
      'Calendar sync: Apple, Google, Outlook',
    ],
  },
];

function PlanCard({ plan, onSelect, currentTier, purchasing, billingCycle }) {
  const isFree = !plan.pricing;
  const priceDisplay = isFree ? 'Free' : plan.pricing[billingCycle].display;
  // Active state is driven by the DB tier so exactly one plan is active.
  const isActive = PLAN_TIER_MAP[plan.id] === currentTier;
  const isBuying = purchasing === plan.id;

  return (
    <div className={`relative flex flex-col rounded-2xl border-2 ${plan.color} bg-card p-5 shadow-sm`}>
      {plan.badge && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap bg-amber-500 text-white">
          {plan.badge}
        </span>
      )}

      <div className="mb-3">
        <div className="flex items-center gap-2 mb-1">
          <Crown className="w-4 h-4 text-amber-500" />
          <p className="font-bold text-base">{plan.label}</p>
        </div>
        <p className={`text-2xl font-heading font-bold ${isFree ? 'text-muted-foreground' : 'text-foreground'}`}>
          {priceDisplay}
        </p>
      </div>

      <ul className="space-y-1.5 flex-1 mb-4">
        {plan.features.map((f, i) => (
          <li key={i} className="flex items-start gap-2 text-sm">
            <Check className={`w-4 h-4 flex-shrink-0 mt-0.5 ${isFree ? 'text-muted-foreground' : 'text-amber-500'}`} />
            <span className={isFree ? 'text-muted-foreground' : 'text-foreground'}>{f}</span>
          </li>
        ))}
      </ul>

      <Button
        variant={isFree || isActive ? 'outline' : 'default'}
        className="w-full"
        disabled={isFree || isActive || isBuying}
        onClick={() => onSelect(plan)}
      >
        {isBuying ? (
          <><Loader2 className="w-4 h-4 animate-spin mr-2" />Redirecting...</>
        ) : isFree ? (
          isActive ? 'Current Plan' : 'Free Plan'
        ) : isActive ? (
          '✓ Active Plan'
        ) : (
          `Upgrade to ${plan.label.split(' ')[0]}`
        )}
      </Button>
    </div>
  );
}

export default function ConsumerPlans() {
  const navigate = useNavigate();
  const { tier, refresh: refreshSubscription } = useSubscription();
  const { user } = useAuth();
  const purchasing = null;
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [billingCycle, setBillingCycle] = useState('monthly');
  useEffect(() => { trackOnce('premium_paywall_viewed', 'premium_paywall_viewed', { surface: 'consumer_plans' }); }, []);

  const purchaseSuccess = new URLSearchParams(window.location.search).get('purchase') === 'success';

  const { activating, awaitingReturn, setAwaitingReturn, refresh } = useEntitlementRefresh({
    isUnlocked: (d) => d?.active?.includes('consumer_premium'),
    onResult: (d) => {
      if (d?.active?.includes('consumer_premium')) {
        setSuccessMsg('🎉 Your subscription is active! Premium features are unlocked.');
        if (purchaseSuccess && !sessionStorage.getItem('hhf_rc_sub_tracked')) {
          sessionStorage.setItem('hhf_rc_sub_tracked', '1');
          creditEvent('premium').then((attr) => trackEvent('consumer_subscription_started', {
            plan: 'premium', revenue_type: 'subscription',
            acquisition_source: attr?.acquisition_source, acquisition_campaign: attr?.acquisition_campaign,
            qr_id: attr?.qr_id, ambassador_id: attr?.ambassador_id,
          }));
        }
      }
      refreshSubscription();
    },
  });

  const handleSelect = async (plan) => {
    if (!plan.pricing || !user?.id) return;
    setError(null);
    trackEvent('premium_plan_selected', { plan: plan.id, billing_period: billingCycle });
    trackEvent('checkout_started', { plan: plan.id, billing_period: billingCycle });
    openExternal(consumerCheckoutUrl(user.id, CONSUMER_PACKAGES[billingCycle]));
    setAwaitingReturn(true);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="relative bg-gradient-to-br from-amber-500 to-amber-600 text-white px-4 pt-10 pb-8 text-center">
        <button
          onClick={() => navigate(-1)}
          className="absolute top-4 left-4 p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <Crown className="w-10 h-10 mx-auto mb-3 opacity-90" />
        <h1 className="text-2xl font-heading font-bold mb-1">Explorer Plans</h1>
        <p className="text-white/85 text-sm">Unlock premium features for discovering happy hours</p>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-10">
        <PurchaseStatus activating={activating} awaitingReturn={awaitingReturn} purchaseSuccess={purchaseSuccess} onRefresh={refresh} />
        {successMsg && (
          <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-xl px-4 py-3 text-sm flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            {successMsg}
          </div>
        )}

        {error && (
          <div className="bg-destructive/10 border border-destructive/30 text-destructive rounded-xl px-4 py-3 text-sm">
            {error}
          </div>
        )}

        <div className="flex justify-center">
          <BillingToggle
            value={billingCycle}
            onChange={setBillingCycle}
            savingsPct={annualSavingsPct(CONSUMER_PREMIUM)}
          />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          {CONSUMER_PLANS.map(plan => (
            <PlanCard
              key={plan.id}
              plan={plan}
              onSelect={handleSelect}
              currentTier={tier}
              purchasing={purchasing}
              billingCycle={billingCycle}
            />
          ))}
        </div>

        <ManageSubscriptionLink />
        <p className="text-xs text-center text-muted-foreground pb-6">
          Secure checkout. Cancel anytime. Questions? Contact support@happyhourflower.com
        </p>
      </div>
    </div>
  );
}