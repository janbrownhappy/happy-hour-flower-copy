import { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Save, CheckCircle2 } from 'lucide-react';
import { useAdminLocation, venueInTerritory, hasTerritory } from '@/lib/AdminLocationContext';

const sortAreas = (arr) =>
  [...arr].sort(
    (a, b) =>
      (a.display_order || 0) - (b.display_order || 0) ||
      (a.market_name || '').localeCompare(b.market_name || '') ||
      (a.area_name || '').localeCompare(b.area_name || '')
  );

export default function NeighborhoodEditor() {
  const { locationFilter } = useAdminLocation();
  const [venues, setVenues] = useState([]);
  const [areas, setAreas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [changes, setChanges] = useState({}); // { venueId: area_id }
  const [saving, setSaving] = useState({}); // { venueId: true }
  const [saved, setSaved] = useState({}); // { venueId: true }

  useEffect(() => {
    Promise.all([
      base44.entities.Venue.list('name', 500),
      base44.entities.LocationArea.list('', 500).catch(() => []),
    ])
      .then(([v, a]) => {
        setVenues(v);
        setAreas(sortAreas(a.filter((x) => x.is_active !== false)));
      })
      .finally(() => setLoading(false));
  }, []);

  const areaById = useMemo(() => Object.fromEntries(areas.map((a) => [a.area_id, a])), [areas]);

  const scopedVenues = hasTerritory(locationFilter)
    ? venues.filter(v => venueInTerritory(v, locationFilter))
    : venues;
  const filtered = scopedVenues.filter(v =>
    !search ||
    v.name?.toLowerCase().includes(search.toLowerCase()) ||
    v.address?.toLowerCase().includes(search.toLowerCase())
  );

  const getAreaId = (venue) =>
    changes[venue.id] !== undefined ? changes[venue.id] : (venue.area || '');

  const handleChange = (venueId, value) => {
    setChanges(prev => ({ ...prev, [venueId]: value === '__none__' ? '' : value }));
    setSaved(prev => { const n = { ...prev }; delete n[venueId]; return n; });
  };

  // Build the denormalized venue patch from a selected area_id
  const patchFromArea = (areaId) => {
    const rec = areaById[areaId];
    if (!rec) {
      return { area: '', area_id: '', market_id: '', market_name: '', state_code: '' };
    }
    return {
      area: rec.area_id,
      area_id: rec.id,
      market_id: rec.market_id || '',
      market_name: rec.market_name || '',
      state_code: rec.state_code || '',
    };
  };

  const handleSave = async (venue) => {
    const areaId = getAreaId(venue);
    const patch = patchFromArea(areaId);
    setSaving(prev => ({ ...prev, [venue.id]: true }));
    await base44.entities.Venue.update(venue.id, patch);
    setVenues(prev => prev.map(v => v.id === venue.id ? { ...v, ...patch } : v));
    setChanges(prev => { const n = { ...prev }; delete n[venue.id]; return n; });
    setSaving(prev => { const n = { ...prev }; delete n[venue.id]; return n; });
    setSaved(prev => ({ ...prev, [venue.id]: true }));
    setTimeout(() => setSaved(prev => { const n = { ...prev }; delete n[venue.id]; return n; }), 2000);
  };

  const handleSaveAll = async () => {
    const ids = Object.keys(changes);
    if (!ids.length) return;
    setSaving(Object.fromEntries(ids.map(id => [id, true])));
    const patches = Object.fromEntries(ids.map(id => [id, patchFromArea(changes[id])]));
    await Promise.all(ids.map(id => base44.entities.Venue.update(id, patches[id])));
    setVenues(prev => prev.map(v => patches[v.id] ? { ...v, ...patches[v.id] } : v));
    setChanges({});
    setSaving({});
    setSaved(Object.fromEntries(ids.map(id => [id, true])));
    setTimeout(() => setSaved({}), 2000);
  };

  const pendingCount = Object.keys(changes).length;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search venues or address..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        {pendingCount > 0 && (
          <Button onClick={handleSaveAll} className="flex-shrink-0">
            <Save className="w-4 h-4 mr-1.5" /> Save All ({pendingCount})
          </Button>
        )}
      </div>

      <p className="text-xs text-muted-foreground mb-2">{filtered.length} venues</p>

      {/* Table */}
      <div className="border border-border rounded-xl overflow-hidden">
        {/* Header row */}
        <div className="grid grid-cols-[2fr_2fr_1fr_2fr_auto] bg-muted px-3 py-2 gap-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          <span>Venue Name</span>
          <span>Address</span>
          <span>Zip</span>
          <span>Area</span>
          <span></span>
        </div>

        {loading ? (
          <div className="space-y-px">
            {[1,2,3,4,5].map(i => <div key={i} className="h-12 bg-muted animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-10 text-center text-muted-foreground text-sm">No venues found</div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map(venue => {
              const areaId = getAreaId(venue);
              const isDirty = changes[venue.id] !== undefined;
              const isSaving = saving[venue.id];
              const isSaved = saved[venue.id];

              // Extract zip from address (last 5-digit sequence)
              const zipMatch = venue.address?.match(/\b\d{5}\b/g);
              const zip = zipMatch ? zipMatch[zipMatch.length - 1] : '—';

              return (
                <div
                  key={venue.id}
                  className={`grid grid-cols-[2fr_2fr_1fr_2fr_auto] items-center px-3 py-2 gap-3 text-sm transition-colors ${isDirty ? 'bg-amber-50 dark:bg-amber-900/10' : 'bg-card hover:bg-muted/30'}`}
                >
                  <span className="font-medium truncate" title={venue.name}>{venue.name}</span>
                  <span className="text-muted-foreground text-xs truncate" title={venue.address}>{venue.address || '—'}</span>
                  <span className="text-muted-foreground text-xs">{zip}</span>
                  <Select
                    value={areaId || '__none__'}
                    onValueChange={val => handleChange(venue.id, val)}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Select area" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— None —</SelectItem>
                      {areas.map(a => (
                        <SelectItem key={a.area_id} value={a.area_id}>
                          {a.market_name ? `${a.market_name} · ${a.area_name}` : a.area_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="w-16 flex justify-end">
                    {isSaved ? (
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                    ) : isDirty ? (
                      <Button size="sm" className="h-7 text-xs px-2" onClick={() => handleSave(venue)} disabled={isSaving}>
                        {isSaving ? '...' : 'Save'}
                      </Button>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}