import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useAdminLocation, venueInTerritory, hasTerritory } from '@/lib/AdminLocationContext';

const TIER_COLORS = { free: '#94a3b8', premium: '#f59e0b', platinum: '#8b5cf6' };

export default function VenuePerformanceCharts({ onDrillDown }) {
  const { locationFilter } = useAdminLocation();
  const [allVenues, setAllVenues] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      base44.entities.Venue.list(),
      base44.entities.Favorite.list(),
    ]).then(([v, f]) => {
      setAllVenues(v);
      setFavorites(f);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  const venues = hasTerritory(locationFilter)
    ? allVenues.filter(v => venueInTerritory(v, locationFilter))
    : allVenues;

  // Build a set of valid venue IDs (only active/pending venues, not deleted)
  const validVenueIds = new Set(venues.map(v => v.id));
  
  // Count favorites per venue from the Favorite entity (source of truth)
  // Only count favorites for venues that still exist
  const favCountByVenueId = {};
  for (const f of favorites) {
    const vid = f.venue_id;
    if (vid && validVenueIds.has(vid)) {
      favCountByVenueId[vid] = (favCountByVenueId[vid] || 0) + 1;
    }
  }

  // Aggregate by tier
  const tierMap = {};
  for (const v of venues) {
    const t = v.subscription_tier || 'free';
    if (!tierMap[t]) tierMap[t] = { tier: t, venues: 0, views: 0, favorites: 0 };
    tierMap[t].venues++;
    tierMap[t].views += v.view_count || 0;
    tierMap[t].favorites += favCountByVenueId[v.id] || 0;
  }
  const tierData = Object.values(tierMap).sort((a, b) => ['free','premium','platinum'].indexOf(a.tier) - ['free','premium','platinum'].indexOf(b.tier));

  // Top 10 venues by favorites (live count)
  const topByViews = [...venues].sort((a, b) => (favCountByVenueId[b.id] || 0) - (favCountByVenueId[a.id] || 0)).slice(0, 10).map(v => ({
    name: v.name?.length > 18 ? v.name.slice(0, 18) + '…' : v.name,
    views: v.view_count || 0,
    favorites: favCountByVenueId[v.id] || 0,
    tier: v.subscription_tier || 'free',
  }));

  // Top venues by views for each tier
  const topByTier = {};
  ['free', 'premium', 'platinum'].forEach(tier => {
    topByTier[tier] = [...venues]
      .filter(v => (v.subscription_tier || 'free') === tier)
      .sort((a, b) => (b.view_count || 0) - (a.view_count || 0))
      .slice(0, 5)
      .map(v => ({
        id: v.id,
        name: v.name || 'Unnamed',
        views: v.view_count || 0,
        favorites: favCountByVenueId[v.id] || 0,
        tier,
      }));
  });

  // Venue count by tier for pie
  const pieData = tierData.map(t => ({ name: t.tier, value: t.venues }));

  return (
    <div className="space-y-8">
      <h2 className="text-lg font-heading font-bold">Venue Performance</h2>

      {/* Tier summary cards */}
      <div className="grid grid-cols-3 gap-4">
        {tierData.map(t => (
          <div key={t.tier} className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-3 h-3 rounded-full" style={{ background: TIER_COLORS[t.tier] }} />
              <span className="font-semibold capitalize">{t.tier}</span>
              <span className="ml-auto text-xs text-muted-foreground">{t.venues} venues</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-center">
              <div>
                <p className="text-xl font-bold">{t.views.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Total Views</p>
              </div>
              <div>
                <p className="text-xl font-bold">{t.favorites.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Favorites</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Views & Favorites by tier bar chart */}
      <div className="bg-card border border-border rounded-xl p-4">
        <h3 className="text-sm font-semibold mb-4">Views & Favorites by Tier</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={tierData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="tier" tick={{ fontSize: 12, textTransform: 'capitalize' }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Legend />
            <Bar dataKey="views" name="Views" fill="#f59e0b" radius={[4,4,0,0]} />
            <Bar dataKey="favorites" name="Favorites" fill="#8b5cf6" radius={[4,4,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Venue count by tier pie */}
        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="text-sm font-semibold mb-4">Venue Count by Tier</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} label={({ name, value }) => `${name} (${value})`}>
                {pieData.map(entry => (
                  <Cell key={entry.name} fill={TIER_COLORS[entry.name] || '#94a3b8'} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Top 10 venues by favorites */}
        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="text-sm font-semibold mb-4">Top 10 Venues by Favorites</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={topByViews} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" tick={{ fontSize: 10 }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={100} />
              <Tooltip />
              <Bar dataKey="favorites" name="Favorites" fill="#8b5cf6" radius={[0,4,4,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top venues by views per tier */}
      <div className="space-y-6">
        <h3 className="text-sm font-semibold">Top Venues by Views per Tier</h3>
        <div className="grid grid-cols-3 gap-4">
          {['free', 'premium', 'platinum'].map(tier => (
            <div key={tier} className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-3 h-3 rounded-full" style={{ background: TIER_COLORS[tier] }} />
                <span className="font-semibold capitalize">{tier}</span>
                <span className="ml-auto text-xs text-muted-foreground">{topByTier[tier].length} venues</span>
              </div>
              {topByTier[tier].length === 0 ? (
                <p className="text-xs text-muted-foreground">No venues in this tier</p>
              ) : (
                <div className="space-y-2">
                  {topByTier[tier].map((v, idx) => (
                    <div 
                      key={v.id} 
                      className="flex items-center justify-between text-xs cursor-pointer hover:bg-accent/50 rounded px-2 py-1 transition-colors"
                      onClick={() => onDrillDown?.('venues')}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground w-4">{idx + 1}.</span>
                        <span className="font-medium truncate max-w-[120px]">{v.name}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-muted-foreground">{v.views} views</span>
                        <span className="text-muted-foreground">{v.favorites} ♥</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}