import { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { MapPin, X } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const sortItems = (arr) =>
  [...arr].sort(
    (a, b) => (a.display_order || 0) - (b.display_order || 0) || (a.name || a.market_name || a.area_name || '').localeCompare(b.name || b.market_name || b.area_name || '')
  );

// Territory filter bar for admin pages. Scopes all venue-based charts/tables
// to a State → Market → Area. Emits the current selection up via onChange.
export default function AnalyticsLocationFilter({ value, onChange }) {
  const [states, setStates] = useState([]);
  const [markets, setMarkets] = useState([]);
  const [areas, setAreas] = useState([]);

  useEffect(() => {
    Promise.all([
      base44.entities.LocationState.list('', 500),
      base44.entities.LocationMarket.list('', 500),
      base44.entities.LocationArea.list('', 1000),
    ]).then(([s, m, a]) => {
      setStates(sortItems(s));
      setMarkets(sortItems(m.filter(x => x.is_active !== false)));
      setAreas(sortItems(a.filter(x => x.is_active !== false)));
    });
  }, []);

  const filteredMarkets = useMemo(() => markets.filter(m => m.state_code === value.state_code), [markets, value.state_code]);
  const filteredAreas = useMemo(() => areas.filter(a => a.market_id === value.market_id), [areas, value.market_id]);

  const hasFilter = value.state_code || value.market_id || value.area_id;

  return (
    <div className="bg-card border border-border rounded-xl p-3 flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-2 mr-1">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <MapPin className="w-4 h-4 text-primary" />
        </div>
        <span className="text-sm font-semibold">Filter by location</span>
      </div>

      {/* State */}
      <Select
        value={value.state_code || 'all'}
        onValueChange={(v) => onChange({ state_code: v === 'all' ? null : v, market_id: null, area_id: null })}
      >
        <SelectTrigger className="w-40 h-9 text-sm"><SelectValue placeholder="All states" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All states</SelectItem>
          {states.map(s => <SelectItem key={s.id} value={s.code || s.state_code}>{s.name}</SelectItem>)}
        </SelectContent>
      </Select>

      {/* Market */}
      <Select
        value={value.market_id || 'all'}
        disabled={!value.state_code}
        onValueChange={(v) => onChange({ ...value, market_id: v === 'all' ? null : v, area_id: null })}
      >
        <SelectTrigger className="w-44 h-9 text-sm"><SelectValue placeholder="All markets" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All markets</SelectItem>
          {filteredMarkets.map(m => <SelectItem key={m.market_id} value={m.market_id}>{m.market_name}</SelectItem>)}
        </SelectContent>
      </Select>

      {/* Area */}
      <Select
        value={value.area_id || 'all'}
        disabled={!value.market_id}
        onValueChange={(v) => onChange({ ...value, area_id: v === 'all' ? null : v })}
      >
        <SelectTrigger className="w-44 h-9 text-sm"><SelectValue placeholder="All areas" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All areas</SelectItem>
          {filteredAreas.map(a => <SelectItem key={a.area_id} value={a.area_id}>{a.area_name}</SelectItem>)}
        </SelectContent>
      </Select>

      {hasFilter && (
        <button
          onClick={() => onChange({ state_code: null, market_id: null, area_id: null })}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground px-2 py-1.5 rounded-lg hover:bg-muted transition-colors"
        >
          <X className="w-3.5 h-3.5" /> Clear
        </button>
      )}
    </div>
  );
}