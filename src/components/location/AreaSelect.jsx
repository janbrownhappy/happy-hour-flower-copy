import { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

const sortItems = (arr) =>
  [...arr].sort(
    (a, b) =>
      (a.display_order || 0) - (b.display_order || 0) ||
      (a.market_name || a.area_name || '').localeCompare(b.market_name || b.area_name || '')
  );

/**
 * Cascading State → Market → Area picker for forms.
 *
 * value: the selected LocationArea.area_id (string).
 * onChange(area_id, areaRecord) — areaRecord is the full LocationArea so the caller
 *   can denormalize market_id / market_name / state_code onto the entity being saved.
 */
export default function AreaSelect({ value, onChange, labelClassName = '' }) {
  const [areas, setAreas] = useState([]);
  const [markets, setMarkets] = useState([]);
  const [stateCode, setStateCode] = useState('');
  const [marketId, setMarketId] = useState('');

  useEffect(() => {
    Promise.all([
      base44.entities.LocationArea.list('', 500).catch(() => []),
      base44.entities.LocationMarket.list('', 200).catch(() => []),
    ]).then(([a, m]) => {
      const activeAreas = a.filter((x) => x.is_active !== false);
      setAreas(activeAreas);
      setMarkets(sortItems(m.filter((x) => x.is_active !== false)));
      // Seed the state/market selects from the currently selected area
      if (value) {
        const cur = activeAreas.find((x) => x.area_id === value);
        if (cur) {
          setStateCode(cur.state_code || '');
          setMarketId(cur.market_id || '');
        }
      }
    });
  }, [value]);

  const states = useMemo(() => {
    const seen = new Map();
    for (const m of markets) {
      if (m.state_code && !seen.has(m.state_code)) seen.set(m.state_code, m.state_name || m.state_code);
    }
    return [...seen.entries()].map(([code, name]) => ({ code, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [markets]);

  const filteredMarkets = useMemo(
    () => (stateCode ? markets.filter((m) => m.state_code === stateCode) : markets),
    [markets, stateCode]
  );

  const filteredAreas = useMemo(() => {
    let list = areas;
    if (marketId) list = list.filter((a) => a.market_id === marketId);
    else if (stateCode) list = list.filter((a) => a.state_code === stateCode);
    return sortItems(list);
  }, [areas, marketId, stateCode]);

  const V = '__none__';

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <div className="space-y-1">
        <Label className={labelClassName}>State</Label>
        <Select value={stateCode || V} onValueChange={(val) => { setStateCode(val === V ? '' : val); setMarketId(''); onChange('', null); }}>
          <SelectTrigger><SelectValue placeholder="Any state" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={V}>Any state</SelectItem>
            {states.map((s) => <SelectItem key={s.code} value={s.code}>{s.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        <Label className={labelClassName}>Market</Label>
        <Select value={marketId || V} onValueChange={(val) => { setMarketId(val === V ? '' : val); onChange('', null); }}>
          <SelectTrigger><SelectValue placeholder="Any market" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={V}>Any market</SelectItem>
            {filteredMarkets.map((m) => <SelectItem key={m.market_id} value={m.market_id}>{m.market_name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        <Label className={labelClassName}>Area</Label>
        <Select
          value={value || V}
          onValueChange={(val) => {
            const rec = val === V ? null : filteredAreas.find((a) => a.area_id === val) || areas.find((a) => a.area_id === val) || null;
            if (rec) { setStateCode(rec.state_code || ''); setMarketId(rec.market_id || ''); }
            onChange(val === V ? '' : val, rec);
          }}
        >
          <SelectTrigger><SelectValue placeholder="Select area…" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={V}>No area</SelectItem>
            {filteredAreas.map((a) => <SelectItem key={a.area_id} value={a.area_id}>{a.area_name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}