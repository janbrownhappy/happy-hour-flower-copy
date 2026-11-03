import { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { subDays, format, startOfDay } from 'date-fns';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { Smartphone, LogIn, Clock, Users } from 'lucide-react';
import { useAdminLocation, profileInTerritory, hasTerritory } from '@/lib/AdminLocationContext';

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

function fmtDuration(totalSeconds) {
  if (!totalSeconds || totalSeconds < 1) return '0s';
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.round(totalSeconds % 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export default function AppUsageAnalytics() {
  const { locationFilter } = useAdminLocation();
  const [sessions, setSessions] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState(30); // days

  useEffect(() => {
    Promise.all([
      base44.entities.AppSession.list('-started_at', 5000),
      base44.entities.Profile.list().catch(() => []),
    ]).then(([s, p]) => {
      setSessions(s);
      setProfiles(p);
    }).finally(() => setLoading(false));
  }, []);

  // Build the set of user ids whose saved territory matches the active filter.
  const inTerritoryUserIds = useMemo(() => {
    if (!hasTerritory(locationFilter)) return null;
    return new Set(
      profiles.filter(p => profileInTerritory(p, locationFilter)).map(p => p.created_by_id).filter(Boolean)
    );
  }, [profiles, locationFilter]);

  const cutoff = useMemo(() => subDays(new Date(), range), [range]);

  const inRange = useMemo(
    () => sessions.filter(s =>
      s.started_at && new Date(s.started_at) >= cutoff &&
      (!inTerritoryUserIds || (s.user_id && inTerritoryUserIds.has(s.user_id)))
    ),
    [sessions, cutoff, inTerritoryUserIds]
  );

  const totalOpens = inRange.length;
  const totalLogins = useMemo(() => inRange.filter(s => s.event_type === 'login').length, [inRange]);
  const uniqueUsers = useMemo(
    () => new Set(inRange.map(s => s.user_id).filter(Boolean)).size,
    [inRange]
  );
  const totalSeconds = useMemo(
    () => inRange.reduce((sum, s) => sum + (s.duration_seconds || 0), 0),
    [inRange]
  );
  const avgSeconds = totalOpens > 0 ? Math.round(totalSeconds / totalOpens) : 0;

  // Daily activity chart
  const dailyData = useMemo(() => {
    const map = {};
    for (let i = range - 1; i >= 0; i--) {
      const d = startOfDay(subDays(new Date(), i));
      const key = format(d, 'MMM d');
      map[key] = { name: key, opens: 0, logins: 0 };
    }
    inRange.forEach(s => {
      const key = format(startOfDay(new Date(s.started_at)), 'MMM d');
      if (!map[key]) return;
      map[key].opens++;
      if (s.event_type === 'login') map[key].logins++;
    });
    return Object.values(map);
  }, [inRange, range]);

  // Recent sessions table (most recent 25)
  const recent = useMemo(() => inRange.slice(0, 25), [inRange]);

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
          <h2 className="text-lg font-heading font-bold">App Usage</h2>
          <p className="text-xs text-muted-foreground">App opens, logins, and time spent in the app</p>
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
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard icon={Smartphone} label="App Opens" value={totalOpens.toLocaleString()} />
        <StatCard icon={LogIn} label="Logins" value={totalLogins.toLocaleString()} color="text-blue-500" />
        <StatCard icon={Users} label="Active Users" value={uniqueUsers.toLocaleString()} color="text-green-500" />
        <StatCard icon={Clock} label="Avg. Session" value={fmtDuration(avgSeconds)} color="text-rose-500" />
      </div>

      <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center flex-shrink-0">
          <Clock className="w-5 h-5 text-rose-500" />
        </div>
        <div>
          <p className="text-2xl font-bold">{fmtDuration(totalSeconds)}</p>
          <p className="text-xs text-muted-foreground">Total time spent in the app (last {range} days)</p>
        </div>
      </div>

      {/* Daily activity chart */}
      <div className="bg-card border border-border rounded-xl p-4">
        <h3 className="text-sm font-semibold mb-1">Daily Activity</h3>
        <p className="text-xs text-muted-foreground mb-4">App opens and logins per day</p>
        {totalOpens === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-8">No usage data yet — sessions will appear as people open the app.</p>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={dailyData} margin={{ top: 4, right: 8, left: -16, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-35} textAnchor="end" interval={Math.max(0, Math.floor(dailyData.length / 12))} />
              <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
              <Tooltip contentStyle={{ fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="opens" name="App Opens" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="logins" name="Logins" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Recent sessions */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-4 pt-4 pb-2">
          <h3 className="text-sm font-semibold">Recent Sessions</h3>
          <p className="text-xs text-muted-foreground">Most recent 25 app opens</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">User</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Type</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">When</th>
                <th className="text-center px-4 py-2.5 text-xs font-semibold text-muted-foreground">Duration</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((s, i) => (
                <tr key={s.id} className={`border-b border-border/50 ${i % 2 === 0 ? '' : 'bg-muted/10'}`}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-sm">{s.user_email || 'Anonymous'}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      s.event_type === 'login' ? 'bg-blue-100 text-blue-700' : 'bg-muted text-muted-foreground'
                    }`}>
                      {s.event_type === 'login' ? 'Login' : 'App Open'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {s.started_at ? format(new Date(s.started_at), 'MMM d, h:mm a') : '—'}
                  </td>
                  <td className="px-4 py-3 text-center font-semibold">{fmtDuration(s.duration_seconds || 0)}</td>
                </tr>
              ))}
              {recent.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-xs text-muted-foreground">No sessions in this range yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}