import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Label } from '@/components/ui/label';
import CatalogChipGroup from '@/components/filters/CatalogChipGroup';

// Venue type + cuisine multi-select for the admin/owner venue editor.
// Stores Base44 record ids on the venue (venue_type_ids / cuisine_ids).
export default function VenueCatalogPicker({ venueTypeIds = [], cuisineIds = [], onChange }) {
  const [venueTypes, setVenueTypes] = useState([]);
  const [cuisines, setCuisines] = useState([]);

  useEffect(() => {
    Promise.all([
      base44.entities.VenueType.list('sort_order', 200).catch(() => []),
      base44.entities.Cuisine.list('sort_order', 200).catch(() => []),
    ]).then(([t, c]) => {
      setVenueTypes(t.filter(x => x.is_active !== false));
      setCuisines(c.filter(x => x.is_active !== false));
    });
  }, []);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Venue Types ({venueTypeIds.length})</Label>
        <CatalogChipGroup
          records={venueTypes}
          groupKey="venue_group"
          selectedIds={new Set(venueTypeIds)}
          onChange={(next) => onChange({ venue_type_ids: [...next], cuisine_ids: cuisineIds })}
        />
      </div>
      <div className="space-y-2">
        <Label>Cuisines ({cuisineIds.length})</Label>
        <CatalogChipGroup
          records={cuisines}
          groupKey="cuisine_group"
          selectedIds={new Set(cuisineIds)}
          onChange={(next) => onChange({ venue_type_ids: venueTypeIds, cuisine_ids: [...next] })}
        />
      </div>
    </div>
  );
}