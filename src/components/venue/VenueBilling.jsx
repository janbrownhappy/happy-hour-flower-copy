import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getVenueBilling } from '@/functions/getVenueBilling';
import { Button } from '@/components/ui/button';
import { Receipt, ExternalLink, FileText, CreditCard, AlertCircle } from 'lucide-react';

const STATUS_STYLES = {
  paid: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  open: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  void: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
  uncollectible: 'bg-red-500/15 text-red-300 border-red-500/30',
};

function money(amount, currency) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency || 'USD' }).format(amount || 0);
}

export default function VenueBilling({ venueId, venueName }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    getVenueBilling({ venueId })
      .then(res => { if (active) setData(res.data); })
      .catch(err => { if (active) setError(err?.response?.data?.error || err?.message || 'Failed to load billing'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [venueId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-7 h-7 border-4 border-amber-200 border-t-amber-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-950/30 border border-red-800/40 rounded-2xl p-5 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
        <div>
          <p className="text-red-300 font-semibold text-sm">Couldn't load billing history</p>
          <p className="text-slate-400 text-xs mt-1">{error}</p>
        </div>
      </div>
    );
  }

  const charges = data?.charges || [];

  return (
    <div className="space-y-4">
      {/* Summary card */}
      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-white font-semibold flex items-center gap-2">
              <Receipt className="w-4 h-4 text-amber-500" /> Billing History
            </p>
            <p className="text-slate-400 text-xs mt-0.5">
              Charges for {venueName} · {charges.length} transaction{charges.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="text-right">
            <p className="text-slate-400 text-xs uppercase tracking-wide">Total Paid</p>
            <p className="text-white font-bold text-lg">{money(data?.total_paid, data?.currency)}</p>
          </div>
        </div>
      </div>

      {/* Transactions */}
      {charges.length === 0 ? (
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5 text-center py-10">
          <CreditCard className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 text-sm">No charges yet</p>
          <p className="text-slate-500 text-xs mt-1">
            This venue is on the free plan, or no paid invoices have been issued.
          </p>
          <Button asChild className="mt-4 bg-amber-500 hover:bg-amber-600 text-white">
            <Link to={`/plans/venue?venue_id=${venueId}`}>View Plans</Link>
          </Button>
        </div>
      ) : (
        <div className="bg-slate-800 border border-slate-700 rounded-2xl divide-y divide-slate-700">
          {charges.map(c => (
            <div key={c.id} className="p-4 flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-white font-semibold text-sm">{money(c.amount, c.currency)}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full border capitalize ${STATUS_STYLES[c.status] || STATUS_STYLES.void}`}>
                    {c.status}
                  </span>
                </div>
                <p className="text-slate-300 text-sm mt-0.5 truncate">{c.description}</p>
                <p className="text-slate-500 text-xs mt-1">
                  {c.date
                    ? new Date(c.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
                    : '—'}
                </p>
                {c.transaction_id && (
                  <p className="text-slate-500 text-[11px] mt-1 font-mono break-all">
                    Txn: {c.transaction_id}
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-2 shrink-0">
                {c.invoice_url && (
                  <a href={c.invoice_url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300">
                    <ExternalLink className="w-3.5 h-3.5" /> View
                  </a>
                )}
                {c.pdf_url && (
                  <a href={c.pdf_url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200">
                    <FileText className="w-3.5 h-3.5" /> PDF
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}