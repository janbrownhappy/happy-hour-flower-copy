import { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { subDays } from 'date-fns';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { Eye, Heart, Star, TrendingUp, ChevronUp, ChevronDown, ArrowUpDown, MapPin, X, Pencil, DollarSign, RefreshCw } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { base44 as b44 } from '@/api/base44Client';
import VenueForm from '@/components/admin/VenueForm';
import SystemStatus from '@/components/admin/SystemStatus';
import { useAdminLocation, venueInTerritory } from '@/lib/AdminLocationContext';

const COLORS = ['#d97706', '#f59e0b', '#fbbf24', '#92400e', '#b45309', '#fcd34d', '#78350f', '#6b7280'];

function StatCard({ icon: Icon, label, value, color = 'text-primary' }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
        <Icon className={`w-5 h-5 ${color}`} />
      </div>
      <div>
        <p className="text-2xl font-bold">{value.toLocaleString()}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

function SortHeader({ label, field, sortField, sortDir, onSort }) {
  const active = sortField === field;
  return (
    <button
      onClick={() => onSort(field)}
      className="flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
    >
      {label}
      {active ? (
        sortDir === 'desc' ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />
      ) : (
        <ArrowUpDown className="w-3 h-3 opacity-40" />
      )}
    </button>
  );
}

export default function AdminAnalytics() {
  const [venues, setVenues] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [areas, setAreas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortField, setSortField] = useState('views');
  const [sortDir, setSortDir] = useState('desc');
  const [page, setPage] = useState(1);
  const [categoryDrill, setCategoryDrill] = useState(null); // { name, venues[] }
  const [editingVenue, setEditingVenue] = useState(null);
  const [mrr, setMrr] = useState(null); // { mrr, currency, active_subscriptions } | 'error' | null
  const { locationFilter } = useAdminLocation();
  const [refreshing, setRefreshing] = useState(false);
  const PAGE_SIZE = 15;

  const handleRefresh = () => {
    setRefreshing(true);
    loadData().finally(() => setRefreshing(false));
  };

  useEffect(() => {
    base44.functions.invoke('getStripeMRR', {})
      .then(res => setMrr(res?.data?.error ? 'error' : res.data))
      .catch(() => setMrr('error'));
  }, []);

  const loadData = () => {
    return Promise.all([
      base44.entities.Venue.list('-view_count', 500),
      base44.entities.Favorite.list(),
      base44.entities.Review.list(),
      base44.entities.LocationArea.list(),
    ]).then(([v, f, r, a]) => {
      setVenues(v);
      setFavorites(f);
      setReviews(r);
      setAreas(a);
    });
  };

  useEffect(() => {
    loadData().finally(() => setLoading(false));
  }, []);

  // Enrich venues with live favorite count from Favorite entity
  const enrichedVenues = useMemo(() => {
    const favCountByVenue = {};
    favorites.forEach(fav => {
      const vid = String(fav.venue_id);
      favCountByVenue[vid] = (favCountByVenue[vid] || 0) + 1;
    });
    const reviewCountByVenue = {};
    reviews.forEach(r => {
      const vid = String(r.venue_id);
      reviewCountByVenue[vid] = (reviewCountByVenue[vid] || 0) + 1;
    });
    const inTerritory = (v) => venueInTerritory(v, locationFilter);
    return venues.filter(inTerritory).map(v => ({
      ...v,
      live_favorites: favCountByVenue[String(v.id)] || v.favorite_count || 0,
      live_reviews: reviewCountByVenue[String(v.id)] || 0,
      views: v.view_count || 0,
    }));
  }, [venues, favorites, reviews, locationFilter]);

  const totalViews = useMemo(() => enrichedVenues.reduce((s, v) => s + v.views, 0), [enrichedVenues]);
  const totalFavorites = useMemo(() => enrichedVenues.reduce((s, v) => s + v.live_favorites, 0), [enrichedVenues]);
  const totalReviews = useMemo(() => enrichedVenues.reduce((s, v) => s + v.live_reviews, 0), [enrichedVenues]);
  const activeVenuesCount = useMemo(() => enrichedVenues.filter(v => v.status === 'active').length, [enrichedVenues]);

  // Sorted table data
  const sorted = useMemo(() => {
    return [...enrichedVenues].sort((a, b) => {
      const aVal = sortField === 'views' ? a.views : sortField === 'favorites' ? a.live_favorites : a.live_reviews;
      const bVal = sortField === 'views' ? b.views : sortField === 'favorites' ? b.live_favorites : b.live_reviews;
      return sortDir === 'desc' ? bVal - aVal : aVal - bVal;
    });
  }, [enrichedVenues, sortField, sortDir]);

  const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
  const paginated = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Reset to page 1 whenever the territory filter changes
  useEffect(() => { setPage(1); }, [locationFilter]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    } else {
      setSortField(field);
      setSortDir('desc');
      setPage(1);
    }
  };

  // Last 30 days: favorites per venue
  const thirtyDaysAgo = useMemo(() => subDays(new Date(), 30), []);

  const recentFavsByVenue = useMemo(() => {
    const map = {};
    favorites.forEach(f => {
      if (f.created_date && new Date(f.created_date) >= thirtyDaysAgo) {
        const vid = String(f.venue_id);
        map[vid] = (map[vid] || 0) + 1;
      }
    });
    return map;
  }, [favorites, thirtyDaysAgo]);

  // Combined score: views (all time, since we don't have timestamped view data) + recent favs weighted
  const topVenuesLastMonth = useMemo(() => {
    return [...enrichedVenues]
      .map(v => ({
        name: v.name?.length > 16 ? v.name.slice(0, 16) + '…' : v.name,
        views: v.views,
        recentFavorites: recentFavsByVenue[String(v.id)] || 0,
      }))
      .filter(v => v.views > 0 || v.recentFavorites > 0)
      .sort((a, b) => (b.views + b.recentFavorites * 10) - (a.views + a.recentFavorites * 10))
      .slice(0, 15);
  }, [enrichedVenues, recentFavsByVenue]);

  // Top 10 by views for bar chart
  const topByViews = useMemo(() =>
    [...enrichedVenues]
      .sort((a, b) => b.views - a.views)
      .slice(0, 10)
      .map(v => ({ name: v.name?.length > 14 ? v.name.slice(0, 14) + '…' : v.name, views: v.views, favorites: v.live_favorites })),
    [enrichedVenues]
  );

  // Top 10 by favorites for bar chart
  const topByFavorites = useMemo(() =>
    [...enrichedVenues]
      .sort((a, b) => b.live_favorites - a.live_favorites)
      .slice(0, 10)
      .map(v => ({ name: v.name?.length > 14 ? v.name.slice(0, 14) + '…' : v.name, favorites: v.live_favorites })),
    [enrichedVenues]
  );

  // Area breakdown — group by the venue's area, falling back to market then legacy neighborhood
  const areaData = useMemo(() => {
    const areaNameById = {};
    areas.forEach(a => { if (a.area_id) areaNameById[a.area_id] = a.area_name; });
    const map = {};
    enrichedVenues.forEach(v => {
      const label =
        (v.area && areaNameById[v.area]) ||
        v.market_name ||
        v.neighborhood?.replace(/^[A-Z]+-\d+\s*/, '') ||
        'Unknown';
      if (!map[label]) map[label] = { name: label, views: 0, favorites: 0, count: 0 };
      map[label].views += v.views;
      map[label].favorites += v.live_favorites;
      map[label].count++;
    });
    return Object.values(map).sort((a, b) => b.views - a.views);
  }, [enrichedVenues, areas]);

  // Human-readable Area label for a single venue (used in tables/lists)
  const areaNameById = useMemo(() => {
    const m = {};
    areas.forEach(a => { if (a.area_id) m[a.area_id] = a.area_name; });
    return m;
  }, [areas]);
  const venueAreaLabel = (v) =>
    (v.area && areaNameById[v.area]) ||
    v.market_name ||
    v.neighborhood?.replace(/^[A-Z]+-\d+\s*/, '') ||
    null;

  // Category pie
  const categoryData = useMemo(() => {
    const map = {};
    enrichedVenues.forEach(v => {
      const cat = v.category || 'Uncategorized';
      map[cat] = (map[cat] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [enrichedVenues]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-4 border-amber-200 border-t-amber-500 rounded-full animate-spin" />
      </div>
    );
  }

  const fmtCurrency = (amt, cur) => amt.toLocaleString('en-US', { style: 'currency', currency: (cur || 'usd').toUpperCase() });
  const mrrValue = mrr && mrr !== 'error' ? fmtCurrency(mrr.mrr, mrr.currency) : null;
  const arrValue = mrr && mrr !== 'error' ? fmtCurrency(mrr.mrr * 12, mrr.currency) : null;

  return (
    <div className="space-y-6">

      {/* Refresh — the territory filter now lives at the top of the Admin dashboard */}
      <div className="flex justify-end">
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border bg-card hover:bg-muted text-sm font-medium transition-colors disabled:opacity-50"
          title="Reload latest venue data"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard icon={Eye} label="Total Views" value={totalViews} />
        <StatCard icon={Heart} label="Total Favorites" value={totalFavorites} color="text-rose-500" />
        <StatCard icon={Star} label="Total Reviews" value={totalReviews} color="text-amber-500" />
        <StatCard icon={TrendingUp} label="Active Venues" value={activeVenuesCount} color="text-green-500" />
      </div>

      {/* Revenue cards — live from Stripe */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Monthly Recurring Revenue */}
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center flex-shrink-0">
            <DollarSign className="w-5 h-5 text-green-600" />
          </div>
          <div className="flex-1">
            {mrr === null ? (
              <p className="text-2xl font-bold text-muted-foreground animate-pulse">…</p>
            ) : mrr === 'error' ? (
              <p className="text-sm font-medium text-muted-foreground">Unable to load</p>
            ) : (
              <p className="text-2xl font-bold">{mrrValue}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Monthly Recurring Revenue
              {mrr && mrr !== 'error' && (
                <span> · {mrr.active_subscriptions} active {mrr.active_subscriptions === 1 ? 'subscription' : 'subscriptions'}</span>
              )}
            </p>
          </div>
        </div>

        {/* Annual Recurring Revenue */}
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
            <TrendingUp className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="flex-1">
            {mrr === null ? (
              <p className="text-2xl font-bold text-muted-foreground animate-pulse">…</p>
            ) : mrr === 'error' ? (
              <p className="text-sm font-medium text-muted-foreground">Unable to load</p>
            ) : (
              <p className="text-2xl font-bold">{arrValue}</p>
            )}
            <p className="text-xs text-muted-foreground">Annual Recurring Revenue · MRR × 12</p>
          </div>
        </div>
      </div>

      {/* System Status */}
      <SystemStatus />

      {/* Top venues — last 30 days combined ranking */}
      <div className="bg-card border border-border rounded-xl p-4">
        <h3 className="text-sm font-semibold mb-1">🏆 Top Venues — Last 30 Days</h3>
        <p className="text-xs text-muted-foreground mb-4">Ranked by total views + recent favorites (new favorites in last 30 days)</p>
        {topVenuesLastMonth.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-8">No activity data yet</p>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={topVenuesLastMonth} margin={{ top: 4, right: 8, left: -16, bottom: 55 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-35} textAnchor="end" interval={0} />
              <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
              <Tooltip contentStyle={{ fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="views" name="Total Views" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="recentFavorites" name="New Favorites (30d)" fill="#f43f5e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Top venues by views */}
      <div className="bg-card border border-border rounded-xl p-4">
        <h3 className="text-sm font-semibold mb-1">Top Venues by Views</h3>
        <p className="text-xs text-muted-foreground mb-4">Total page views per venue (top 10)</p>
        {topByViews.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-8">No view data yet</p>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={topByViews} margin={{ top: 4, right: 8, left: -16, bottom: 50 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-35} textAnchor="end" interval={0} />
              <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
              <Tooltip contentStyle={{ fontSize: 12 }} />
              <Bar dataKey="views" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Views" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Top venues by favorites */}
      <div className="bg-card border border-border rounded-xl p-4">
        <h3 className="text-sm font-semibold mb-1">Top Venues by Favorites</h3>
        <p className="text-xs text-muted-foreground mb-4">How many users favorited each venue (top 10)</p>
        {topByFavorites.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-8">No favorites data yet</p>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={topByFavorites} margin={{ top: 4, right: 8, left: -16, bottom: 50 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-35} textAnchor="end" interval={0} />
              <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
              <Tooltip contentStyle={{ fontSize: 12 }} />
              <Bar dataKey="favorites" fill="#f43f5e" radius={[4, 4, 0, 0]} name="Favorites" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Area Traffic Chart */}
      {areaData.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-4 space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <MapPin className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-semibold">Area Traffic</h3>
              <p className="text-xs text-muted-foreground">Views &amp; favorites grouped by area</p>
            </div>
          </div>

          {/* Grouped bar chart */}
          <ResponsiveContainer width="100%" height={Math.max(240, areaData.length * 44)}>
            <BarChart data={areaData} layout="vertical" margin={{ top: 4, right: 60, left: 8, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={140} />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8 }}
                formatter={(val, name) => [val.toLocaleString(), name]}
              />
              <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
              <Bar dataKey="views" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} name="Views" barSize={14} />
              <Bar dataKey="favorites" fill="#f43f5e" radius={[0, 4, 4, 0]} name="Favorites" barSize={14} />
            </BarChart>
          </ResponsiveContainer>

          {/* Summary table */}
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-muted/40 border-b border-border">
                  <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Area</th>
                  <th className="px-3 py-2 font-semibold text-muted-foreground text-center">Venues</th>
                  <th className="px-3 py-2 font-semibold text-muted-foreground text-center">Views</th>
                  <th className="px-3 py-2 font-semibold text-muted-foreground text-center">Favorites</th>
                  <th className="px-3 py-2 font-semibold text-muted-foreground text-center">Avg Views / Venue</th>
                </tr>
              </thead>
              <tbody>
                {areaData.map((hood, i) => (
                  <tr key={hood.name} className={`border-b border-border/50 ${i % 2 === 0 ? '' : 'bg-muted/10'}`}>
                    <td className="px-3 py-2 font-medium">{hood.name}</td>
                    <td className="px-3 py-2 text-center text-muted-foreground">{hood.count}</td>
                    <td className="px-3 py-2 text-center font-semibold">{hood.views.toLocaleString()}</td>
                    <td className="px-3 py-2 text-center font-semibold text-rose-500">{hood.favorites.toLocaleString()}</td>
                    <td className="px-3 py-2 text-center text-muted-foreground">
                      {hood.count > 0 ? Math.round(hood.views / hood.count).toLocaleString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Category distribution — horizontal bar chart with drill-down */}
      <div className="bg-card border border-border rounded-xl p-4">
        <h3 className="text-sm font-semibold mb-1">Venue Categories</h3>
        <p className="text-xs text-muted-foreground mb-4">Click any bar to see venues of that type</p>
        <div className="space-y-1.5">
          {categoryData.map((cat, i) => {
            const max = categoryData[0]?.value || 1;
            const pct = Math.round((cat.value / max) * 100);
            return (
              <button
                key={cat.name}
                onClick={() => setCategoryDrill({ name: cat.name, venues: enrichedVenues.filter(v => (v.category || 'Uncategorized') === cat.name) })}
                className="w-full flex items-center gap-3 group text-left hover:bg-muted/40 rounded-lg px-2 py-1 transition-colors"
              >
                <span className="text-xs text-muted-foreground w-36 truncate flex-shrink-0 group-hover:text-foreground transition-colors">{cat.name}</span>
                <div className="flex-1 h-5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${pct}%`, backgroundColor: COLORS[i % COLORS.length] }}
                  />
                </div>
                <span className="text-xs font-semibold w-6 text-right flex-shrink-0">{cat.value}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Category drill-down dialog */}
      <Dialog open={!!categoryDrill} onOpenChange={() => setCategoryDrill(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{categoryDrill?.name} <span className="text-muted-foreground font-normal text-sm">({categoryDrill?.venues.length} venues)</span></DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto space-y-2 pr-1">
            {categoryDrill?.venues.sort((a, b) => b.views - a.views).map(v => (
              <div key={v.id} className="flex items-center justify-between border border-border rounded-lg px-3 py-2.5 bg-card">
                <div>
                  <p className="text-sm font-semibold">{v.name}</p>
                  <p className="text-xs text-muted-foreground">{venueAreaLabel(v) || v.city || '—'}</p>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground flex-shrink-0">
                  <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{(v.views || 0).toLocaleString()}</span>
                  <span className="flex items-center gap-1 text-rose-500"><Heart className="w-3 h-3" />{(v.live_favorites || 0).toLocaleString()}</span>
                  <span className={`px-2 py-0.5 rounded-full font-semibold ${v.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-muted text-muted-foreground'}`}>{v.status || 'active'}</span>
                  <button
                    onClick={() => setEditingVenue(v)}
                    className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                    title="Edit venue"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit venue dialog */}
      <Dialog open={!!editingVenue} onOpenChange={() => setEditingVenue(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {editingVenue && (
            <VenueForm
              venue={editingVenue}
              onCancel={() => setEditingVenue(null)}
              onSave={async (data) => {
                await base44.entities.Venue.update(editingVenue.id, data);
                // Update in categoryDrill list
                setCategoryDrill(prev => prev ? {
                  ...prev,
                  venues: prev.venues.map(v => v.id === editingVenue.id ? { ...v, ...data } : v)
                } : prev);
                setVenues(prev => prev.map(v => v.id === editingVenue.id ? { ...v, ...data } : v));
                setEditingVenue(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Full sortable venue table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-4 pt-4 pb-2">
          <h3 className="text-sm font-semibold">All Venues — Traffic Breakdown</h3>
          <p className="text-xs text-muted-foreground">Click column headers to sort</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Venue</th>
                <th className="px-4 py-2.5">
                  <SortHeader label="Views" field="views" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                </th>
                <th className="px-4 py-2.5">
                  <SortHeader label="Favorites" field="favorites" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                </th>
                <th className="px-4 py-2.5">
                  <SortHeader label="Reviews" field="reviews" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                </th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((venue, i) => (
                <tr key={venue.id} className={`border-b border-border/50 hover:bg-muted/20 transition-colors ${i % 2 === 0 ? '' : 'bg-muted/10'}`}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-sm">{venue.name}</p>
                    <p className="text-xs text-muted-foreground">{venueAreaLabel(venue) || venue.category || '—'}</p>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="font-semibold">{venue.views.toLocaleString()}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="font-semibold text-rose-500">{venue.live_favorites.toLocaleString()}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="font-semibold text-amber-500">{venue.live_reviews}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      venue.status === 'active' ? 'bg-green-100 text-green-700' :
                      venue.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                      'bg-muted text-muted-foreground'
                    }`}>
                      {venue.status || 'active'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <p className="text-xs text-muted-foreground">{sorted.length} venues total</p>
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
      </div>

    </div>
  );
}