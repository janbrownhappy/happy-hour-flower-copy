import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Megaphone, ArrowLeft } from 'lucide-react';
import AdSubmitForm from '@/components/ads/AdSubmitForm';
import AdCampaignList from '@/components/ads/AdCampaignList';
import { verifyAdCheckout } from '@/functions/verifyAdCheckout';

// Venue owner ad center: buy a placement (premium/platinum only) and track campaigns.
export default function VenueAds() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [user, setUser] = useState(null);
  const [venues, setVenues] = useState([]);
  const [pricing, setPricing] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [verifyMsg, setVerifyMsg] = useState('');

  const load = async () => {
    const me = await base44.auth.me();
    setUser(me);
    const [allVenues, pricingList, myCampaigns] = await Promise.all([
      base44.entities.Venue.list(),
      base44.entities.AdPricing.list(),
      base44.entities.AdCampaign.filter({ owner_id: me.id }, '-created_date').catch(() => []),
    ]);
    setVenues(allVenues.filter(v => v.owner_id === me.id));
    setPricing(pricingList[0] || null);
    setCampaigns(myCampaigns);
    setLoading(false);
  };

  useEffect(() => {
    base44.auth.isAuthenticated().then(async (authed) => {
      if (!authed) { navigate('/login'); return; }
      await load();

      // Returning from Stripe checkout?
      const sessionId = searchParams.get('session_id');
      if (sessionId) {
        setVerifyMsg('Confirming your payment…');
        try {
          const res = await verifyAdCheckout({ sessionId });
          if (res?.data?.paid) {
            setVerifyMsg('Payment received! Your ad is now under review — we\'ll email you when it goes live.');
          } else {
            setVerifyMsg('Payment not completed. You can try again below.');
          }
        } catch {
          setVerifyMsg('We couldn\'t confirm the payment. If you were charged, your ad will appear shortly.');
        }
        searchParams.delete('session_id');
        setSearchParams(searchParams, { replace: true });
        await load();
      }
    });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-amber-200 border-t-amber-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
      <div className="bg-slate-900 border-b border-slate-700 px-4 py-5">
        <div className="max-w-2xl mx-auto">
          <button onClick={() => navigate('/venue-owner')} className="flex items-center gap-1.5 text-slate-400 hover:text-white text-sm mb-3">
            <ArrowLeft className="w-4 h-4" /> Owner Dashboard
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
              <Megaphone className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h1 className="text-xl font-heading font-bold text-white">Advertise in the App</h1>
              <p className="text-slate-400 text-xs">Reach free users with a rotating ad placement</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-5 space-y-5">
        {verifyMsg && (
          <div className="bg-emerald-500/15 border border-emerald-500/40 rounded-xl p-3 text-sm text-emerald-200">
            {verifyMsg}
          </div>
        )}

        {venues.length === 0 ? (
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 text-center">
            <p className="text-3xl mb-3">📣</p>
            <h2 className="text-white font-semibold text-lg mb-2">No venues yet</h2>
            <p className="text-slate-400 text-sm max-w-xs mx-auto">
              Add a venue to your account to purchase rotating ad placements.
            </p>
          </div>
        ) : (
          <AdSubmitForm venues={venues} pricing={pricing} onSubmitted={load} />
        )}

        <AdCampaignList campaigns={campaigns} />
      </div>
    </div>
  );
}