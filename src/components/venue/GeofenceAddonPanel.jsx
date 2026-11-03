import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import BillingToggle from '@/components/BillingToggle';
import { Navigation, Bluetooth, Loader2, CheckCircle2, Crown, ArrowRight } from 'lucide-react';
import { GEOFENCE_ADDON, annualSavingsPct } from '@/lib/pricing';
import { createGeofenceAddonCheckout } from '@/functions/createGeofenceAddonCheckout';
import { verifyGeofenceAddonCheckout } from '@/functions/verifyGeofenceAddonCheckout';
import useEntitlementRefresh from '@/hooks/useEntitlementRefresh';
import { venueCheckoutUrl, openExternal, VENUE_PACKAGES } from '@/lib/revenuecat';
import PurchaseStatus from '@/components/plans/PurchaseStatus';

// Purchase flow for the paid Beacon & Geofencing add-on (Platinum only).
// Two Stripe legs: Step 1 one-time setup fee (mode: payment), then Step 2
// the recurring subscription (mode: subscription). The add-on unlocks the
// geofence & beacon features once geofence_addon_status === 'active'.
export default function GeofenceAddonPanel({ venue, canEdit, onActivated }) {
  const navigate = useNavigate();
  const [billingCycle, setBillingCycle] = useState(venue.geofence_addon_billing_cycle || 'monthly');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [msg, setMsg] = useState('');

  const setupPaid = !!venue.geofence_setup_fee_paid;
  const step = setupPaid ? 'subscription' : 'setup';

  // Returning from a Stripe leg? Verify and, when the setup leg completes,
  // immediately kick off the subscription leg.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('session_id');
    const geofenceStep = params.get('geofence_step');
    if (!sessionId || !geofenceStep) return;

    setVerifying(true);
    verifyGeofenceAddonCheckout({ sessionId, step: geofenceStep })
      .then(async (res) => {
        const data = res?.data;
        if (!data?.paid) {
          setError('Payment was not completed. If you were charged, please contact support.');
          return;
        }
        // Clean the URL before any redirect.
        const clean = `/venue-dashboard/${venue.id}#geofence`;
        window.history.replaceState({}, '', clean);

        if (geofenceStep === 'setup') {
          // Setup fee done → the owner starts the RevenueCat subscription leg.
          setMsg('Setup fee received! Tap "Continue to Subscription" to finish.');
          onActivated?.();
        } else {
          setMsg('🎉 Your Beacon & Geofencing add-on is active!');
          onActivated?.();
        }
      })
      .catch((e) => setError(`Could not verify payment: ${e?.message || 'Unknown error'}`))
      .finally(() => setVerifying(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { activating, awaitingReturn, setAwaitingReturn, refresh } = useEntitlementRefresh({
    venueId: venue.id,
    isUnlocked: (d) => d?.active?.includes('venue_platinum_plus'),
    onResult: (d) => {
      if (d?.active?.includes('venue_platinum_plus') && venue.geofence_addon_status !== 'active') {
        setMsg('🎉 Your Beacon & Geofencing add-on is active!');
        onActivated?.();
      }
    },
  });

  const startCheckout = async (whichStep) => {
    setError('');
    if (whichStep === 'subscription') {
      // Recurring PlatinumPlus subscription is sold through RevenueCat.
      openExternal(venueCheckoutUrl(venue.id, VENUE_PACKAGES['venue-platinum-plus'][billingCycle]));
      setAwaitingReturn(true);
      return;
    }
    setBusy(true);
    try {
      const base = `${window.location.origin}/venue-dashboard/${venue.id}`;
      const { data } = await createGeofenceAddonCheckout({
        venueId: venue.id,
        billingCycle,
        step: whichStep,
        successUrl: base,
        cancelUrl: `${base}#geofence`,
      });
      if (data?.url) {
        window.location.href = data.url;
      } else {
        setError(data?.error || 'Could not start checkout. Please try again.');
        setBusy(false);
      }
    } catch (e) {
      setError(`Could not start checkout: ${e.message}`);
      setBusy(false);
    }
  };

  if (verifying) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16">
        <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
        <p className="text-slate-400 text-sm">Confirming your payment…</p>
      </div>
    );
  }

  const recurring = GEOFENCE_ADDON[billingCycle].display;

  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-2xl border border-purple-500/30" style={{ background: 'radial-gradient(ellipse at top left, rgba(168,85,247,0.12), #0f1117)' }}>
        <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg, #a855f7, rgba(168,85,247,0.3))' }} />
        <div className="p-6 space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-purple-500/10 border border-purple-500/25 flex items-center justify-center shrink-0">
              <Navigation className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-white font-bold text-base">Beacon & Geofencing Add-on</p>
                <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/25 font-semibold">Platinum</span>
              </div>
              <p className="text-slate-400 text-sm mt-0.5">
                Welcome guests with geofenced arrival alerts and place tap-to-unlock beacons at the door, bar, and exit.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {['Geofenced arrival alerts', 'Beacon tap-to-unlock coupons', 'Geo-targeted campaigns'].map(f => (
              <span key={f} className="text-xs px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/15 flex items-center gap-1">
                {f === 'Beacon tap-to-unlock coupons' ? <Bluetooth className="w-3 h-3" /> : <Navigation className="w-3 h-3" />}
                {f}
              </span>
            ))}
          </div>

          <BillingToggle value={billingCycle} onChange={setBillingCycle} savingsPct={annualSavingsPct(GEOFENCE_ADDON)} dark />

          {/* Price breakdown: setup fee + recurring, clearly separated */}
          <div className="rounded-xl border border-slate-700 bg-slate-800/60 divide-y divide-slate-700">
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-2">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${setupPaid ? 'bg-emerald-500 text-white' : 'bg-purple-500 text-white'}`}>
                  {setupPaid ? <CheckCircle2 className="w-4 h-4" /> : '1'}
                </span>
                <div>
                  <p className="text-white text-sm font-medium">One-time setup fee</p>
                  <p className="text-slate-500 text-xs">Beacon provisioning & configuration</p>
                </div>
              </div>
              <p className={`font-bold ${setupPaid ? 'text-emerald-400 line-through' : 'text-white'}`}>{GEOFENCE_ADDON.setupFee.display}</p>
            </div>
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold bg-slate-600 text-white">2</span>
                <div>
                  <p className="text-white text-sm font-medium">Recurring subscription</p>
                  <p className="text-slate-500 text-xs">Billed {billingCycle === 'annual' ? 'annually' : 'monthly'}, cancel anytime</p>
                </div>
              </div>
              <p className="text-white font-bold">{recurring}</p>
            </div>
          </div>

          <PurchaseStatus activating={activating} awaitingReturn={awaitingReturn} purchaseSuccess={false} onRefresh={refresh} />
          {error && <p className="text-red-400 text-sm">{error}</p>}
          {msg && <p className="text-emerald-300 text-sm">{msg}</p>}

          {canEdit ? (
            <Button
              className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 font-semibold rounded-xl"
              disabled={busy}
              onClick={() => startCheckout(step)}
            >
              {busy ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Redirecting…</>
              ) : setupPaid ? (
                <>Continue to Subscription <ArrowRight className="w-4 h-4 ml-2" /></>
              ) : (
                <>Get the Add-on — Step 1: Setup Fee <ArrowRight className="w-4 h-4 ml-2" /></>
              )}
            </Button>
          ) : (
            <div className="bg-slate-700/50 border border-slate-600 rounded-xl p-4 text-center">
              <p className="text-slate-400 text-sm">You have view-only access. Contact an owner or editor to purchase the add-on.</p>
            </div>
          )}

          <p className="text-slate-500 text-xs text-center">
            Secure checkout powered by Stripe. The setup fee is charged first, then your recurring subscription starts.
          </p>
        </div>
      </div>
    </div>
  );
}