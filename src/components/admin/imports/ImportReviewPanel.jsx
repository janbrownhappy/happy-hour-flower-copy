import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Loader2, Check, Trash2 } from 'lucide-react';
import ImportReviewRow from './ImportReviewRow';
import { buildLocationIndex, resolveVenueLocation } from '@/lib/resolveVenueLocation';

const Venue = base44.entities.Venue;
const QUERY = { status: 'draft' };
const FIELDS = ['name', 'address', 'city', 'state_code', 'area_id', 'category', 'website', 'facebook_url', 'photo_urls', 'lat', 'created_date'];

let indexPromise;
const getIndex = () => (indexPromise ||= Promise.all([
  base44.entities.LocationState.list('name', 500),
  base44.entities.LocationMarket.list('market_name', 500),
  base44.entities.LocationArea.list('area_name', 1000),
]).then(([states, markets, areas]) => buildLocationIndex({ states, markets, areas })));

export default function ImportReviewPanel() {
  const [items, setItems] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState({});
  const [selected, setSelected] = useState(new Set());
  const [amenityCounts, setAmenityCounts] = useState({});

  const load = async (next) => {
    setLoading(true);
    const page = await Venue.filter(QUERY, { sort: '-created_date', limit: 50, cursor: next || undefined, fields: FIELDS });
    setItems((prev) => (next ? [...prev, ...page.items] : page.items));
    const ids = page.items.map((v) => v.id);
    if (ids.length) {
      base44.entities.VenueAmenity.aggregate({ query: { venue_id: { $in: ids } }, groupBy: 'venue_id', limit: 1000 })
        .then((r) => setAmenityCounts((m) => ({ ...m, ...Object.fromEntries(r.rows.map((x) => [x.venue_id, x.count])) })))
        .catch(() => {});
    }
    setCursor(page.has_more ? page.next_cursor : null);
    setTotal(await Venue.count(QUERY));
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const remove = (ids) => {
    setItems((prev) => prev.filter((v) => !ids.includes(v.id)));
    setSelected((s) => new Set([...s].filter((id) => !ids.includes(id))));
    setTotal((t) => t - ids.length);
  };
  const act = async (ids, kind) => {
    setBusy((b) => ({ ...b, ...Object.fromEntries(ids.map((id) => [id, true])) }));
    if (kind === 'approve') {
      const index = await getIndex();
      await Venue.bulkUpdate(items.filter((v) => ids.includes(v.id)).map((v) => {
        if (v.area_id) return { id: v.id, status: 'active' };
        const { state, market, area } = resolveVenueLocation(v, index);
        return {
          id: v.id, status: 'active',
          ...(state && { state_id: state.id, state_code: state.code }),
          ...(market && { market_id: market.market_id, market_name: market.market_name }),
          ...(area && { area_id: area.id, area: area.area_id }),
        };
      }));
    } else {
      await base44.entities.VenueAmenity.deleteMany({ venue_id: { $in: ids } });
      await Venue.deleteMany({ id: { $in: ids } });
    }
    remove(ids);
  };
  const sel = [...selected];
  const toggle = (id) => setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-2xl font-bold">Review Imports</h2>
          <p className="text-sm text-muted-foreground">{total} imported venues waiting for approval. Approved venues go live on the map.</p>
        </div>
        {sel.length > 0 && (
          <div className="flex gap-2">
            <Button onClick={() => act(sel, 'approve')}><Check className="w-4 h-4" />Approve {sel.length}</Button>
            <Button variant="outline" className="text-destructive" onClick={() => window.confirm(`Delete ${sel.length} venues?`) && act(sel, 'delete')}><Trash2 className="w-4 h-4" />Delete {sel.length}</Button>
          </div>
        )}
      </div>
      <div className="bg-card border rounded-lg">
        {items.length > 0 && (
          <button className="text-xs text-primary px-3 py-2 min-h-0" onClick={() => setSelected(sel.length === items.length ? new Set() : new Set(items.map((v) => v.id)))}>
            {sel.length === items.length ? 'Clear selection' : 'Select all shown'}
          </button>
        )}
        {items.map((v) => (
          <ImportReviewRow key={v.id} venue={v} amenityCount={amenityCounts[v.id] || 0} busy={busy[v.id]} selected={selected.has(v.id)} onSelect={() => toggle(v.id)}
            onApprove={() => act([v.id], 'approve')} onDelete={() => window.confirm(`Delete ${v.name}?`) && act([v.id], 'delete')} />
        ))}
        {!loading && !items.length && <p className="p-6 text-center text-muted-foreground">No imported venues waiting for review.</p>}
        {loading && <div className="p-6 flex justify-center"><Loader2 className="w-6 h-6 animate-spin" /></div>}
      </div>
      {cursor && !loading && <Button variant="outline" onClick={() => load(cursor)} className="w-full">Load more</Button>}
    </div>
  );
}