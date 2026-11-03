import { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { TrendingDown, Store, Users, AlertCircle } from 'lucide-react';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { useAdminLocation, venueInTerritory, profileInTerritory, hasTerritory } from '@/lib/AdminLocationContext';

const MONTHS_BACK = 6;

// Build an array of the last N month buckets (oldest -> newest).
function monthBuckets() {
  const now = new Date();
  return Array.from({ length: MONTHS_BACK }, (_, i) => {
    const d = startOfMonth(subMonths(now, MONTHS_BACK - 1 - i));
    return {
      key: format(d, 'yyyy-MM'),
      label: format(d, 'MMM'),
      start: d,
      end: endOfMonth(d),
    };
  });
}

function StatCard({ icon: Icon, value, label, tone = 'default' }) {
  const tones = {
    default: 'bg-card border-border text-foreground',
    red: 'bg-red-50 border-red-200 text-red-600',
    amber: 'bg-amber-50 border-amber-200 text-amber-600',
  };
  return (
    <div className={`border rounded-xl p-4 ${tones[tone]}`}>
      <div className="flex items-center gap-2 mb-1">
        <Icon className="w-4 h-4" />
        <span className="text-2xl font-bold leading-none">{value}</span>
      </div>
      <p className="text-xs opacity-80">{label}</p>
    </div>
  );
}

export default function AdminChurn() {
  const { locationFilter } = useAdminLocation();
  const [venues, setVenues] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      base44.entities.Venue.list().catch(() => []),
      base44.entities.Profile.list().catch(() => []),
    ]).then(([v, p]) => {
      setVenues(v || []);
      setProfiles(p || []);
    }).finally(() => setLoading(false));
  }, []);

  const scopedVenues = useMemo(() =>
    hasTerritory(locationFilter) ? venues.filter(v => venueInTerritory(v, locationFilter)) : venues,
  [venues, locationFilter]);

  const scopedProfiles = useMemo(() =>
    hasTerritory(locationFilter) ? profiles.filter(p => profileInTerritory(p, locationFilter)) : profiles,
  [profiles, locationFilter]);

  const buckets = useMemo(() => monthBuckets(), []);

  // Venue churn: canceled billing_status, bucketed by billing_status_updated_at.
  const canceledVenues = useMemo(() =>
    scopedVenues.filter(v => v.billing_status === 'canceled'),
  [scopedVenues]);

  // Consumer churn: premium tier whose subscription_expires_at has lapsed.
  const lapsedConsumers = useMemo(() => {
    const now = new Date();
    return scopedProfiles.filter(p => {
      if (!p.subscription_tier || p.subscription_tier === 'free') return false;
      if (!p.subscription_expires_at) return false;
      const d = new Date(p.subscription_expires_at);
      return !isNaN(d.getTime()) && d < now;
    });
  }, [scopedProfiles]);

  // Monthly trend: count cancellations/lapses that fall in each bucket.
  const chartData = useMemo(() => {
    return buckets.map(b => {
      const v = canceledVenues.filter(x => {
        const d = new Date(x.billing_status_updated_at || 0);
        return !isNaN(d.getTime()) && d >= b.start && d <= b.end;
      }).length;
      const c = lapsedConsumers.filter(x => {
        const d = new Date(x.subscription_expires_at || 0);
        return !isNaN(d.getTime()) && d >= b.start && d <= b.end;
      }).length;
      return { month: b.label, venues: v, consumers: c };
    });
  }, [buckets, canceledVenues, lapsedConsumers]);

  // Churn rate = churned / (active paid + churned) for each group.
  const activePaidVenues = scopedVenues.filter(v => v.subscription_tier === 'premium' || v.subscription_tier === 'platinum').length;
  const activePremiumConsumers = scopedProfiles.filter(p => p.is_premium && p.subscription_tier && p.subscription_tier !== 'free').length;

  const venueChurnRate = activePaidVenues + canceledVenues.length > 0
    ? Math.round((canceledVenues.length / (activePaidVenues + canceledVenues.length)) * 100) : 0;
  const consumerChurnRate = activePremiumConsumers + lapsedConsumers.length > 0
    ? Math.round((lapsedConsumers.length / (activePremiumConsumers + lapsedConsumers.length)) * 100) : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-6 h-6 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <TrendingDown className="w-5 h-5 text-red-500" />
        <h2 className="text-xl font-heading font-bold">Churn Tracking</h2>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard icon={Store} value={`${venueChurnRate}%`} label="Venue Churn Rate" tone="red" />
        <StatCard icon={Store} value={canceledVenues.length} label="Canceled Venues" tone="amber" />
        <StatCard icon={Users} value={`${consumerChurnRate}%`} label="Consumer Churn Rate" tone="red" />
        <StatCard icon={Users} value={lapsedConsumers.length} label="Lapsed Consumers" tone="amber" />
      </div>

      {/* Trend chart */}
      <div className="bg-card border border-border rounded-xl p-4">
        <h3 className="text-sm font-semibold mb-1">Churn Trend — Last {MONTHS_BACK} Months</h3>
        <p className="text-xs text-muted-foreground mb-4">Cancellations and lapsed subscriptions by month</p>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
            <Tooltip contentStyle={{ fontSize: 12 }} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="venues" name="Venues" fill="#ef4444" radius={[4, 4, 0, 0]} />
            <Bar dataKey="consumers" name="Consumers" fill="#f59e0b" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Detail lists */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Canceled venues */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center gap-2">
            <Store className="w-4 h-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Canceled Venues ({canceledVenues.length})</h3>
          </div>
          {canceledVenues.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8">No canceled venues.</p>
          ) : (
            <div className="divide-y divide-border/50 max-h-80 overflow-y-auto">
              {canceledVenues
                .sort((a, b) => new Date(b.billing_status_updated_at || 0) - new Date(a.billing_status_updated_at || 0))
                .map(v => (
                  <div key={v.id} className="px-4 py-3 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{v.name}</p>
                      {(v.city || v.market_name) && (
                        <p className="text-xs text-muted-foreground truncate">{[v.city, v.market_name].filter(Boolean).join(' · ')}</p>
                      )}
                    </div>
                    {v.billing_status_updated_at && (
                      <p className="text-xs text-muted-foreground shrink-0">{format(new Date(v.billing_status_updated_at), 'MMM d, yyyy')}</p>
                    )}
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* Lapsed consumers */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center gap-2">
            <Users className="w-4 h-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Lapsed Consumers ({lapsedConsumers.length})</h3>
          </div>
          {lapsedConsumers.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8">No lapsed consumers.</p>
          ) : (
            <div className="divide-y divide-border/50 max-h-80 overflow-y-auto">
              {lapsedConsumers
                .sort((a, b) => new Date(b.subscription_expires_at || 0) - new Date(a.subscription_expires_at || 0))
                .map(p => (
                  <div key={p.id} className="px-4 py-3 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{p.display_name || '—'}</p>
                      <p className="text-xs text-muted-foreground truncate">{p.email}</p>
                    </div>
                    {p.subscription_expires_at && (
                      <p className="text-xs text-muted-foreground shrink-0">Lapsed {format(new Date(p.subscription_expires_at), 'MMM d, yyyy')}</p>
                    )}
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>

      <p className="text-xs text-muted-foreground flex items-start gap-1.5">
        <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
        Venue churn is based on canceled billing status; consumer churn is based on premium subscriptions whose expiration date has passed.
      </p>
    </div>
  );
}