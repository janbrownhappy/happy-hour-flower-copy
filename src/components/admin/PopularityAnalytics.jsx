import { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { subDays, format, startOfDay } from 'date-fns';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { Eye, Star, MapPin, Trophy } from 'lucide-react';
import { useAdminLocation, venueInTerritory } from '@/lib/AdminLocationContext';

// Note: the Favorite entity is only readable by its owner (RLS), so admins can't
// list all Favorites. We use each venue's denormalized favorite_count for save
// totals/ranking (reliable, admin-visible) and CheckIn records for the trend.

function StatCard({ icon: Icon, label, value, color = 'text-primary' }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
        <Icon className={`w-5 h-5 ${color}`} />
      </div>
      <div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

export default function PopularityAnalytics() {
  const { locationFilter } = useAdminLocation();
  const [venues, setVenues] = useState([]);
  const [checkIns, setCheckIns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState(30); // days

  useEffect(() => {
    Promise.all([
      base44.entities.Venue.list('-created_date', 5000),
      base44.entities.CheckIn.list('-created_date', 5000).catch(() => []),
    ]).then(([v, c]) => {
      setVenues(v);
      setCheckIns(c);
    }).finally(() => setLoading(false));
  }, []);

  // Venues inside the active territory (and the set of their ids for filtering activity).
  const territoryVenues = useMemo(
    () => venues.filter(v => venueInTerritory(v, locationFilter)),
    [venues, locationFilter]
  );
  const territoryVenueIds = useMemo(
    () => new Set(territoryVenues.map(v => v.id)),
    [territoryVenues]
  );

  const cutoff = useMemo(() => subDays(new Date(), range), [range]);

  const checkInsInRange = useMemo(
    () => checkIns.filter(c => {
      const when = c.checked_in_at || c.created_date;
      return when && new Date(when) >= cutoff && territoryVenueIds.has(c.venue_id);
    }),
    [checkIns, cutoff, territoryVenueIds]
  );

  // Totals: views & saves come from the venue counters (admin-visible & reliable);
  // check-ins from activity in range.
  const totalViews = useMemo(() => territoryVenues.reduce((s, v) => s + (v.view_count || 0), 0), [territoryVenues]);
  const totalSaves = useMemo(() => territoryVenues.reduce((s, v) => s + (v.favorite_count || 0), 0), [territoryVenues]);
  const totalCheckIns = checkInsInRange.length;

  // Daily check-ins trend
  const dailyData = useMemo(() => {
    const map = {};
    for (let i = range - 1; i >= 0; i--) {
      const d = startOfDay(subDays(new Date(), i));
      const key = format(d, 'MMM d');
      map[key] = { name: key, checkins: 0 };
    }
    checkInsInRange.forEach(c => {
      const when = c.checked_in_at || c.created_date;
      const key = format(startOfDay(new Date(when)), 'MMM d');
      if (map[key]) map[key].checkins++;
    });
    return Object.values(map);
  }, [checkInsInRange, range]);

  // Top venues by combined popularity (views + saves + check-ins in range)
  const topVenues = useMemo(() => {
    const checkInsByVenue = {};
    checkInsInRange.forEach(c => { checkInsByVenue[c.venue_id] = (checkInsByVenue[c.venue_id] || 0) + 1; });
    return territoryVenues
      .map(v => ({
        id: v.id,
        name: v.name,
        views: v.view_count || 0,
        saves: v.favorite_count || 0,
        checkins: checkInsByVenue[v.id] || 0,
      }))
      .map(v => ({ ...v, score: v.views + v.saves + v.checkins }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
  }, [territoryVenues, checkInsInRange]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-4 border-amber-200 border-t-amber-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Range selector */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-heading font-bold">Popularity</h2>
          <p className="text-xs text-muted-foreground">Venue views, saves, and check-in trends</p>
        </div>
        <div className="flex gap-1">
          {[7, 30, 90].map(d => (
            <button
              key={d}
              onClick={() => setRange(d)}
              className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                range === d ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border text-muted-foreground hover:bg-muted'
              }`}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatCard icon={Eye} label="Total Venue Views" value={totalViews.toLocaleString()} color="text-sky-500" />
        <StatCard icon={Star} label="Total Saves" value={totalSaves.toLocaleString()} color="text-amber-500" />
        <StatCard icon={MapPin} label={`Check-ins (last ${range}d)`} value={totalCheckIns.toLocaleString()} color="text-green-500" />
      </div>

      {/* Trend chart */}
      <div className="bg-card border border-border rounded-xl p-4">
        <h3 className="text-sm font-semibold mb-1">Check-in Trends</h3>
        <p className="text-xs text-muted-foreground mb-4">Daily check-ins over time</p>
        {totalCheckIns === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-8">No check-ins in this range yet.</p>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={dailyData} margin={{ top: 4, right: 8, left: -16, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-35} textAnchor="end" interval={Math.max(0, Math.floor(dailyData.length / 12))} />
              <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
              <Tooltip contentStyle={{ fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="checkins" name="Check-ins" stroke="#22c55e" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Top venues */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-4 pt-4 pb-2 flex items-center gap-2">
          <Trophy className="w-4 h-4 text-amber-500" />
          <div>
            <h3 className="text-sm font-semibold">Most Popular Venues</h3>
            <p className="text-xs text-muted-foreground">Ranked by views + saves + check-ins</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">#</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Venue</th>
                <th className="text-center px-4 py-2.5 text-xs font-semibold text-muted-foreground">Views</th>
                <th className="text-center px-4 py-2.5 text-xs font-semibold text-muted-foreground">Saves</th>
                <th className="text-center px-4 py-2.5 text-xs font-semibold text-muted-foreground">Check-ins</th>
              </tr>
            </thead>
            <tbody>
              {topVenues.map((v, i) => (
                <tr key={v.id} className={`border-b border-border/50 ${i % 2 === 0 ? '' : 'bg-muted/10'}`}>
                  <td className="px-4 py-3 font-bold text-muted-foreground">{i + 1}</td>
                  <td className="px-4 py-3 font-medium">{v.name}</td>
                  <td className="px-4 py-3 text-center text-sky-600 font-semibold">{v.views.toLocaleString()}</td>
                  <td className="px-4 py-3 text-center text-amber-600 font-semibold">{v.saves.toLocaleString()}</td>
                  <td className="px-4 py-3 text-center text-green-600 font-semibold">{v.checkins.toLocaleString()}</td>
                </tr>
              ))}
              {topVenues.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-xs text-muted-foreground">No venues in this territory yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}