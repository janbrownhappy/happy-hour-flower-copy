import { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

const codeOf = (s) => (s?.code || s?.state_code || '').toUpperCase();

const sortStates = (arr) =>
  [...arr].sort(
    (a, b) =>
      (a.sort_order || 0) - (b.sort_order || 0) ||
      (a.name || '').localeCompare(b.name || '')
  );

const sortMarkets = (arr) =>
  [...arr].sort(
    (a, b) =>
      (a.display_order || 0) - (b.display_order || 0) ||
      (a.market_name || '').localeCompare(b.market_name || '')
  );

// One entry per state code (removes duplicate states like two "South Carolina" rows)
const dedupeStates = (arr) => {
  const seen = new Set();
  return arr.filter((s) => {
    const key = codeOf(s) || (s.name || '').toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

/**
 * Cascading State → Market → ZIP selector backed by the Location entities.
 * Uses plain native dropdowns so it works with any keyboard, touch, or automation.
 * value: { state_id, state, state_code, market_id, market_name, zip_code }
 */
export default function CascadingLocationPicker({
  value,
  onChange,
  selectClassName = '',
  labelClassName = '',
  required = true,
}) {
  const [states, setStates] = useState([]);
  const [markets, setMarkets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      base44.entities.LocationState.list(),
      base44.entities.LocationMarket.list('', 500),
    ])
      .then(([s, m]) => {
        setStates(dedupeStates(sortStates(s.filter((x) => x.is_active !== false))));
        setMarkets(sortMarkets(m.filter((x) => x.is_active !== false)));
      })
      .finally(() => setLoading(false));
  }, []);

  const filteredMarkets = useMemo(
    () => markets.filter((m) => (m.state_code || '').toUpperCase() === (value.state_code || '').toUpperCase()),
    [markets, value.state_code]
  );

  const handleState = (id) => {
    const s = states.find((x) => x.id === id);
    const code = codeOf(s);
    // Keep the chosen market if it already belongs to this state; otherwise default to the state's first market
    const keep = markets.find((m) => m.market_id === value.market_id && (m.state_code || '').toUpperCase() === code);
    const first = keep || markets.find((m) => (m.state_code || '').toUpperCase() === code);
    onChange({ ...value, state_id: id, state: s?.name || '', state_code: code, market_id: first?.market_id || '', market_name: first?.market_name || '' });
  };

  // Picking a market also sets its state, so the market list never depends on the state step
  const handleMarket = (marketId) => {
    const m = markets.find((x) => x.market_id === marketId);
    const s = states.find((x) => codeOf(x) === (m?.state_code || '').toUpperCase());
    onChange({
      ...value,
      ...(s ? { state_id: s.id, state: s.name, state_code: codeOf(s) } : {}),
      market_id: marketId,
      market_name: m?.market_name || '',
    });
  };

  const shownMarkets = filteredMarkets.length ? filteredMarkets : markets;

  const selectBase =
    'w-full h-12 px-3 rounded-xl focus:outline-none focus:ring-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed';

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <div className="w-5 h-5 border-2 border-amber-300 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <Label className={labelClassName}>State {required && <span className="text-red-400">*</span>}</Label>
        <select aria-label="State" value={value.state_id || ''} onChange={(e) => handleState(e.target.value)} className={`${selectBase} ${selectClassName}`}>
          <option value="">Select state...</option>
          {states.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      <div>
        <Label className={labelClassName}>Market {required && <span className="text-red-400">*</span>}</Label>
        <select aria-label="Market" value={value.market_id || ''} onChange={(e) => handleMarket(e.target.value)} className={`${selectBase} ${selectClassName}`}>
          <option value="">Select market...</option>
          {shownMarkets.map((m) => <option key={m.market_id} value={m.market_id}>{m.market_name}</option>)}
        </select>
      </div>

      <div>
        <Label className={labelClassName}>Zip Code {required && <span className="text-red-400">*</span>}</Label>
        <Input
          type="text"
          inputMode="numeric"
          placeholder="e.g. 29601"
          maxLength={5}
          value={value.zip_code || ''}
          onChange={(e) => onChange({ ...value, zip_code: e.target.value.replace(/\D/g, '').slice(0, 5) })}
          required={required}
          className={`h-12 rounded-xl ${selectClassName}`}
        />
      </div>
    </div>
  );
}