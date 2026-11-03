import { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, MapPin, CheckCircle2, Loader2 } from 'lucide-react';

const sortAreas = (arr) =>
  [...arr].sort(
    (a, b) =>
      (a.display_order || 0) - (b.display_order || 0) ||
      (a.market_name || '').localeCompare(b.market_name || '') ||
      (a.area_name || '').localeCompare(b.area_name || '')
  );

export default function BulkNeighborhoodReassign() {
  const [venues, setVenues] = useState([]);
  const [areas, setAreas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState({}); // { venueId: true }
  const [target, setTarget] = useState(''); // area_id
  const [saving, setSaving] = useState(false);
  const [savedCount, setSavedCount] = useState(0);

  useEffect(() => {
    Promise.all([
      base44.entities.Venue.list('name', 1000),
      base44.entities.LocationArea.list('', 500).catch(() => []),
    ])
      .then(([v, a]) => {
        setVenues(v);
        setAreas(sortAreas(a.filter((x) => x.is_active !== false)));
      })
      .finally(() => setLoading(false));
  }, []);

  const areaById = useMemo(() => Object.fromEntries(areas.map((a) => [a.area_id, a])), [areas]);

  const filtered = useMemo(() => venues.filter(v =>
    !search ||
    v.name?.toLowerCase().includes(search.toLowerCase()) ||
    v.address?.toLowerCase().includes(search.toLowerCase())
  ), [venues, search]);

  const selectedIds = Object.keys(selected).filter(id => selected[id]);
  const allFilteredSelected = filtered.length > 0 && filtered.every(v => selected[v.id]);

  const areaLabel = (venue) => {
    const rec = areaById[venue.area];
    if (!rec) return '— None —';
    return rec.market_name ? `${rec.market_name} · ${rec.area_name}` : rec.area_name;
  };

  const toggleVenue = (id) => {
    setSelected(prev => ({ ...prev, [id]: !prev[id] }));
    setSavedCount(0);
  };

  const toggleAll = () => {
    if (allFilteredSelected) {
      setSelected(prev => {
        const next = { ...prev };
        filtered.forEach(v => delete next[v.id]);
        return next;
      });
    } else {
      setSelected(prev => {
        const next = { ...prev };
        filtered.forEach(v => { next[v.id] = true; });
        return next;
      });
    }
    setSavedCount(0);
  };

  const handleApply = async () => {
    if (!target || selectedIds.length === 0) return;
    const rec = areaById[target];
    if (!rec) return;
    const patch = {
      area: rec.area_id,
      area_id: rec.id,
      market_id: rec.market_id || '',
      market_name: rec.market_name || '',
      state_code: rec.state_code || '',
    };
    setSaving(true);
    await Promise.all(selectedIds.map(id => base44.entities.Venue.update(id, patch)));
    setVenues(prev => prev.map(v => selected[v.id] ? { ...v, ...patch } : v));
    const count = selectedIds.length;
    setSelected({});
    setSaving(false);
    setSavedCount(count);
    setTimeout(() => setSavedCount(0), 3000);
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-heading font-bold flex items-center gap-2">
          <MapPin className="w-5 h-5 text-primary" /> Bulk Reassign Area
        </h2>
        <p className="text-sm text-muted-foreground">Select venues, choose an area, and apply it to all of them at once.</p>
      </div>

      {/* Action bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sticky top-0 bg-background z-10 py-1">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search venues or address..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={target || '__pick__'} onValueChange={v => setTarget(v === '__pick__' ? '' : v)}>
          <SelectTrigger className="sm:w-72">
            <SelectValue placeholder="Choose target area" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__pick__" disabled>Choose target area</SelectItem>
            {areas.map(a => (
              <SelectItem key={a.area_id} value={a.area_id}>
                {a.market_name ? `${a.market_name} · ${a.area_name}` : a.area_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={handleApply} disabled={!target || selectedIds.length === 0 || saving} className="flex-shrink-0">
          {saving ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <MapPin className="w-4 h-4 mr-1.5" />}
          Apply to {selectedIds.length} venue{selectedIds.length === 1 ? '' : 's'}
        </Button>
      </div>

      {savedCount > 0 && (
        <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 dark:bg-green-900/10 border border-green-200 rounded-lg px-3 py-2">
          <CheckCircle2 className="w-4 h-4" /> Reassigned {savedCount} venue{savedCount === 1 ? '' : 's'}.
        </div>
      )}

      {/* Table */}
      <div className="border border-border rounded-xl overflow-hidden">
        <div className="grid grid-cols-[auto_2fr_2fr_2fr] bg-muted px-3 py-2 gap-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide items-center">
          <Checkbox checked={allFilteredSelected} onCheckedChange={toggleAll} aria-label="Select all" />
          <span>Venue Name</span>
          <span>Address</span>
          <span>Current Area</span>
        </div>

        {loading ? (
          <div className="space-y-px">
            {[1,2,3,4,5].map(i => <div key={i} className="h-12 bg-muted animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-10 text-center text-muted-foreground text-sm">No venues found</div>
        ) : (
          <div className="divide-y divide-border max-h-[60vh] overflow-y-auto">
            {filtered.map(venue => {
              const isSelected = !!selected[venue.id];
              const label = areaLabel(venue);
              return (
                <div
                  key={venue.id}
                  onClick={() => toggleVenue(venue.id)}
                  className={`grid grid-cols-[auto_2fr_2fr_2fr] items-center px-3 py-2.5 gap-3 text-sm cursor-pointer transition-colors ${isSelected ? 'bg-primary/5' : 'bg-card hover:bg-muted/30'}`}
                >
                  <Checkbox checked={isSelected} onCheckedChange={() => toggleVenue(venue.id)} onClick={e => e.stopPropagation()} aria-label={`Select ${venue.name}`} />
                  <span className="font-medium truncate" title={venue.name}>{venue.name}</span>
                  <span className="text-muted-foreground text-xs truncate" title={venue.address}>{venue.address || '—'}</span>
                  <span className="text-muted-foreground text-xs truncate" title={label}>{label}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <p className="text-xs text-muted-foreground">{filtered.length} venues · {selectedIds.length} selected</p>
    </div>
  );
}