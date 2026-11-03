import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Crown, Check, ArrowLeft, Zap, Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import useEntitlementRefresh from '@/hooks/useEntitlementRefresh';
import { venueCheckoutUrl, openExternal, VENUE_PACKAGES } from '@/lib/revenuecat';
import UpgradeReviewDialog from '@/components/plans/UpgradeReviewDialog';
import PurchaseStatus from '@/components/plans/PurchaseStatus';
import ManageSubscriptionLink from '@/components/plans/ManageSubscriptionLink';
import { base44 } from '@/api/base44Client';
import BillingToggle from '@/components/BillingToggle';
import { VENUE_PREMIUM, VENUE_PLATINUM, VENUE_PLATINUM_PLUS, annualSavingsPct } from '@/lib/pricing';

// Platinum Plus = Platinum tier with the beacon & geofencing suite active.
const effectiveTier = (v) =>
  v?.subscription_tier === 'platinum' && v?.geofence_addon_status === 'active' ? 'platinum_plus' : (v?.subscription_tier || 'free');
import { trackEvent, trackEventOnce } from '@/lib/rybbit';

// Maps a plan card to the venue.subscription_tier value it represents.
const PLAN_TIER_MAP = {
  'venue-free': 'free',
  'venue-premium': 'premium',
  'venue-platinum': 'platinum',
  'venue-platinum-plus': 'platinum_plus',
};

