import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getOwnerBilling } from '@/functions/getOwnerBilling';
import { Receipt, ChevronDown, ChevronUp, ExternalLink, FileText, AlertCircle } from 'lucide-react';

function money(amount, currency) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency || 'USD' }).format(amount || 0);
}

export default function OwnerBillingOverview() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    let active = true;
    getOwnerBilling({})
      .then(res => { if (active) setData(res.data); })
      .catch(err => { if (active) setError(err?.response?.data?.error || err?.message || 'Failed to load billing'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  if (loading) {
    return (
      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 flex items-center justify-center">
        <div className="w-6 h-6 border-4 border-amber-200 border-t-amber-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-950/30 border border-red-800/40 rounded-2xl p-5 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
        <div>
          <p className="text-red-300 font-semibold text-sm">Couldn't load billing</p>
          <p className="text-slate-400 text-xs mt-1">{error}</p>
        </div>
      </div>
    );
  }

  const venues = data?.venues || [];

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden">
      <div className="p-5 flex items-center justify-between gap-4 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
            <Receipt className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <p className="text-white font-semibold text-sm">Billing Overview</p>
            <p className="text-slate-400 text-xs">All venues in one place</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-slate-400 text-[11px] uppercase tracking-wide">Total Paid</p>
          <p className="text-white font-bold text-lg">{money(data?.grand_total, data?.currency)}</p>
        </div>
      </div>

      {venues.length === 0 ? (
        <div className="p-6 text-center">
          <p className="text-slate-400 text-sm">No charges yet</p>
          <p className="text-slate-500 text-xs mt-1">Charges appear here once a venue is on a paid plan.</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-700">
          {venues.map(v => {
            const isOpen = expanded === v.venue_id;
            return (
              <div key={v.venue_id}>
                <button
                  onClick={() => setExpanded(isOpen ? null : v.venue_id)}
                  className="w-full p-4 flex items-center justify-between gap-3 hover:bg-slate-700/40 transition-colors text-left"
                >
                  <div className="min-w-0">
                    <p className="text-white font-semibold text-sm truncate">{v.venue_name}</p>
                    <p className="text-slate-400 text-xs">
                      {v.charges.length} transaction{v.charges.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-white font-bold text-sm">{money(v.total_paid, v.currency)}</span>
                    {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                  </div>
                </button>

                {isOpen && (
                  <div className="px-4 pb-3 space-y-2">
                    {v.charges.map(c => (
                      <div key={c.id} className="bg-slate-700/40 rounded-lg p-3 flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-white font-semibold text-sm">{money(c.amount, c.currency)}</span>
                            <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-600/50 text-slate-300 capitalize">{c.status}</span>
                          </div>
                          <p className="text-slate-300 text-xs mt-0.5 truncate">{c.description}</p>
                          <p className="text-slate-500 text-[11px] mt-0.5">
                            {c.date ? new Date(c.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}
                          </p>
                        </div>
                        <div className="flex flex-col gap-1.5 shrink-0">
                          {c.invoice_url && (
                            <a href={c.invoice_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300">
                              <ExternalLink className="w-3.5 h-3.5" /> View
                            </a>
                          )}
                          {c.pdf_url && (
                            <a href={c.pdf_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200">
                              <FileText className="w-3.5 h-3.5" /> PDF
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                    <Link to={`/venue-dashboard/${v.venue_id}#billing`} className="block text-center text-xs text-amber-400 hover:text-amber-300 pt-1">
                      Open venue billing →
                    </Link>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}