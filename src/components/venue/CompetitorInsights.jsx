import { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { getCompetitorInsights } from '@/functions/getCompetitorInsights';
import { Button } from '@/components/ui/button';
import { Crown, Save, TrendingUp, Eye, Heart, Star, Settings, CheckCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import CompetitorNameInput from './CompetitorNameInput';

const METRICS = [
  { key: 'views', label: 'Views', icon: Eye, color: '#60a5fa' },
  { key: 'favorites', label: 'Favorites', icon: Heart, color: '#f87171' },
  { key: 'reviews', label: 'Reviews', icon: Star, color: '#fbbf24' },
];

export default function CompetitorInsights({ venueId, venueName, canEdit }) {
  const [config, setConfig] = useState(null); // VenueCompetitor record
  const [competitors, setCompetitors] = useState([]); // [{ name, matched_venue_id }]
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    (async () => {
      const records = await base44.entities.VenueCompetitor.filter({ venue_id: String(venueId) });
      const rec = records[0] || null;
      setConfig(rec);
      // Support new name-based field, fall back to legacy id list
      const comps = rec?.competitors?.length
        ? rec.competitors
        : (rec?.competitor_ids || []).map((id) => ({ name: '', matched_venue_id: id }));
      setCompetitors(comps);
      setEditing(comps.length === 0);
      setLoading(false);
    })();
  }, [venueId]);

  const loadInsights = useCallback(async (comps) => {
    if (!comps || comps.length === 0) { setInsights(null); return; }
    const res = await getCompetitorInsights({ venueId, competitors: comps });
    setInsights(res.data);
  }, [venueId]);

  useEffect(() => {
    if (!editing && competitors.length > 0) {
      loadInsights(competitors);
    }
  }, [editing]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = async () => {
    setSaving(true);
    const cleaned = competitors.filter((c) => c.name && c.name.trim());
    let rec;
    if (config) {
      await base44.entities.VenueCompetitor.update(config.id, { competitors: cleaned });
      rec = { ...config, competitors: cleaned };
    } else {
      rec = await base44.entities.VenueCompetitor.create({ venue_id: String(venueId), competitors: cleaned });
    }
    setConfig(rec);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    setEditing(false);
    await loadInsights(cleaned);
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => <div key={i} className="h-16 bg-slate-800 rounded-xl animate-pulse" />)}
      </div>
    );
  }

  // Build chart data: one group per metric, one bar per venue
  const chartData = insights
    ? METRICS.map(m => {
        const row = { metric: m.label };
        row[insights.ownVenue.name] = insights.ownVenue[m.key];
        insights.competitors.forEach(c => { row[c.name] = c[m.key]; });
        return row;
      })
    : [];

  const seriesNames = insights
    ? [insights.ownVenue.name, ...insights.competitors.map(c => c.name)]
    : [];
  const seriesColors = ['#22c55e', '#f59e0b', '#a855f7', '#3b82f6', '#ec4899'];

  // Only competitors with live (matched) metrics count toward averages
  const matchedCompetitors = insights ? insights.competitors.filter(c => c.matched) : [];

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Crown className="w-4 h-4 text-purple-400" />
        <span className="text-white font-semibold text-sm">Competitor Insights</span>
        {!editing && canEdit && (
          <Button variant="outline" size="sm" className="ml-auto border-slate-600 text-slate-300 hover:bg-slate-700"
            onClick={() => setEditing(true)}>
            <Settings className="w-4 h-4 mr-1.5" /> Edit
          </Button>
        )}
      </div>

      {editing ? (
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5 space-y-4">
          <p className="text-slate-300 text-sm">
            Enter up to 4 competitor names. We'll benchmark your views, favorites, and reviews against theirs.
          </p>
          <CompetitorNameInput venueId={venueId} competitors={competitors} onChange={setCompetitors} />
          {canEdit && (
            <Button onClick={handleSave} disabled={saving || competitors.length === 0}
              className={`w-full py-3 font-semibold text-white rounded-xl ${saved ? 'bg-emerald-600' : 'bg-purple-600 hover:bg-purple-700'}`}>
              {saving ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" /> Saving…</>
                : saved ? <><CheckCircle className="w-4 h-4 mr-2" /> Saved!</>
                : <><Save className="w-4 h-4 mr-2" /> Save & View Insights</>}
            </Button>
          )}
        </div>
      ) : !insights || insights.competitors.length === 0 ? (
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 text-center">
          <p className="text-3xl mb-2">📊</p>
          <p className="text-slate-400 text-sm">No competitors added yet.</p>
          {canEdit && (
            <Button className="mt-4 bg-purple-600 hover:bg-purple-700 text-white" onClick={() => setEditing(true)}>
              Add Competitors
            </Button>
          )}
        </div>
      ) : (
        <>
          {/* Metric comparison cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {METRICS.map(m => {
              const Icon = m.icon;
              const own = insights.ownVenue[m.key];
              const compAvg = matchedCompetitors.length
                ? matchedCompetitors.reduce((s, c) => s + c[m.key], 0) / matchedCompetitors.length
                : 0;
              const diff = own - compAvg;
              const ahead = diff >= 0;
              return (
                <div key={m.key} className="bg-slate-800/60 border border-slate-700 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className="w-4 h-4" style={{ color: m.color }} />
                    <span className="text-slate-400 text-xs">{m.label}</span>
                  </div>
                  <p className="text-white font-bold text-2xl leading-tight">{own.toLocaleString()}</p>
                  {matchedCompetitors.length > 0 ? (
                    <p className={`text-xs mt-1 flex items-center gap-1 ${ahead ? 'text-emerald-400' : 'text-red-400'}`}>
                      <TrendingUp className={`w-3 h-3 ${ahead ? '' : 'rotate-180'}`} />
                      {ahead ? '+' : ''}{Math.round(diff)} vs competitor avg ({Math.round(compAvg).toLocaleString()})
                    </p>
                  ) : (
                    <p className="text-xs mt-1 text-slate-500">No matched competitors</p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Grouped comparison chart */}
          <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4">
            <p className="text-slate-300 text-sm font-semibold mb-3">You vs. Competitors</p>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="metric" tick={{ fill: '#94a3b8', fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: '#e2e8f0' }}
                  cursor={{ fill: 'rgba(148,163,184,0.08)' }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {seriesNames.map((name, i) => (
                  <Bar key={name} dataKey={name} fill={seriesColors[i % seriesColors.length]} radius={[3, 3, 0, 0]} maxBarSize={28} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-3 flex items-start gap-2">
            <Crown className="w-4 h-4 text-purple-400 mt-0.5 shrink-0" />
            <p className="text-slate-400 text-xs leading-relaxed">
              Metrics reflect all-time public engagement (views, saved favorites, and approved reviews). Competitors whose names match a listed venue show live data; unmatched names appear with zero metrics.
            </p>
          </div>
        </>
      )}
    </div>
  );
}