const VENUE_PLANS = [
  {
    id: 'venue-free',
    label: 'Venue Free',
    price: 'Free',
    color: 'border-border',
    badge: null,
    features: [
      'Claim your listing',
      'Basic venue profile',
      'Basic hours & contact info',
      '1 photo',
      '1 special per day',
      'Basic category tags',
      'Appear in search & map',
    ],
  },
  {
    id: 'venue-premium',
    label: 'Venue Premium',
    pricing: VENUE_PREMIUM,
    color: 'border-amber-500',
    badge: '⭐ Best Value',
    features: [
      'Everything in Free, plus…',
      { title: 'Unlimited Active Happy Hour Listings', desc: 'Post as many happy hour specials as you want — no caps, no waiting.' },
      { title: 'Unlimited Photo Uploads', desc: 'Upload unlimited photos per listing. Free tier is capped at 2 photos.' },
      { title: 'Extended Descriptions (1,000 chars)', desc: 'Tell your full story with rich 1,000-character listing descriptions. Free tier is 200 chars.' },
      { title: 'Real-Time Listing Updates', desc: 'Edit and update your specials instantly — changes go live without admin re-review.' },
      { title: 'Advanced Recurring Event Scheduling', desc: 'Set up complex recurring schedules — weekly, biweekly, or your own patterns up to 90 days out.' },
      { title: 'Featured Placement in Search', desc: 'Your venue appears at the top of search results and the Home feed under "Featured."' },
      { title: 'Exclusive Specials for Premium Users', desc: 'Tag deals as "Premium Exclusive" — only visible to premium consumers, driving more upgrades.' },
      { title: 'Direct Messaging with Customers', desc: 'Reply to customer questions and build relationships directly through the app.' },
      { title: 'Comprehensive Analytics Dashboard', desc: 'See click-throughs, saves, profile views, and peak engagement times broken down by day.' },
      { title: 'Weekly Performance Reports', desc: "Automated weekly email summaries of your venue's reach, clicks, and trending specials." },
      { title: 'Enhanced Map Presence', desc: 'Your pin stands out on the map with premium gold styling and an animated badge.' },
      { title: 'Promotional Push Notification Credits', desc: 'Send 10 targeted push alerts per month to nearby users when your happy hour starts.' },
      { title: 'Priority Listing Approval (2-hour review)', desc: 'New and edited listings skip the queue and are reviewed within 2 hours.' },
      { title: 'Your Own Tags and Categories', desc: 'Create your own tags and categories to precisely describe your venue and specials.' },
      { title: 'Event Calendar Integration', desc: 'Sync your specials and events directly to the in-app Community Calendar.' },
      { title: 'Competitor Insights', desc: 'See anonymized data on what specials are trending in your area and when competitors run deals.' },
      { title: 'Premium Business Badge', desc: 'Stand out with a verified gold badge on your listing — builds trust and drives more clicks.' },
      { title: 'Priority Support (4-hour response)', desc: 'Skip the queue — get answers from our business support team within 4 hours.' },
      { title: 'Social Media Sharing Tools', desc: 'One-tap sharing to Instagram, Facebook, and X with auto-generated branded graphics.' },
    ],
  },
  {
    id: 'venue-platinum',
    label: 'Venue Platinum',
    pricing: VENUE_PLATINUM,
    color: 'border-slate-700',
    badge: '🥇 Maximum Visibility',
    features: [
      'Everything in Premium, plus…',
      { title: 'Apple Wallet / Google Wallet pass support', desc: "Give guests a branded pass they can save directly to their phone's native wallet app. No app download required — your venue lives in their pocket alongside their boarding passes and loyalty cards." },
      { title: 'Digital coupon passes for happy hour offers', desc: 'Deliver happy hour deals as scannable digital passes that guests save to their wallet. Redemption is fast, trackable, and eliminates the need for paper coupons or promo codes.' },
      { title: 'Buy-one-get-one wallet passes', desc: 'Issue BOGO offers as wallet passes guests can pull up at the bar in seconds. Staff verify and redeem with a simple scan, keeping lines moving and the experience frictionless.' },
      { title: 'Limited-time wallet pass offers', desc: 'Create passes with built-in expiration dates to drive urgency around time-sensitive promotions. The pass updates automatically when the offer expires, so guests always see current status.' },
      { title: 'One-time-use wallet pass coupons', desc: 'Issue passes that deactivate after a single redemption, preventing sharing or reuse. Each coupon is unique, giving you clean data on who redeemed and when.' },
      { title: 'Pass redemption tracking', desc: 'See exactly how many passes were scanned, when, and by which campaign. Redemption data flows into your reporting dashboard so you can measure offer performance without guesswork.' },
      { title: 'Ability to update wallet passes after they are saved', desc: 'Edit the content of a pass — offer details, expiration, location info — after guests have already saved it. Updates push automatically to every saved copy without requiring guests to re-download.' },
      { title: 'Push updates to saved wallet passes', desc: "Send a notification directly to guests who have your pass saved, prompting them to check an updated offer or reminder. It's a direct channel to engaged guests who have already opted in." },
      { title: 'Venue follower offer broadcasts', desc: 'Send instant offer alerts to every user who has followed or favorited your venue in the app. This is your highest-intent audience — people who chose to stay connected to you.' },
      { title: 'Higher monthly push notification allowance', desc: 'Platinum venues receive a larger monthly push notification quota, giving you more opportunities to reach guests throughout the month without hitting a cap mid-campaign.' },
      { title: 'Premium placement in "Near Me Now"', desc: 'Your venue appears at or near the top of the "Near Me Now" feed when users are in your area during happy hour. Position matters — top placement drives significantly higher click-through.' },
      { title: 'Priority placement in "Happening Nearby"', desc: 'Your active offers surface first in the "Happening Nearby" feed, giving you a consistent edge over non-Platinum venues during peak discovery windows.' },
      { title: 'QR code generation for wallet passes', desc: 'Generate print-ready QR codes that link directly to your wallet pass, so guests can save your offer from any physical or digital touchpoint — not just the app.' },
      { title: 'Table tents or table coasters with QR codes', desc: "Receive printed table materials pre-loaded with your venue's wallet pass QR code, making it easy for seated guests to save your offer before they leave. Physical placement drives digital saves." },
      { title: 'Wallet pass download reporting', desc: 'Monitor how many guests saved your pass, broken down by campaign, date, and offer type. Download volume is a leading indicator of redemption intent.' },
      { title: 'Wallet pass redemption reporting', desc: 'Track every scan — time, date, location, and campaign source — so you can connect offer redemptions directly to foot traffic and revenue impact.' },
      { title: 'Platinum Venue badge', desc: 'A visible Platinum badge appears on your venue profile and listings, signaling to users that your venue is a premium, active partner. Trust and credibility drive clicks.' },
      { title: 'Homepage or discovery screen feature placement', desc: "Your venue is periodically featured on the app's homepage or main discovery screen, putting you in front of all active users — not just those searching nearby." },
      { title: 'Featured placement in curated lists', desc: 'Your venue is included in editorially curated lists ("Best Happy Hours," "Top Picks This Week," etc.), giving you exposure to high-intent users browsing for recommendations.' },
      { title: 'Social media feature eligibility', desc: "Platinum venues are eligible to be featured across the app's social media channels, extending your reach to the broader audience outside the app and driving new followers to your profile." },
      { title: 'Geofenced arrival alerts', desc: "Welcome guests with an automatic notification the moment they walk into your venue's geofence, surfacing today's happy hour deals right when they arrive. (Fires while guests have the app open.)" },
      { title: 'Beacon tap-to-unlock coupons', desc: 'Place in-venue beacons at the door, bar, or exit and link each to a wallet coupon. Guests tap their phone to instantly unlock the offer — perfect for door welcomes, add-on specials, and come-back deals.' },
      { title: 'Geo-targeted promotion campaigns', desc: 'Target guests based on their proximity to your venue, driving foot traffic during your slowest windows with precisely timed proximity offers.' },
    ],
  },
  {
    id: 'venue-platinum-plus',
    label: 'Venue Platinum Plus',
    pricing: VENUE_PLATINUM_PLUS,
    color: 'border-purple-600',
    badge: '💎 Done For You',
    note: `+ one-time ${VENUE_PLATINUM_PLUS.setupFee.display} setup & installation fee`,
    features: [
      'Everything in Platinum, plus…',
      { title: 'Geofencing campaigns around the venue', desc: 'Draw a virtual boundary around your venue and automatically trigger marketing messages when users enter the zone.' },
      { title: 'Proximity-based alerts', desc: 'Send real-time notifications to app users as they approach your venue, surfacing your happy hour offer at exactly the right moment.' },
      { title: 'Beacon support for in-venue engagement', desc: 'Bluetooth beacons inside or just outside your venue trigger welcome messages, drink specials, or loyalty check-ins.' },
      { title: 'Location-triggered wallet pass reminders', desc: "When a pass holder enters your geofence, their saved pass surfaces automatically on their lock screen." },
      { title: 'Featured placement in geofence-triggered discovery', desc: "When a user enters your geofence, your venue leads the discovery results they see." },
      { title: '2 free beacons', desc: 'Two beacons included and installed for you.' },
      { title: 'Branded QR Coasters', desc: '100 branded drink coasters with a special QR code for the venue.' },
      { title: 'Tent Cards', desc: '100 branded table tent cards with a QR code for the venue.' },
      { title: 'Priority Plus support', desc: 'Our fastest support response for your team.' },
    ],
  },
];

