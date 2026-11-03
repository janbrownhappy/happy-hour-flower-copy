import { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { MapPin } from 'lucide-react';

const sortItems = (arr) =>
  [...arr].sort(
    (a, b) =>
      (a.display_order || 0) - (b.display_order || 0) ||
      (a.market_name || a.area_name || '').localeCompare(b.market_name || b.area_name || '')
  );

/**
 * Cascading State → Market → Area picker plus independent City and ZIP inputs.
 *
 * value: { state_code, market_id, area, city, zip_code }
 *   - `area` holds the selected LocationArea.area_id (stable key stored on Venue.area)
 * onChange(nextValue) fires on every change.
 *
 * Loads LocationArea + LocationMarket once. Compact styling suits the Explore filter row.
 */
export default function AreaFilterPicker({ value, onChange, className = '' }) {
  const [areas, setAreas] = useState([]);
  const [markets, setMarkets] = useState([]);

  useEffect(() => {
    Promise.all([
      base44.entities.LocationArea.list('', 500).catch(() => []),
      base44.entities.LocationMarket.list('', 200).catch(() => []),
    ]).then(([a, m]) => {
      setAreas(a.filter((x) => x.is_active !== false));
      setMarkets(sortItems(m.filter((x) => x.is_active !== false)));
    });
  }, []);

  const states = useMemo(() => {
    const seen = new Map();
    for (const m of markets) {
      if (m.state_code && !seen.has(m.state_code)) seen.set(m.state_code, m.state_name || m.state_code);
    }
    return [...seen.entries()].map(([code, name]) => ({ code, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [markets]);

  const filteredMarkets = useMemo(
    () => (value.state_code ? markets.filter((m) => m.state_code === value.state_code) : markets),
    [markets, value.state_code]
  );

  const filteredAreas = useMemo(() => {
    let list = areas;
    if (value.market_id) list = list.filter((a) => a.market_id === value.market_id);
    else if (value.state_code) list = list.filter((a) => a.state_code === value.state_code);
    return sortItems(list);
  }, [areas, value.market_id, value.state_code]);

  const V = '__all__';

  return (
    <div className={`grid grid-cols-2 gap-2 ${className}`}>
      {/* State */}
      <Select
        value={value.state_code || V}
        onValueChange={(val) =>
          onChange({ ...value, state_code: val === V ? '' : val, market_id: '', area: '' })
        }
      >
        <SelectTrigger className="bg-white text-foreground border-0 shadow-lg h-10 rounded-xl">
          <SelectValue placeholder="All States" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={V}>All States</SelectItem>
          {states.map((s) => (
            <SelectItem key={s.code} value={s.code}>{s.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Market */}
      <Select
        value={value.market_id || V}
        onValueChange={(val) => onChange({ ...value, market_id: val === V ? '' : val, area: '' })}
      >
        <SelectTrigger className="bg-white text-foreground border-0 shadow-lg h-10 rounded-xl">
          <SelectValue placeholder="All Markets" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={V}>All Markets</SelectItem>
          {filteredMarkets.map((m) => (
            <SelectItem key={m.market_id} value={m.market_id}>{m.market_name}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Area */}
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10 pointer-events-none" />
        <Select
          value={value.area || V}
          onValueChange={(val) => onChange({ ...value, area: val === V ? '' : val })}
        >
          <SelectTrigger className="pl-9 bg-white text-foreground border-0 shadow-lg h-10 rounded-xl">
            <SelectValue placeholder="All Areas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={V}>All Areas</SelectItem>
            {filteredAreas.map((a) => (
              <SelectItem key={a.area_id} value={a.area_id}>{a.area_name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* City */}
      <Input
        placeholder="City"
        value={value.city || ''}
        onChange={(e) => onChange({ ...value, city: e.target.value })}
        className="bg-white text-foreground border-0 shadow-lg h-10 rounded-xl"
      />

      {/* ZIP */}
      <Input
        placeholder="ZIP"
        inputMode="numeric"
        maxLength={5}
        value={value.zip_code || ''}
        onChange={(e) => onChange({ ...value, zip_code: e.target.value.replace(/\D/g, '').slice(0, 5) })}
        className="col-span-2 bg-white text-foreground border-0 shadow-lg h-10 rounded-xl"
      />
    </div>
  );
}