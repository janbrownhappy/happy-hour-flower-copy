import { useMemo } from 'react';
import { Check } from 'lucide-react';

const sortItems = (arr) =>
  [...arr].sort(
    (a, b) =>
      (a.display_order || 0) - (b.display_order || 0) ||
      (a.market_name || a.area_name || '').localeCompare(b.market_name || b.area_name || '')
  );

/**
 * Multi-select area picker for the consumer onboarding flow.
 * Areas are grouped under market tabs. `selected` is an array of area_id keys.
 *
 * Props:
 *   areas: LocationArea[] (already filtered to active)
 *   markets: LocationMarket[] (already filtered to active, sorted)
 *   selected: string[] (area_id values)
 *   activeMarket: string ('' = all) — controlled tab
 *   onSetActiveMarket(marketId)
 *   onToggle(areaId)
 *   onToggleAllInMarket(marketId)
 *   suggested: string (area_id auto-matched, optional)
 */
export default function OnboardingAreaPicker({
  areas, markets, selected, activeMarket, onSetActiveMarket, onToggle, onToggleAllInMarket, suggested,
}) {
  const displayAreas = useMemo(() => {
    const list = activeMarket ? areas.filter((a) => a.market_id === activeMarket) : areas;
    return sortItems(list);
  }, [areas, activeMarket]);

  return (
    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl overflow-hidden">
      {/* Market Tabs */}
      <div className="flex border-b border-white/10 overflow-x-auto scrollbar-hide">
        <button
          onClick={() => onSetActiveMarket('')}
          className={`flex-shrink-0 px-4 py-3 text-sm font-semibold transition-colors ${
            activeMarket === ''
              ? 'text-amber-400 border-b-2 border-amber-400 bg-white/5'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          All ({areas.length})
        </button>
        {markets.map((m) => {
          const marketAreas = areas.filter((a) => a.market_id === m.market_id);
          if (marketAreas.length === 0) return null;
          const selectedCount = marketAreas.filter((a) => selected.includes(a.area_id)).length;
          return (
            <button
              key={m.market_id}
              onClick={() => onSetActiveMarket(m.market_id)}
              className={`flex-shrink-0 px-4 py-3 text-sm font-semibold transition-colors whitespace-nowrap ${
                activeMarket === m.market_id
                  ? 'text-amber-400 border-b-2 border-amber-400 bg-white/5'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {m.market_name}
              {selectedCount > 0 && (
                <span className="ml-1.5 w-4 h-4 inline-flex items-center justify-center bg-amber-500 text-white text-xs rounded-full leading-none">
                  {selectedCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Market Select-All row */}
      {activeMarket && (
        <div className="flex items-center justify-between px-4 py-2.5 bg-white/3 border-b border-white/10">
          <span className="text-xs text-slate-400">
            {displayAreas.filter((a) => selected.includes(a.area_id)).length} of {displayAreas.length} selected
          </span>
          <button
            onClick={() => onToggleAllInMarket(activeMarket)}
            className="text-xs text-amber-400 hover:text-amber-300 font-medium"
          >
            {displayAreas.every((a) => selected.includes(a.area_id)) ? 'Deselect all' : 'Select all'}
          </button>
        </div>
      )}

      {/* Area grid */}
      <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-72 overflow-y-auto">
        {displayAreas.map((a) => {
          const isSelected = selected.includes(a.area_id);
          const isSuggested = a.area_id === suggested;
          return (
            <button key={a.area_id}
              onClick={() => onToggle(a.area_id)}
              className={`p-3.5 rounded-xl border text-left transition-all group ${
                isSelected
                  ? 'bg-amber-500 border-amber-400 shadow-md shadow-amber-500/20'
                  : 'bg-slate-800/60 border-slate-600/50 hover:border-amber-500/40 hover:bg-slate-700/60'
              }`}
            >
              <div className="flex items-start gap-2.5">
                <div className={`w-5 h-5 rounded-md border flex-shrink-0 flex items-center justify-center mt-0.5 transition-colors ${
                  isSelected ? 'bg-white border-white' : 'border-slate-500 group-hover:border-amber-400'
                }`}>
                  {isSelected && <Check className="w-3 h-3 text-amber-500" />}
                </div>
                <div>
                  <p className={`text-sm font-semibold leading-tight ${isSelected ? 'text-white' : 'text-slate-200'}`}>
                    {a.area_name}
                  </p>
                  <p className={`text-xs mt-0.5 ${isSelected ? 'text-amber-100' : 'text-slate-400'}`}>
                    {a.market_name}{isSuggested ? ' · 📍 Nearest' : ''}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Footer summary */}
      <div className="px-4 pb-4">
        {selected.length === 0 ? (
          <p className="text-center text-xs text-slate-400 py-2">
            No selection = we'll show all areas
          </p>
        ) : (
          <p className="text-center text-xs text-amber-400/80 py-1">
            {selected.length} area{selected.length !== 1 ? 's' : ''} selected
          </p>
        )}
      </div>
    </div>
  );
}