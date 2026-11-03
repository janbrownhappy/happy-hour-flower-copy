import { ExternalLink, FileText } from 'lucide-react';

function money(amount, currency) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency || 'USD' }).format(amount || 0);
}

const STATUS_STYLE = {
  paid: 'bg-emerald-500/20 text-emerald-300',
  open: 'bg-amber-500/20 text-amber-300',
  uncollectible: 'bg-red-500/20 text-red-300',
  void: 'bg-slate-600/50 text-slate-300',
  draft: 'bg-slate-600/50 text-slate-300',
};

export default function FinancialPaymentRow({ payment }) {
  return (
    <div className="grid grid-cols-12 gap-2 items-center px-4 py-3 hover:bg-slate-700/30 transition-colors">
      <div className="col-span-4 min-w-0">
        <p className="text-white text-sm font-medium truncate">{payment.venue_name}</p>
        <p className="text-slate-500 text-[11px] truncate">{payment.description}</p>
      </div>
      <div className="col-span-3 text-slate-300 text-xs">
        {payment.date
          ? new Date(payment.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
          : '—'}
      </div>
      <div className="col-span-2 text-white text-sm font-semibold">{money(payment.amount, payment.currency)}</div>
      <div className="col-span-2">
        <span className={`text-[11px] px-2 py-0.5 rounded-full capitalize ${STATUS_STYLE[payment.status] || 'bg-slate-600/50 text-slate-300'}`}>
          {payment.status}
        </span>
      </div>
      <div className="col-span-1 flex items-center justify-end gap-2">
        {payment.invoice_url && (
          <a href={payment.invoice_url} target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300" title="View invoice">
            <ExternalLink className="w-4 h-4" />
          </a>
        )}
        {payment.pdf_url && (
          <a href={payment.pdf_url} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-slate-200" title="Download PDF">
            <FileText className="w-4 h-4" />
          </a>
        )}
      </div>
    </div>
  );
}