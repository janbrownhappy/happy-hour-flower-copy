import { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const sortItems = (arr, nameKey) =>
  [...arr].sort(
    (a, b) =>
      (a.display_order || 0) - (b.display_order || 0) ||
      (a[nameKey] || '').localeCompare(b[nameKey] || '')
  );

const ALL = '__all__';

/**
 * Admin-facing cascading State → Market → Area picker for tagging news by location.
 * Each level is optional — leaving a level on "All …" means the article applies to
 * everything below it (e.g. market selected, area = All → whole market).
 *
 * value: { state_code, state_name, market_id, market_name, area_id, area_name }
 * onChange(nextValue) fires with both ids/codes and display names.
 */
export default function AdminNewsLocationPicker({ value, onChange }) {
  const [states, setStates] = useState([]);
  const [markets, setMarkets] = useState([]);
  const [areas, setAreas] = useState([]);

  useEffect(() => {
    Promise.all([
      base44.entities.LocationState.list(),
      base44.entities.LocationMarket.list(),
      base44.entities.LocationArea.list(),
    ]).then(([s, m, a]) => {
      setStates([...s.filter((x) => x.is_active !== false)].sort((x, y) => (x.name || '').localeCompare(y.name || '')));
      setMarkets(sortItems(m.filter((x) => x.is_active !== false), 'market_name'));
      setAreas(sortItems(a.filter((x) => x.is_active !== false), 'area_name'));
    });
  }, []);

  const filteredMarkets = useMemo(
    () => markets.filter((m) => m.state_code === value.state_code),
    [markets, value.state_code]
  );
  const filteredAreas = useMemo(
    () => areas.filter((a) => a.market_id === value.market_id),
    [areas, value.market_id]
  );

  const handleState = (code) => {
    const s = states.find((x) => x.code === code || x.state_code === code);
    onChange({
      state_code: s ? code : '',
      state_name: s?.name || '',
      market_id: '', market_name: '', area_id: '', area_name: '',
    });
  };
  const handleMarket = (id) => {
    const m = markets.find((x) => x.market_id === id);
    onChange({ ...value, market_id: m ? id : '', market_name: m?.market_name || '', area_id: '', area_name: '' });
  };
  const handleArea = (id) => {
    const a = areas.find((x) => x.area_id === id);
    onChange({ ...value, area_id: a ? id : '', area_name: a?.area_name || '' });
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Tag this article to a location. Leave a level on "All" to target everything below it (e.g. a whole market). Leave State on "All" for global news shown everywhere.
      </p>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>State</Label>
          <Select value={value.state_code || ALL} onValueChange={(v) => handleState(v === ALL ? '' : v)}>
            <SelectTrigger><SelectValue placeholder="All states" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All states (global)</SelectItem>
              {states.map((s) => {
                const code = s.code || s.state_code;
                return <SelectItem key={s.id} value={code}>{s.name}</SelectItem>;
              })}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Market</Label>
          <Select value={value.market_id || ALL} onValueChange={(v) => handleMarket(v === ALL ? '' : v)} disabled={!value.state_code}>
            <SelectTrigger><SelectValue placeholder="All markets" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All markets</SelectItem>
              {filteredMarkets.map((m) => <SelectItem key={m.id} value={m.market_id}>{m.market_name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1 col-span-2">
          <Label>Area</Label>
          <Select value={value.area_id || ALL} onValueChange={(v) => handleArea(v === ALL ? '' : v)} disabled={!value.market_id}>
            <SelectTrigger><SelectValue placeholder="All areas" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All areas</SelectItem>
              {filteredAreas.map((a) => <SelectItem key={a.id} value={a.area_id}>{a.area_name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}