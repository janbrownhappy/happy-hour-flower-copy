import { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { X, CheckCircle2, Plus } from 'lucide-react';

const MAX_COMPETITORS = 4;

// competitors: [{ name, matched_venue_id }]
export default function CompetitorNameInput({ venueId, competitors, onChange }) {
  const [allVenues, setAllVenues] = useState([]);
  const [draft, setDraft] = useState('');

  useEffect(() => {
    (async () => {
      const venues = await base44.entities.Venue.filter({ status: 'active' }, 'name', 2000);
      setAllVenues(venues.filter((v) => v.id !== venueId));
    })();
  }, [venueId]);

  const venuesByName = useMemo(
    () => Object.fromEntries(allVenues.map((v) => [String(v.name || '').trim().toLowerCase(), v])),
    [allVenues]
  );

  const [showSuggestions, setShowSuggestions] = useState(false);

  const list = competitors || [];
  const atMax = list.length >= MAX_COMPETITORS;

  const suggestions = useMemo(() => {
    const q = draft.trim().toLowerCase();
    if (!q) return [];
    const addedNames = new Set(list.map((c) => c.name.toLowerCase()));
    return allVenues
      .filter((v) => String(v.name || '').toLowerCase().includes(q) && !addedNames.has(String(v.name).toLowerCase()))
      .slice(0, 8);
  }, [draft, allVenues, list]);

  const addCompetitor = (overrideName, overrideVenue) => {
    const name = (overrideName ?? draft).trim();
    if (!name || atMax) return;
    if (list.some((c) => c.name.toLowerCase() === name.toLowerCase())) {
      setDraft('');
      setShowSuggestions(false);
      return;
    }
    const match = overrideVenue || venuesByName[name.toLowerCase()];
    onChange([...list, { name, matched_venue_id: match ? match.id : null }]);
    setDraft('');
    setShowSuggestions(false);
  };

  const removeCompetitor = (idx) => {
    onChange(list.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-3">
      {/* Entered competitors */}
      <div className="space-y-2">
        {list.length === 0 ? (
          <p className="text-slate-500 text-sm">No competitors added yet.</p>
        ) : (
          list.map((c, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between bg-slate-700/60 border border-slate-600 rounded-xl px-3 py-2.5"
            >
              <div className="min-w-0 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-purple-500/20 text-purple-300 text-xs font-bold flex items-center justify-center shrink-0">
                  {idx + 1}
                </span>
                <span className="text-white text-sm truncate">{c.name}</span>
                {c.matched_venue_id ? (
                  <span className="flex items-center gap-1 text-emerald-400 text-xs shrink-0">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Matched
                  </span>
                ) : (
                  <span className="text-slate-500 text-xs shrink-0">No metrics</span>
                )}
              </div>
              <button onClick={() => removeCompetitor(idx)} className="p-1 rounded-full hover:bg-slate-600 shrink-0">
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Name entry */}
      {!atMax && (
        <div className="flex gap-2 relative">
          <div className="flex-1 relative">
            <Input
              value={draft}
              onChange={(e) => { setDraft(e.target.value); setShowSuggestions(true); }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addCompetitor();
                }
              }}
              placeholder={`Type competitor name #${list.length + 1}…`}
              className="bg-slate-700 border-slate-600 text-white"
            />
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute z-20 left-0 right-0 mt-1 bg-slate-800 border border-slate-600 rounded-xl shadow-lg overflow-hidden max-h-64 overflow-y-auto">
                {suggestions.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => addCompetitor(v.name, v)}
                    className="w-full text-left px-3 py-2.5 hover:bg-slate-700 transition-colors flex items-center gap-2"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span className="text-white text-sm truncate">{v.name}</span>
                    {v.category && <span className="text-slate-500 text-xs truncate ml-auto">{v.category}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={() => addCompetitor()}
            disabled={!draft.trim()}
            className="px-3 rounded-md bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white flex items-center self-start h-9"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      )}

      <p className="text-slate-500 text-xs">
        {atMax
          ? `Maximum of ${MAX_COMPETITORS} competitors reached.`
          : `Add up to ${MAX_COMPETITORS} competitor names (${list.length}/${MAX_COMPETITORS}). Names matching a venue in HappyHourFlower show live metrics.`}
      </p>
    </div>
  );
}