function PlanCard({ plan, onSelect, venueTier, purchasing, billingCycle }) {
  const isPlatinum = plan.id.startsWith('venue-platinum');
  const isPremium = plan.id.includes('premium');
  const isFree = !plan.pricing;
  const priceDisplay = isFree ? 'Free' : plan.pricing[billingCycle].display;
  // Active state is driven by the SPECIFIC venue's tier so exactly one plan is active.
  const isActive = PLAN_TIER_MAP[plan.id] === venueTier;
  const isBuying = purchasing === plan.id;

  return (
    <div className={`relative flex flex-col rounded-2xl border-2 ${plan.color} bg-card p-5 shadow-sm`}>
      {plan.badge && (
        <span className={`absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap
          ${isPlatinum ? 'bg-slate-800 text-white' : 'bg-amber-500 text-white'}`}>
          {plan.badge}
        </span>
      )}

      <div className="mb-3">
        <div className="flex items-center gap-2 mb-1">
          {isPlatinum && <Zap className="w-4 h-4 text-slate-700" />}
          {isPremium && !isPlatinum && <Crown className="w-4 h-4 text-amber-500" />}
          <p className="font-bold text-base">{plan.label}</p>
        </div>
        <p className={`text-2xl font-heading font-bold ${isFree ? 'text-muted-foreground' : 'text-foreground'}`}>
          {priceDisplay}
        </p>
        {plan.note && <p className="text-xs text-muted-foreground mt-1">{plan.note}</p>}
      </div>

      <ul className="space-y-1.5 flex-1 mb-4">
        {plan.features.map((f, i) => {
          const title = typeof f === 'string' ? f : f.title;
          const desc = typeof f === 'string' ? null : f.desc;
          return (
            <li key={i} className="flex items-start gap-2 text-sm">
              <Check className={`w-4 h-4 flex-shrink-0 mt-0.5 ${isFree ? 'text-muted-foreground' : isPlatinum ? 'text-slate-700' : 'text-amber-500'}`} />
              <span className={isFree ? 'text-muted-foreground' : 'text-foreground'}>
                <span className={desc ? 'font-semibold' : ''}>{title}</span>
                {desc && <span className="block text-xs text-muted-foreground font-normal mt-0.5">{desc}</span>}
              </span>
            </li>
          );
        })}
      </ul>

      <Button
        variant={isFree || isActive ? 'outline' : 'default'}
        className={`w-full ${isPlatinum && !isActive ? 'bg-slate-800 hover:bg-slate-700 text-white' : ''}`}
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
          `Upgrade to ${plan.label.replace('Venue ', '')}`
        )}
      </Button>
    </div>
  );
}

