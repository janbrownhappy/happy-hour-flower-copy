import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { BarChart3, Eye, Ticket, ChevronDown, ChevronUp } from 'lucide-react';

const DAY_LABEL = { Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday', Thu: 'Thursday', Fri: 'Friday', Sat: 'Saturday', Sun: 'Sunday' };

// Owner-facing dashboard showing per-offer performance (views & redeem clicks).
// Grouped by venue; each offer row shows its totals.
export default function OfferActivityDashboard({ userId, venues }) {
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState({});

  const ownedVenues = (venues || []).filter(v => v.owner_id === userId);

  useEffect(() => {
    if (!userId) return;
    base44.entities.OfferStat.filter({ owner_id: userId })
      .then(rows => setStats(rows || []))
      .catch(() => setStats([]))
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) {
    return (
      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5">
        <div className="h-5 w-40 bg-slate-700 rounded animate-pulse mb-3" />
        <div className="h-16 bg-slate-700/60 rounded-xl animate-pulse" />
      </div>
    );
  }

  // Don't render anything if the owner has no venues at all.
  if (ownedVenues.length === 0) return null;

  const totalViews = stats.reduce((s, r) => s + (r.view_count || 0), 0);
  const totalRedeems = stats.reduce((s, r) => s + (r.redeem_click_count || 0), 0);

  // Group offer stats by venue id.
  const byVenue = {};
  stats.forEach(r => {
    const key = String(r.venue_id);
    (byVenue[key] = byVenue[key] || []).push(r);
  });

  return (
    <div className="bg-gradient-to-br from-slate-800 to-slate-800/80 border border-slate-700 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center">
            <BarChart3 className="w-4 h-4 text-orange-400" />
          </div>
          <div>
            <p className="text-white font-semibold text-sm">Offer Performance</p>
            <p className="text-slate-400 text-xs">Views & redeem clicks per deal</p>
          </div>
        </div>
      </div>

      {/* Top-line totals */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="text-center bg-slate-900/40 rounded-xl py-3">
          <p className="text-2xl font-bold text-sky-400 flex items-center justify-center gap-1.5">
            <Eye className="w-5 h-5" /> {totalViews.toLocaleString()}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">Total Offer Views</p>
        </div>
        <div className="text-center bg-slate-900/40 rounded-xl py-3">
          <p className="text-2xl font-bold text-emerald-400 flex items-center justify-center gap-1.5">
            <Ticket className="w-5 h-5" /> {totalRedeems.toLocaleString()}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">Redeem Clicks</p>
        </div>
      </div>

      {stats.length === 0 ? (
        <p className="text-slate-500 text-sm text-center py-4">
          No offer activity yet. Once customers view or tap “Redeem” on your deals, stats appear here.
        </p>
      ) : (
        <div className="space-y-3">
          {ownedVenues.map(venue => {
            const rows = (byVenue[String(venue.id)] || [])
              .slice()
              .sort((a, b) => (b.view_count || 0) - (a.view_count || 0));
            if (rows.length === 0) return null;
            const isOpen = expanded[venue.id] ?? true;
            const venueViews = rows.reduce((s, r) => s + (r.view_count || 0), 0);
            const venueRedeems = rows.reduce((s, r) => s + (r.redeem_click_count || 0), 0);
            return (
              <div key={venue.id} className="border border-slate-700 rounded-xl overflow-hidden">
                <button
                  onClick={() => setExpanded(prev => ({ ...prev, [venue.id]: !isOpen }))}
                  className="w-full flex items-center justify-between px-3 py-2.5 bg-slate-900/50 hover:bg-slate-900/70 transition-colors"
                >
                  <span className="text-white font-semibold text-sm truncate">{venue.name}</span>
                  <span className="flex items-center gap-3 text-xs flex-shrink-0">
                    <span className="text-sky-400 flex items-center gap-1"><Eye className="w-3 h-3" />{venueViews}</span>
                    <span className="text-emerald-400 flex items-center gap-1"><Ticket className="w-3 h-3" />{venueRedeems}</span>
                    {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                  </span>
                </button>
                {isOpen && (
                  <div className="divide-y divide-slate-700/60">
                    {rows.map(r => (
                      <div key={r.id} className="flex items-center gap-3 px-3 py-2.5">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-slate-200 font-medium truncate">{r.offer_text}</p>
                          {r.day && <p className="text-[11px] text-slate-500">{DAY_LABEL[r.day] || r.day}</p>}
                        </div>
                        <div className="flex items-center gap-3 text-xs flex-shrink-0">
                          <span className="text-sky-400 flex items-center gap-1" title="Views">
                            <Eye className="w-3.5 h-3.5" /> {r.view_count || 0}
                          </span>
                          <span className="text-emerald-400 flex items-center gap-1" title="Redeem clicks">
                            <Ticket className="w-3.5 h-3.5" /> {r.redeem_click_count || 0}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}