import { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { MapPin, LocateFixed, Loader2 } from 'lucide-react';
import { useLocation as useLocationPrefs } from '@/lib/LocationContext';
import useTerritoryScope from '@/lib/useTerritoryScope';

const sortAreas = (arr) =>
  [...arr].sort(
    (a, b) => (a.display_order || 0) - (b.display_order || 0) || (a.area_name || '').localeCompare(b.area_name || '')
  );

const ALL = '__all__';

/**
 * Explore location filters: Area + City, then Near me + ZIP on one row.
 * State and Market are intentionally not here — the user sets those once in their profile.
 *
 * value: { state_code, market_id, area, city, zip_code } — state_code/market_id are
 * passed through untouched so the caller's filter logic keeps working.
 */
export default function ExploreLocationFilters({ value, onChange, nearActive, locating, onToggleNear, venues }) {
  const [areas, setAreas] = useState([]);
  const { locationPrefs } = useLocationPrefs();

  useEffect(() => {
    base44.entities.LocationArea.list('', 500)
      .then((a) => setAreas(a.filter((x) => x.is_active !== false)))
      .catch(() => setAreas([]));
  }, []);

  // Respect the profile-level territory that the caller already applied, so the
  // area list stays scoped to the user's state/market when they have one.
  const scope = useTerritoryScope({ locationPrefs, areas, venues });
  const areaOptions = useMemo(() => {
    const selectedArea = value.area ? areas.find((a) => a.area_id === value.area) : null;
    const market = value.market_id || scope.market_id || selectedArea?.market_id;
    const state = value.state_code || scope.state_code;
    let list = areas;
    if (market) list = list.filter((a) => a.market_id === market);
    else if (state) list = list.filter((a) => String(a.state_code || '').toUpperCase() === state);
    return sortAreas(list);
  }, [areas, value.market_id, value.state_code, scope.market_id, scope.state_code]);

  const field = 'bg-white text-foreground border-0 shadow-lg h-10 rounded-xl';

  return (
    <div className="grid grid-cols-2 gap-2">
      {/* Area */}
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10 pointer-events-none" />
        <Select
          value={value.area || ALL}
          onValueChange={(val) => onChange({ ...value, area: val === ALL ? '' : val })}
        >
          <SelectTrigger className={`pl-9 ${field}`}>
            <SelectValue placeholder="Local Areas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Local Areas</SelectItem>
            {areaOptions.map((a) => (
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
        className={field}
      />

      {/* Near me */}
      <button
        onClick={onToggleNear}
        disabled={locating}
        className={`flex items-center justify-center gap-1.5 px-3.5 h-10 rounded-xl font-semibold text-sm shadow-lg transition-colors ${
          nearActive ? 'bg-blue-600 text-white' : 'bg-white text-blue-600 hover:bg-blue-50'
        }`}
      >
        {locating ? <Loader2 className="w-4 h-4 animate-spin" /> : <LocateFixed className="w-4 h-4" />}
        Near me
      </button>

      {/* ZIP */}
      <Input
        placeholder="ZIP"
        inputMode="numeric"
        maxLength={5}
        value={value.zip_code || ''}
        onChange={(e) => onChange({ ...value, zip_code: e.target.value.replace(/\D/g, '').slice(0, 5) })}
        className={field}
      />
    </div>
  );
}