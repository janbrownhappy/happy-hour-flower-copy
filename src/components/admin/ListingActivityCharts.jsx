import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, AreaChart, Area
} from 'recharts';
import { Eye, Heart, TrendingUp, List } from 'lucide-react';
import { format, subDays, parseISO, startOfDay } from 'date-fns';

export default function ListingActivityCharts() {
  const [venues, setVenues] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      base44.entities.Venue.list(),
      base44.entities.Favorite.list(),
      base44.entities.Listing.list(),
    ]).then(([v, f, l]) => {
      setVenues(v);
      setFavorites(f);
      setListings(l);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  // Build venue lookup by id
  const venueById = Object.fromEntries(venues.map(v => [v.id, v]));

  // Count favorites per venue
  const favByVenueId = {};
  for (const f of favorites) {
    if (f.venue_id) favByVenueId[f.venue_id] = (favByVenueId[f.venue_id] || 0) + 1;
  }

  // Enrich listings with venue views & favorites
  const enriched = listings.map(l => {
    const venue = venueById[l.venue_ref_id] || null;
    return {
      ...l,
      venueName: l.venue_name || venue?.name || 'Unknown Venue',
      views: venue?.view_count || 0,
      favorites: favByVenueId[l.venue_ref_id] || 0,
    };
  });

  // Top 10 listings by venue views
  const topByViews = [...enriched]
    .sort((a, b) => b.views - a.views)
    .slice(0, 10)
    .map(l => ({
      name: l.name?.length > 22 ? l.name.slice(0, 22) + '…' : (l.name || 'Unnamed'),
      venue: l.venueName,
      views: l.views,
      favorites: l.favorites,
    }));

  // Top 10 listings by venue favorites
  const topByFavs = [...enriched]
    .sort((a, b) => b.favorites - a.favorites)
    .slice(0, 10)
    .map(l => ({
      name: l.name?.length > 22 ? l.name.slice(0, 22) + '…' : (l.name || 'Unnamed'),
      venue: l.venueName,
      views: l.views,
      favorites: l.favorites,
    }));

  // Listings created over last 30 days (daily buckets)
  const today = startOfDay(new Date());
  const dailyBuckets = {};
  for (let i = 29; i >= 0; i--) {
    const d = format(subDays(today, i), 'MMM d');
    dailyBuckets[d] = { date: d, listings: 0, approved: 0 };
  }
  for (const l of listings) {
    if (!l.created_date) continue;
    try {
      const d = format(startOfDay(parseISO(l.created_date)), 'MMM d');
      if (dailyBuckets[d]) {
        dailyBuckets[d].listings++;
        if (l.status === 'approved') dailyBuckets[d].approved++;
      }
    } catch {}
  }
  const timelineData = Object.values(dailyBuckets);

  // Favorites created over last 30 days
  const favBuckets = {};
  for (let i = 29; i >= 0; i--) {
    const d = format(subDays(today, i), 'MMM d');
    favBuckets[d] = { date: d, favorites: 0 };
  }
  for (const f of favorites) {
    if (!f.created_date) continue;
    try {
      const d = format(startOfDay(parseISO(f.created_date)), 'MMM d');
      if (favBuckets[d]) favBuckets[d].favorites++;
    } catch {}
  }
  const favTimeline = Object.values(favBuckets);

  // Summary stats
  const totalViews = venues.reduce((s, v) => s + (v.view_count || 0), 0);
  const totalFavs = favorites.length;
  const approvedListings = listings.filter(l => l.status === 'approved').length;
  const premiumExclusive = listings.filter(l => l.is_premium_exclusive).length;

  const statCards = [
    { label: 'Total Listings', value: listings.length, icon: <List className="w-4 h-4" />, color: 'text-blue-500' },
    { label: 'Approved', value: approvedListings, icon: <TrendingUp className="w-4 h-4" />, color: 'text-green-500' },
    { label: 'Total Venue Views', value: totalViews.toLocaleString(), icon: <Eye className="w-4 h-4" />, color: 'text-amber-500' },
    { label: 'Total Favorites', value: totalFavs.toLocaleString(), icon: <Heart className="w-4 h-4" />, color: 'text-rose-500' },
  ];

  return (
    <div className="space-y-8">
      <h2 className="text-lg font-heading font-bold">Listing Activity</h2>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-4">
        {statCards.map(c => (
          <div key={c.label} className="bg-card border border-border rounded-xl p-4">
            <div className={`flex items-center gap-2 mb-1 ${c.color}`}>
              {c.icon}
              <span className="text-xs font-medium text-muted-foreground">{c.label}</span>
            </div>
            <p className="text-2xl font-bold">{c.value}</p>
          </div>
        ))}
      </div>

      {/* Listings submitted over time */}
      <div className="bg-card border border-border rounded-xl p-4">
        <h3 className="text-sm font-semibold mb-4">Listings Submitted (Last 30 Days)</h3>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={timelineData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={4} />
            <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
            <Tooltip />
            <Legend />
            <Area type="monotone" dataKey="listings" name="Submitted" stroke="#f59e0b" fill="#fef3c7" strokeWidth={2} />
            <Area type="monotone" dataKey="approved" name="Approved" stroke="#10b981" fill="#d1fae5" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Favorites over time */}
      <div className="bg-card border border-border rounded-xl p-4">
        <h3 className="text-sm font-semibold mb-4">New Favorites (Last 30 Days)</h3>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={favTimeline}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={4} />
            <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
            <Tooltip />
            <Line type="monotone" dataKey="favorites" name="Favorites" stroke="#f43f5e" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Top listings by views */}
        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="text-sm font-semibold mb-4">Top Listings by Venue Views</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={topByViews} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" tick={{ fontSize: 10 }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={110} />
              <Tooltip formatter={(val, name, props) => [val, name + ' @ ' + props.payload.venue]} />
              <Bar dataKey="views" name="Views" fill="#f59e0b" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Top listings by favorites */}
        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="text-sm font-semibold mb-4">Top Listings by Venue Favorites</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={topByFavs} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" tick={{ fontSize: 10 }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={110} />
              <Tooltip formatter={(val, name, props) => [val, name + ' @ ' + props.payload.venue]} />
              <Bar dataKey="favorites" name="Favorites" fill="#f43f5e" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Premium exclusive callout */}
      {premiumExclusive > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
          <strong>{premiumExclusive}</strong> listing{premiumExclusive > 1 ? 's are' : ' is'} marked as Premium Exclusive and only visible to premium subscribers.
        </div>
      )}
    </div>
  );
}