import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { getOwnerBilling } from '@/functions/getOwnerBilling';
import { DollarSign, ArrowLeft, AlertCircle, TrendingUp, Store, Receipt } from 'lucide-react';
import FinancialPaymentRow from '@/components/venue/FinancialPaymentRow';

function money(amount, currency) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency || 'USD' }).format(amount || 0);
}

const TIER_STYLE = {
  premium: 'bg-amber-500/20 text-amber-300',
  platinum: 'bg-sky-500/20 text-sky-300',
  free: 'bg-slate-600/50 text-slate-300',
};
const BILLING_STYLE = {
  active: 'bg-emerald-500/20 text-emerald-300',
  past_due: 'bg-amber-500/20 text-amber-300',
  canceled: 'bg-red-500/20 text-red-300',
};

export default function FinancialOverview() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [venues, setVenues] = useState([]);

  useEffect(() => {
    let active = true;
    (async () => {
      const authed = await base44.auth.isAuthenticated();
      if (!authed) { navigate('/login'); return; }
      const me = await base44.auth.me();
      if (!['admin', 'venue_owner'].includes(me.role)) { navigate('/explore', { replace: true }); return; }
      try {
        const [billingRes, ownedVenues] = await Promise.all([
          getOwnerBilling({}),
          base44.entities.Venue.filter({ owner_id: me.id }).catch(() => []),
        ]);
        if (!active) return;
        setData(billingRes.data);
        setVenues(ownedVenues);
      } catch (err) {
        if (active) setError(err?.response?.data?.error || err?.message || 'Failed to load financials');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-amber-200 border-t-amber-500 rounded-full animate-spin" />
      </div>
    );
  }

  const billingVenues = data?.venues || [];
  // Index venue subscription/billing status by id for quick lookup.
  const venueById = Object.fromEntries(venues.map(v => [String(v.id), v]));

  // Flatten all charges into one payments list, tagged with venue name, sorted by date desc.
  const allPayments = billingVenues
    .flatMap(v => v.charges.map(c => ({ ...c, venue_name: v.venue_name })))
    .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <div className="bg-slate-900 border-b border-slate-700 px-4 py-5">
        <div className="max-w-3xl mx-auto">
          <Link to="/venue-owner" className="inline-flex items-center gap-1.5 text-slate-400 hover:text-white text-xs mb-3 transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-xl font-heading font-bold text-white">Financial Overview</h1>
              <p className="text-slate-400 text-xs">Earnings and payment history across your venues</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-5 space-y-5">
        {error ? (
          <div className="bg-red-950/30 border border-red-800/40 rounded-2xl p-5 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-red-300 font-semibold text-sm">Couldn't load financials</p>
              <p className="text-slate-400 text-xs mt-1">{error}</p>
            </div>
          </div>
        ) : (
          <>
            {/* Top summary */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-slate-800 border border-slate-700 rounded-2xl p-4">
                <div className="flex items-center gap-1.5 text-slate-400 text-[11px] uppercase tracking-wide mb-1">
                  <TrendingUp className="w-3.5 h-3.5" /> Total Earnings
                </div>
                <p className="text-white font-bold text-2xl">{money(data?.grand_total, data?.currency)}</p>
              </div>
              <div className="bg-slate-800 border border-slate-700 rounded-2xl p-4">
                <div className="flex items-center gap-1.5 text-slate-400 text-[11px] uppercase tracking-wide mb-1">
                  <Store className="w-3.5 h-3.5" /> Paying Venues
                </div>
                <p className="text-white font-bold text-2xl">{billingVenues.length}</p>
              </div>
              <div className="bg-slate-800 border border-slate-700 rounded-2xl p-4">
                <div className="flex items-center gap-1.5 text-slate-400 text-[11px] uppercase tracking-wide mb-1">
                  <Receipt className="w-3.5 h-3.5" /> Payments
                </div>
                <p className="text-white font-bold text-2xl">{allPayments.length}</p>
              </div>
            </div>

            {/* Earnings by venue */}
            <div className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-700">
                <p className="text-white font-semibold text-sm">Earnings by Venue</p>
              </div>
              {billingVenues.length === 0 ? (
                <div className="p-6 text-center">
                  <p className="text-slate-400 text-sm">No earnings yet</p>
                  <p className="text-slate-500 text-xs mt-1">Totals appear here once a venue is on a paid plan.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-700">
                  {billingVenues.map(v => {
                    const venue = venueById[String(v.venue_id)];
                    return (
                      <div key={v.venue_id} className="px-5 py-4 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <Link to={`/venue-dashboard/${v.venue_id}#billing`} className="text-white font-semibold text-sm truncate hover:text-amber-300 transition-colors">
                            {v.venue_name}
                          </Link>
                          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                            {venue?.subscription_tier && (
                              <span className={`text-[11px] px-2 py-0.5 rounded-full capitalize ${TIER_STYLE[venue.subscription_tier] || TIER_STYLE.free}`}>
                                {venue.subscription_tier}
                              </span>
                            )}
                            {venue?.billing_status && (
                              <span className={`text-[11px] px-2 py-0.5 rounded-full capitalize ${BILLING_STYLE[venue.billing_status] || BILLING_STYLE.active}`}>
                                {venue.billing_status.replace('_', ' ')}
                              </span>
                            )}
                            <span className="text-slate-500 text-[11px]">
                              {v.charges.length} payment{v.charges.length !== 1 ? 's' : ''}
                            </span>
                          </div>
                        </div>
                        <p className="text-white font-bold text-base shrink-0">{money(v.total_paid, v.currency)}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Payment breakdown */}
            <div className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-700">
                <p className="text-white font-semibold text-sm">Payment Breakdown</p>
                <p className="text-slate-400 text-xs">Date · amount · status across all venues</p>
              </div>
              {allPayments.length === 0 ? (
                <div className="p-6 text-center">
                  <p className="text-slate-400 text-sm">No payments recorded</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-12 gap-2 px-4 py-2 border-b border-slate-700 text-[11px] uppercase tracking-wide text-slate-500">
                    <div className="col-span-4">Venue</div>
                    <div className="col-span-3">Date</div>
                    <div className="col-span-2">Amount</div>
                    <div className="col-span-2">Status</div>
                    <div className="col-span-1 text-right">Invoice</div>
                  </div>
                  <div className="divide-y divide-slate-700">
                    {allPayments.map(p => (
                      <FinancialPaymentRow key={p.id} payment={p} />
                    ))}
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}