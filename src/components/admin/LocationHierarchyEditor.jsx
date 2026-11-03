import { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { MapPin, ChevronRight } from 'lucide-react';
import LocationLevel from '@/components/admin/location/LocationLevel';

const sortItems = (arr) =>
  [...arr].sort(
    (a, b) => (a.display_order || 0) - (b.display_order || 0) || (a.name || '').localeCompare(b.name || '')
  );

// Build a stable key segment from a human name (e.g. "Downtown Greenville" -> "downtown_greenville")
const slug = (s) =>
  (s || '')
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

export default function LocationHierarchyEditor() {
  const [states, setStates] = useState([]);
  const [markets, setMarkets] = useState([]);
  const [areas, setAreas] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selState, setSelState] = useState(null); // LocationState.id
  const [selMarket, setSelMarket] = useState(null); // LocationMarket.id

  const load = async () => {
    const [s, m, a] = await Promise.all([
      base44.entities.LocationState.list('', 500),
      base44.entities.LocationMarket.list('', 500),
      base44.entities.LocationArea.list('', 1000),
    ]);
    // Normalize each level to { name, code } for the shared LocationLevel column
    setStates(sortItems(s.map((x) => ({ ...x, name: x.name, code: x.code || x.state_code }))));
    setMarkets(sortItems(m.map((x) => ({ ...x, name: x.market_name, code: x.market_id }))));
    setAreas(sortItems(a.map((x) => ({ ...x, name: x.area_name, code: x.area_id }))));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const selStateRec = useMemo(() => states.find((s) => s.id === selState), [states, selState]);
  const selMarketRec = useMemo(() => markets.find((m) => m.id === selMarket), [markets, selMarket]);

  const stateCode = selStateRec?.code || selStateRec?.state_code || '';
  const stateName = selStateRec?.name || '';

  const filteredMarkets = useMemo(
    () => markets.filter((m) => m.state_code === stateCode),
    [markets, stateCode]
  );
  const filteredAreas = useMemo(
    () => areas.filter((a) => a.market_id === selMarketRec?.market_id),
    [areas, selMarketRec]
  );

  // Markets are fixed and only editable by admins — no state CRUD (states are the 3 fixed states)
  const noop = async () => {};

  // Market CRUD
  const createMarket = async (data) => {
    const market_id = `${stateCode.toLowerCase()}_${slug(data.name)}`;
    await base44.entities.LocationMarket.create({
      market_id,
      market_name: data.name,
      state_code: stateCode,
      state_name: stateName,
      state_id: selState,
      is_active: true,
    });
    await load();
  };
  const updateMarket = async (id, data) => {
    await base44.entities.LocationMarket.update(id, { market_name: data.name });
    await load();
  };
  const deleteMarket = async (id) => {
    const rec = markets.find((m) => m.id === id);
    if (!rec) return;
    if (!confirm('Delete this market and all its areas?')) return;
    const childAreas = areas.filter((a) => a.market_id === rec.market_id);
    await Promise.all(childAreas.map((a) => base44.entities.LocationArea.delete(a.id)));
    await base44.entities.LocationMarket.delete(id);
    if (selMarket === id) setSelMarket(null);
    await load();
  };

  // Area CRUD
  const createArea = async (data) => {
    if (!selMarketRec) return;
    const area_id = `${selMarketRec.market_id}__${slug(data.name)}`;
    await base44.entities.LocationArea.create({
      area_id,
      area_name: data.name,
      market_id: selMarketRec.market_id,
      market_name: selMarketRec.market_name,
      state_code: stateCode,
      state_name: stateName,
      state_id: selState,
      is_active: true,
    });
    await load();
  };
  const updateArea = async (id, data) => {
    await base44.entities.LocationArea.update(id, { area_name: data.name });
    await load();
  };
  const deleteArea = async (id) => {
    if (!confirm('Delete this area?')) return;
    await base44.entities.LocationArea.delete(id);
    await load();
  };

  const breadcrumb = useMemo(() => {
    const parts = [];
    if (selStateRec) parts.push(selStateRec.name);
    if (selMarketRec) parts.push(selMarketRec.name);
    return parts.filter(Boolean);
  }, [selStateRec, selMarketRec]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-4 border-amber-200 border-t-amber-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <MapPin className="w-4 h-4 text-primary" />
        </div>
        <div>
          <h2 className="text-base font-semibold">Territory Hierarchy</h2>
          <p className="text-xs text-muted-foreground">Manage states, markets & areas</p>
        </div>
      </div>

      {breadcrumb.length > 0 && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground flex-wrap">
          {breadcrumb.map((b, i) => (
            <span key={i} className="flex items-center gap-1">
              {i > 0 && <ChevronRight className="w-3 h-3" />}
              <span className={i === breadcrumb.length - 1 ? 'font-semibold text-foreground' : ''}>{b}</span>
            </span>
          ))}
        </div>
      )}

      <div className="flex gap-3 flex-col lg:flex-row">
        <LocationLevel
          title="States"
          items={states}
          selectedId={selState}
          countLabel="states"
          hasCode
          readOnly
          onSelect={(id) => { setSelState(id); setSelMarket(null); }}
          onCreate={noop}
          onUpdate={noop}
          onDelete={noop}
        />
        <LocationLevel
          title="Markets"
          items={filteredMarkets}
          selectedId={selMarket}
          countLabel="markets"
          disabled={!selState}
          emptyHint="Select a state first"
          onSelect={(id) => setSelMarket(id)}
          onCreate={createMarket}
          onUpdate={updateMarket}
          onDelete={deleteMarket}
        />
        <LocationLevel
          title="Areas"
          items={filteredAreas}
          selectedId={null}
          countLabel="areas"
          disabled={!selMarket}
          emptyHint="Select a market first"
          onSelect={() => {}}
          onCreate={createArea}
          onUpdate={updateArea}
          onDelete={deleteArea}
        />
      </div>
    </div>
  );
}