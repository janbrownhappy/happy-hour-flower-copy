import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { buildLocationIndex, resolveVenueLocation } from '@/lib/resolveVenueLocation';
import UnassignedAreaRow from '@/components/admin/imports/UnassignedAreaRow';

const Venue = base44.entities.Venue;
const sortKey = (v) => (v.city || '').trim().toLowerCase() || String(v.zip_code || '').trim();
const FIELDS = ['name', 'address', 'city', 'state_code', 'zip_code', 'website', 'facebook_url'];

// Venues missing an area assignment, in any market. Saving city/state/ZIP re-runs the area matcher.
export default function UnassignedAreaPanel() {
  const { toast } = useToast();
  const [stateFilter, setStateFilter] = useState('');
  const [items, setItems] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [index, setIndex] = useState(null);
  const [workMarket, setWorkMarket] = useState(() => localStorage.getItem('missingAreaMarket') || '');
  const pickMarket = (v) => { setWorkMarket(v); localStorage.setItem('missingAreaMarket', v); };

  const query = () => ({ area_id: { $in: [null, ''] }, ...(stateFilter && { state_code: stateFilter.toUpperCase() }) });

  const load = async (next) => {
    setLoading(true);
    const page = await Venue.filter(query(), { sort: 'city', limit: 50, fields: FIELDS, ...(next && { cursor: next }) });
    setItems((p) => (next ? [...p, ...page.items] : page.items));
    setCursor(page.has_more ? page.next_cursor : null);
    if (!next) setTotal(await Venue.count(query()));
    setLoading(false);
  };
  useEffect(() => { load(); }, [stateFilter]);

  useEffect(() => {
    Promise.all([
      base44.entities.LocationState.list('name', 500),
      base44.entities.LocationMarket.list('market_name', 500),
      base44.entities.LocationArea.list('area_name', 1000),
    ]).then(([states, markets, areas]) => setIndex(buildLocationIndex({ states, markets, areas })));
  }, []);

  const areaOptions = (index?.areas || [])
    .filter((a) => a.is_active !== false && (!workMarket || a.market_id === workMarket))
    .map((a) => ({ ...a, market_name: index.markets.find((m) => m.market_id === a.market_id)?.market_name }))
    .sort((a, b) => (a.market_name || '').localeCompare(b.market_name || '') || a.area_name.localeCompare(b.area_name));

  const remove = async (venue) => {
    await Venue.delete(venue.id);
    setItems((p) => p.filter((v) => v.id !== venue.id));
    setTotal((t) => t - 1);
    toast({ title: `${venue.name} deleted` });
  };

  const save = async (venue, form) => {
    const row = { city: form.city.trim(), state_code: form.state_code.trim().toUpperCase(), zip_code: form.zip_code.trim() };
    let { state, market, area } = index ? resolveVenueLocation(row, index) : {};
    if (form.area_id && index) {
      area = index.areas.find((a) => a.id === form.area_id);
      market = index.markets.find((m) => m.market_id === area?.market_id) || null;
      state = market ? index.stateByKey[market.state_code.toLowerCase()] || null : state;
    }
    await Venue.update(venue.id, {
      ...row,
      ...(state && { state_id: state.id, state_code: state.code }),
      ...(market && { market_id: market.market_id, market_name: market.market_name }),
      ...(area && { area_id: area.id, area: area.area_id }),
    });
    if (area) {
      setItems((p) => p.filter((v) => v.id !== venue.id));
      setTotal((t) => t - 1);
      toast({ title: `${venue.name} assigned to ${area.area_name}` });
    } else {
      toast({ title: 'Saved, but no matching area', description: `No market/area found for "${row.city}". Add it in Location Hierarchy, then save again.`, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-2xl font-bold">Venues Missing an Area</h2>
          <p className="text-sm text-muted-foreground">{total} venues need a city, state, or ZIP so they can be placed in a market.</p>
        </div>
        <div className="flex flex-wrap gap-2">
        <select value={workMarket} onChange={(e) => pickMarket(e.target.value)} className="h-9 rounded-md border border-input bg-transparent px-2 text-sm w-56">
          <option value="">All markets</option>
          {(index?.markets || []).map((m) => <option key={m.id} value={m.market_id}>{m.market_name}</option>)}
        </select>
        <Input placeholder="Filter by state (e.g. SC)" value={stateFilter} onChange={(e) => setStateFilter(e.target.value)} className="w-48" maxLength={2} />
        </div>
      </div>
      <div className="space-y-2">
        {[...items].sort((a, b) => sortKey(a).localeCompare(sortKey(b)) || (a.name || '').localeCompare(b.name || '')).map((v) => <UnassignedAreaRow key={v.id} venue={v} areas={areaOptions} onSave={save} onDelete={remove} />)}
      </div>
      {!loading && items.length === 0 && <p className="text-center text-muted-foreground py-10">Every venue has an area.</p>}
      {loading && <p className="text-center text-muted-foreground py-4">Loading…</p>}
      {cursor && !loading && <div className="flex justify-center"><Button variant="outline" onClick={() => load(cursor)}>Load more</Button></div>}
    </div>
  );
}