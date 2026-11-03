import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { Ticket, ChevronRight, Clock } from 'lucide-react';

const STATUS_META = {
  issued: { text: 'Active', cls: 'bg-emerald-500/15 text-emerald-600' },
  redeemed: { text: 'Redeemed', cls: 'bg-slate-500/15 text-slate-500' },
  expired: { text: 'Expired', cls: 'bg-red-500/15 text-red-600' },
  voided: { text: 'Voided', cls: 'bg-red-500/15 text-red-600' },
};

// Consumer "wallet" — every coupon/loyalty pass the signed-in user has collected
// (via proximity/NFC unlock or a venue issuing one to them). Each row taps through
// to the /wallet-pass/:id viewer.
export default function MyPasses({ userId }) {
  const [passes, setPasses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      try {
        const rows = await base44.entities.PassInstance.filter(
          { consumer_user_id: userId },
          '-issued_at',
          50,
        );
        if (!cancelled) setPasses(rows);
      } catch {
        if (!cancelled) setPasses([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [userId]);

  if (loading) {
    return <div className="h-20 bg-muted rounded-2xl animate-pulse mb-4" />;
  }

  if (passes.length === 0) {
    return (
      <div className="bg-card border border-border rounded-2xl p-4 mb-4">
        <h3 className="font-semibold flex items-center gap-2 mb-1">
          <Ticket className="w-4 h-4 text-primary" /> My Passes
        </h3>
        <p className="text-xs text-muted-foreground">
          Coupons you unlock at venues will show up here.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-2xl mb-4 overflow-hidden">
      <div className="flex items-center gap-2 p-4 pb-3">
        <Ticket className="w-4 h-4 text-primary" />
        <h3 className="font-semibold">My Passes</h3>
        <span className="text-xs text-muted-foreground">({passes.length})</span>
      </div>
      <div className="divide-y divide-border">
        {passes.map((p) => {
          const meta = STATUS_META[p.status] || STATUS_META.issued;
          const expires = p.expires_at ? new Date(p.expires_at) : null;
          return (
            <Link
              key={p.id}
              to={`/wallet-pass/${p.id}`}
              className="flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors"
            >
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Ticket className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{p.venue_name || 'Coupon'}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`text-[11px] px-1.5 py-0.5 rounded-full font-medium ${meta.cls}`}>{meta.text}</span>
                  {p.pass_type === 'loyalty_card' && (
                    <span className="text-[11px] font-semibold text-primary">
                      {p.loyalty_points || 0}/{p.loyalty_max_points || 10} stamps
                    </span>
                  )}
                  {expires && (
                    <span className="text-[11px] text-muted-foreground flex items-center gap-0.5">
                      <Clock className="w-3 h-3" />
                      {expires.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  )}
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}