export default function VenuePlans() {
  const navigate = useNavigate();
  const [venueTier, setVenueTier] = useState(null);
  const purchasing = null;
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [reviewPlan, setReviewPlan] = useState(null);

  // The plans page is scoped to a specific venue via ?venue_id=…
  const params = new URLSearchParams(window.location.search);
  const [venueId, setVenueId] = useState(params.get('venue_id'));
  const purchaseSuccess = params.get('purchase') === 'success';
  const focus = params.get('focus'); // 'premium' | 'platinum' — limits which upgrade is shown

  const visiblePlans = focus
    ? VENUE_PLANS.filter(p => p.id === 'venue-free' || p.id === `venue-${focus.replace('_', '-')}`)
    : VENUE_PLANS;

  useEffect(() => {
    if (venueId) {
      base44.entities.Venue.get(venueId)
        .then(v => setVenueTier(effectiveTier(v)))
        .catch(() => setVenueTier('free'));
    } else {
      setVenueTier('free');
      // No venue in the URL — fall back to the owner's first venue
      base44.auth.me()
        .then(u => base44.entities.Venue.filter({ owner_id: u.id }, '-created_date', 1))
        .then(vs => { if (vs[0]?.id) setVenueId(vs[0].id); })
        .catch(() => {});
    }
  }, [venueId]);

  const { activating, awaitingReturn, setAwaitingReturn, refresh } = useEntitlementRefresh({
    venueId,
    isUnlocked: (d) => (d?.active || []).some(e => e.startsWith('venue_')),
    onResult: (d) => {
      if (!d?.subscription_tier) return;
      setVenueTier((d.active || []).includes('venue_platinum_plus') ? 'platinum_plus' : d.subscription_tier);
      if (d.subscription_tier !== 'free' && venueId) {
        trackEventOnce(`venue_paid_${venueId}_${d.subscription_tier}`, 'venue_upgrade_paid', { tier: d.subscription_tier });
      }
      if (d.subscription_tier !== 'free') setSuccessMsg('🎉 Your subscription is active! Your venue has been upgraded.');
    },
  });

  const handleSelect = (plan) => {
    if (!plan.pricing) return;
    setError(null);
    setReviewPlan(plan);
  };

  const confirmCheckout = () => {
    trackEvent('venue_upgrade_started', { tier: PLAN_TIER_MAP[reviewPlan.id] });
    openExternal(venueCheckoutUrl(venueId, VENUE_PACKAGES[reviewPlan.id]?.[billingCycle]));
    setReviewPlan(null);
    setAwaitingReturn(true);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="relative bg-gradient-to-br from-slate-700 to-slate-800 text-white px-4 pt-10 pb-8 text-center">
        <button
          onClick={() => navigate(-1)}
          className="absolute top-4 left-4 p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <Zap className="w-10 h-10 mx-auto mb-3 opacity-90" />
        <h1 className="text-2xl font-heading font-bold mb-1">Venue Plans</h1>
        <p className="text-white/85 text-sm">Grow your business with premium visibility</p>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-10">
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
            savingsPct={annualSavingsPct(VENUE_PREMIUM)}
          />
        </div>

        <div className={`grid gap-4 ${visiblePlans.length === 2 ? 'sm:grid-cols-2 max-w-2xl mx-auto' : 'sm:grid-cols-2 lg:grid-cols-4'}`}>
          {visiblePlans.map(plan => (
            <PlanCard
              key={plan.id}
              plan={plan}
              onSelect={handleSelect}
              venueTier={venueTier}
              purchasing={purchasing}
              billingCycle={billingCycle}
            />
          ))}
        </div>

        <UpgradeReviewDialog plan={reviewPlan} billingCycle={billingCycle} hasVenue={!!venueId} onCancel={() => setReviewPlan(null)} onConfirm={confirmCheckout} />
        <ManageSubscriptionLink />
        <p className="text-xs text-center text-muted-foreground pb-6">
          Secure checkout. Cancel anytime. Questions? Contact support@happyhourflower.com
        </p>
      </div>
    </div>
  );
}