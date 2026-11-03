import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, XCircle, CheckCircle2, CreditCard } from 'lucide-react';
import { useAdminLocation, venueInTerritory } from '@/lib/AdminLocationContext';

const STATUS_CONFIG = {
  past_due: { label: 'Past Due', icon: AlertTriangle, badge: 'destructive', accent: 'border-amber-300 bg-amber-50' },
  canceled: { label: 'Canceled', icon: XCircle, badge: 'secondary', accent: 'border-red-200 bg-red-50' },
  active: { label: 'Active', icon: CheckCircle2, badge: 'default', accent: 'border-border bg-card' },
};

export default function AdminBillingHealth() {
  const { locationFilter } = useAdminLocation();
  const [loading, setLoading] = useState(true);
  const [allVenues, setAllVenues] = useState([]);

  useEffect(() => {
    base44.entities.Venue.list()
      .then(setAllVenues)
      .finally(() => setLoading(false));
  }, []);

  const venues = allVenues.filter(v => venueInTerritory(v, locationFilter));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-6 h-6 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  // At-risk = past_due or canceled. Paid venues = premium/platinum tier.
  const atRisk = venues.filter(v => v.billing_status === 'past_due' || v.billing_status === 'canceled');
  const pastDue = atRisk.filter(v => v.billing_status === 'past_due');
  const canceled = atRisk.filter(v => v.billing_status === 'canceled');
  const paid = venues.filter(v => v.subscription_tier === 'premium' || v.subscription_tier === 'platinum');

  const sorted = [...atRisk].sort((a, b) =>
    new Date(b.billing_status_updated_at || 0) - new Date(a.billing_status_updated_at || 0)
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <CreditCard className="w-5 h-5 text-primary" />
        <h2 className="text-xl font-heading font-bold">Billing Health</h2>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-card border border-border rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-primary leading-none">{paid.length}</p>
          <p className="text-xs text-muted-foreground mt-1">Paid Venues</p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-amber-600 leading-none">{pastDue.length}</p>
          <p className="text-xs text-amber-700 mt-1">Past Due</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-red-600 leading-none">{canceled.length}</p>
          <p className="text-xs text-red-700 mt-1">Canceled</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-emerald-600 leading-none">{paid.length - atRisk.length >= 0 ? paid.length - pastDue.length : 0}</p>
          <p className="text-xs text-muted-foreground mt-1">In Good Standing</p>
        </div>
      </div>

      {/* At-risk list */}
      {sorted.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-8 text-center">
          <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
          <p className="font-semibold">All subscriptions are in good standing</p>
          <p className="text-sm text-muted-foreground mt-1">No failed payments or cancellations to review.</p>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-sm font-semibold text-muted-foreground">At-Risk Subscriptions ({sorted.length})</p>
          {sorted.map(v => {
            const cfg = STATUS_CONFIG[v.billing_status] || STATUS_CONFIG.active;
            const Icon = cfg.icon;
            return (
              <div key={v.id} className={`border rounded-xl p-4 flex items-center justify-between gap-3 ${cfg.accent}`}>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Icon className="w-4 h-4 text-foreground/70 shrink-0" />
                    <p className="font-semibold truncate">{v.name}</p>
                    <Badge variant={cfg.badge}>{cfg.label}</Badge>
                    <Badge variant="outline" className="capitalize">{v.subscription_tier}</Badge>
                  </div>
                  {(v.city || v.market_name) && (
                    <p className="text-xs text-muted-foreground mt-1 truncate">
                      {[v.city, v.market_name].filter(Boolean).join(' · ')}
                    </p>
                  )}
                </div>
                <div className="text-right text-xs text-muted-foreground shrink-0">
                  {v.billing_status_updated_at && (
                    <p>Since {new Date(v.billing_status_updated_at).toLocaleDateString()}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}