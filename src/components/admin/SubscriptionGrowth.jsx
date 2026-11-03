import { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Crown, TrendingUp, Users, Star } from 'lucide-react';
import { format, subDays, startOfDay } from 'date-fns';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { useAdminLocation, profileInTerritory, hasTerritory } from '@/lib/AdminLocationContext';

const PAGE_SIZE = 20;

export default function SubscriptionGrowth() {
  const { locationFilter } = useAdminLocation();
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    base44.entities.Profile.list()
      .then(p => setProfiles(p || []))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const scopedProfiles = useMemo(() =>
    hasTerritory(locationFilter) ? profiles.filter(p => profileInTerritory(p, locationFilter)) : profiles,
  [profiles, locationFilter]);

  const premiumProfiles = useMemo(() =>
    scopedProfiles.filter(p => p.subscription_tier && p.subscription_tier !== 'free' && p.is_premium),
  [scopedProfiles]);

  const tierCounts = useMemo(() => {
    const counts = {};
    scopedProfiles.forEach(p => {
      if (p.subscription_tier && p.subscription_tier !== 'free' && p.is_premium) {
        counts[p.subscription_tier] = (counts[p.subscription_tier] || 0) + 1;
      }
    });
    return counts;
  }, [profiles]);

  // Build last-30-days chart data from subscription_expires_at or created_date as proxy
  const chartData = useMemo(() => {
    const today = startOfDay(new Date());
    const days = Array.from({ length: 30 }, (_, i) => {
      const d = subDays(today, 29 - i);
      return { date: format(d, 'MMM d'), count: 0, key: format(d, 'yyyy-MM-dd') };
    });
    premiumProfiles.forEach(p => {
      const raw = p.created_date;
      if (!raw) return;
      const d = new Date(raw);
      if (isNaN(d.getTime())) return;
      const key = format(d, 'yyyy-MM-dd');
      const day = days.find(d => d.key === key);
      if (day) day.count++;
    });
    return days;
  }, [premiumProfiles]);

  useEffect(() => { setPage(1); }, [locationFilter]);

  const totalPages = Math.ceil(premiumProfiles.length / PAGE_SIZE);
  const paginated = premiumProfiles.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-4 border-amber-200 border-t-amber-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        <p className="text-sm text-destructive">Failed to load subscription data: {error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
            <Crown className="w-4 h-4 text-amber-600" />
          </div>
          <div>
            <p className="text-2xl font-bold">{premiumProfiles.length}</p>
            <p className="text-xs text-muted-foreground">Total Subscribers</p>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
            <Users className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <p className="text-2xl font-bold">{scopedProfiles.length}</p>
            <p className="text-xs text-muted-foreground">Total Users</p>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-green-100 flex items-center justify-center flex-shrink-0">
            <TrendingUp className="w-4 h-4 text-green-600" />
          </div>
          <div>
            <p className="text-2xl font-bold">
              {scopedProfiles.length > 0 ? Math.round((premiumProfiles.length / scopedProfiles.length) * 100) : 0}%
            </p>
            <p className="text-xs text-muted-foreground">Conversion Rate</p>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-purple-100 flex items-center justify-center flex-shrink-0">
            <Star className="w-4 h-4 text-purple-600" />
          </div>
          <div>
            <p className="text-2xl font-bold">{tierCounts['platinum'] || 0}</p>
            <p className="text-xs text-muted-foreground">Platinum</p>
          </div>
        </div>
      </div>

      {/* Tier breakdown */}
      {Object.keys(tierCounts).length > 0 && (
        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="text-sm font-semibold mb-3">Tier Breakdown</h3>
          <div className="flex gap-4 flex-wrap">
            {Object.entries(tierCounts).map(([tier, count]) => (
              <div key={tier} className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
                <span className="text-sm capitalize font-medium">{tier}</span>
                <span className="text-sm text-muted-foreground">({count})</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Growth chart */}
      <div className="bg-card border border-border rounded-xl p-4">
        <h3 className="text-sm font-semibold mb-1">Subscriber Signups — Last 30 Days</h3>
        <p className="text-xs text-muted-foreground mb-4">Premium users by account creation date</p>
        {premiumProfiles.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-10">No premium subscribers yet.</p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="subGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={4} />
              <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
              <Tooltip contentStyle={{ fontSize: 12 }} formatter={(v) => [v, 'Subscribers']} />
              <Area type="monotone" dataKey="count" stroke="#f59e0b" strokeWidth={2} fill="url(#subGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Subscriber list */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <h3 className="text-sm font-semibold">Active Subscribers</h3>
          <p className="text-xs text-muted-foreground">{premiumProfiles.length} premium users</p>
        </div>
        {premiumProfiles.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-10">No premium subscribers yet.</p>
        ) : (
          <>
            <div className="divide-y divide-border/50">
              {paginated.map((profile) => (
                <div key={profile.id} className="px-4 py-3 flex items-center gap-3 hover:bg-muted/20 transition-colors">
                  <div className="w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                    <Crown className="w-3.5 h-3.5 text-amber-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{profile.display_name || '—'}</p>
                    <p className="text-xs text-muted-foreground truncate">{profile.email}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium capitalize">
                      {profile.subscription_tier || 'premium'}
                    </span>
                    {profile.subscription_expires_at && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Expires {(() => {
                          const d = new Date(profile.subscription_expires_at);
                          return isNaN(d.getTime()) ? '—' : format(d, 'MMM d, yyyy');
                        })()}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-border">
                <p className="text-xs text-muted-foreground">{premiumProfiles.length} total</p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="text-xs px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-muted disabled:opacity-40 transition-colors"
                  >
                    ← Prev
                  </button>
                  <span className="text-xs text-muted-foreground">Page {page} of {totalPages}</span>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="text-xs px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-muted disabled:opacity-40 transition-colors"
                  >
                    Next →
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}