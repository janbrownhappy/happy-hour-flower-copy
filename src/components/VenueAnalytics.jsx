import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Eye, Heart, Star, TrendingUp, Users, BarChart3 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export default function VenueAnalytics({ venueId, venueName }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('30');

  useEffect(() => {
    loadStats();
  }, [venueId, period]);

  const loadStats = async () => {
    setLoading(true);
    try {
      // Load venue for current view/favorite counts
      const venue = await base44.entities.Venue.get(venueId);

      // Load all favorites for this venue
      const allFavs = await base44.asServiceRole?.entities?.Favorite?.list?.() 
        ?? await base44.entities.Favorite.list();
      const venueFavs = allFavs.filter(f => String(f.venue_id) === String(venueId));

      // Load reviews
      const allReviews = await base44.entities.Review.list();
      const venueReviews = allReviews.filter(r => String(r.venue_id) === String(venueId));
      const approvedReviews = venueReviews.filter(r => r.status === 'approved');

      // Build daily trend data for chart (last N days)
      const days = parseInt(period);
      const trendData = buildTrendData(venueFavs, days);

      setStats({
        views: venue.view_count || 0,
        favorites: venue.favorite_count || venueFavs.length,
        reviews: approvedReviews.length,
        avgRating: venue.rating || 0,
        trend: trendData,
      });
    } catch (err) {
      console.error('Analytics load error:', err);
    }
    setLoading(false);
  };

  const buildTrendData = (favs, days) => {
    const now = new Date();
    const result = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const dateStr = d.toISOString().slice(0, 10);
      const saves = favs.filter(f => f.created_date?.slice(0, 10) === dateStr).length;
      result.push({ label, saves });
    }
    return result;
  };

  const StatCard = ({ icon: Icon, label, value, color, sub }) => (
    <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-slate-400 text-xs">{label}</p>
        <p className="text-white font-bold text-xl leading-tight">{value.toLocaleString()}</p>
        {sub && <p className="text-slate-500 text-xs">{sub}</p>}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="space-y-4">
        {[1,2,3].map(i => (
          <div key={i} className="h-16 bg-slate-800 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-10">
        <p className="text-slate-400">Failed to load analytics.</p>
      </div>
    );
  }

  const chartTicks = stats.trend.length <= 14
    ? stats.trend.map(d => d.label)
    : stats.trend.filter((_, i) => i % 5 === 0).map(d => d.label);

  return (
    <div className="space-y-5">
      {/* Period selector */}
      <div className="flex items-center gap-2">
        <BarChart3 className="w-4 h-4 text-amber-400" />
        <span className="text-white font-semibold text-sm">Performance</span>
        <div className="ml-auto flex gap-1">
          {[['7', '7d'], ['30', '30d'], ['90', '90d']].map(([val, label]) => (
            <button
              key={val}
              onClick={() => setPeriod(val)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                period === val
                  ? 'bg-amber-500 text-white'
                  : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          icon={Eye}
          label="Total Views"
          value={stats.views}
          color="bg-blue-500/15 text-blue-400"
          sub="All time"
        />
        <StatCard
          icon={Heart}
          label="Saved as Favorite"
          value={stats.favorites}
          color="bg-red-500/15 text-red-400"
          sub="All time"
        />
        <StatCard
          icon={Star}
          label="Approved Reviews"
          value={stats.reviews}
          color="bg-amber-500/15 text-amber-400"
          sub={stats.avgRating > 0 ? `${stats.avgRating.toFixed(1)} avg rating` : 'No rating yet'}
        />
        <StatCard
          icon={TrendingUp}
          label="New Saves"
          value={stats.trend.reduce((sum, d) => sum + d.saves, 0)}
          color="bg-green-500/15 text-green-400"
          sub={`Last ${period} days`}
        />
      </div>

      {/* Saves trend chart */}
      <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4">
        <p className="text-slate-300 text-sm font-semibold mb-3 flex items-center gap-2">
          <Heart className="w-4 h-4 text-red-400" />
          Saves Over Time
          <span className="text-slate-500 text-xs font-normal ml-1">Last {period} days</span>
        </p>
        {stats.trend.every(d => d.saves === 0) ? (
          <div className="h-28 flex items-center justify-center text-slate-500 text-sm">
            No saves recorded in this period yet.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={stats.trend} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fill: '#94a3b8', fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                ticks={chartTicks}
              />
              <YAxis
                tick={{ fill: '#94a3b8', fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: '#e2e8f0' }}
                itemStyle={{ color: '#f87171' }}
                cursor={{ fill: 'rgba(248,113,113,0.08)' }}
              />
              <Bar dataKey="saves" fill="#f87171" radius={[3, 3, 0, 0]} maxBarSize={24} name="Saves" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Views context note */}
      <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-3 flex items-start gap-2">
        <Eye className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
        <p className="text-slate-400 text-xs leading-relaxed">
          <span className="text-slate-300 font-medium">Views</span> are counted each time a customer opens your venue page.
          <span className="text-slate-300 font-medium"> Saves</span> are counted when they tap the heart button.
          Trend chart shows new saves per day.
        </p>
      </div>
    </div>
  );
}