import { useState } from 'react';
import { X } from 'lucide-react';
import { AMENITY_PANELS } from '@/lib/amenities';
import { DEAL_FILTERS } from '@/lib/filterCatalogs';
import { TIME_BUCKETS } from '@/lib/timeBuckets';
import FilterSection from '@/components/filters/FilterSection';
import ChipToggle from '@/components/filters/ChipToggle';
import CatalogChipGroup from '@/components/filters/CatalogChipGroup';
import AmenitySubcategoryGroup from '@/components/filters/AmenitySubcategoryGroup';

// The v3 filter panel, in priority order:
// Venue Type → Menu & Cuisine → Deals → Time → Atmosphere → Seating & Setting →
// Entertainment → Convenience → Accessibility → Occasion
export default function FilterPanelV3({
  venueTypes,
  cuisines,
  selectedVenueTypeIds,
  onVenueTypesChange,
  selectedCuisineIds,
  onCuisinesChange,
  selectedDeals,
  onDealsChange,
  selectedTimes,
  onTimesChange,
  selectedAmenities,
  onAmenitiesChange,
  onClearAll,
  totalSelected,
}) {
  const [openSection, setOpenSection] = useState('');
  const toggleSection = (id) => setOpenSection(prev => (prev === id ? '' : id));

  // Every selection collapses its section back down so the results stay in reach
  const closeAfter = (onChange) => (next) => { onChange(next); setOpenSection(''); };

  const toggleSet = (set, value, onChange) => {
    const next = new Set(set);
    next.has(value) ? next.delete(value) : next.add(value);
    closeAfter(onChange)(next);
  };

  const countIn = (subcategories) =>
    subcategories.reduce(
      (sum, sub) => sum + sub.amenities.filter(a => selectedAmenities.has(a.slug)).length,
      0
    );

  const panelById = Object.fromEntries(AMENITY_PANELS.map(p => [p.id, p]));
  const dealsPanel = panelById.deals;
  const menuPanel = panelById.menu_cuisine;
  const middlePanels = AMENITY_PANELS.filter(
    p => !['deals', 'menu_cuisine', 'occasion'].includes(p.id)
  );
  const occasionPanel = panelById.occasion;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Filters</p>
        {totalSelected > 0 && (
          <button
            onClick={onClearAll}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold text-primary-foreground bg-primary hover:bg-primary/90 shadow-sm transition-colors"
          >
            <X className="w-4 h-4" /> Clear All ({totalSelected})
          </button>
        )}
      </div>

      <FilterSection
        label="Venue Type"
        selectedCount={selectedVenueTypeIds.size}
        open={openSection === 'venue_type'}
        onToggle={() => toggleSection('venue_type')}
      >
        <CatalogChipGroup
          records={venueTypes}
          groupKey="venue_group"
          selectedIds={selectedVenueTypeIds}
          onChange={closeAfter(onVenueTypesChange)}
        />
      </FilterSection>

      {menuPanel && (
        <FilterSection
          label="Menu & Cuisine"
          selectedCount={selectedCuisineIds.size + countIn(menuPanel.subcategories)}
          open={openSection === 'menu_cuisine'}
          onToggle={() => toggleSection('menu_cuisine')}
        >
          <div>
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Cuisine</p>
            <CatalogChipGroup
              records={cuisines}
              groupKey="cuisine_group"
              selectedIds={selectedCuisineIds}
              onChange={closeAfter(onCuisinesChange)}
            />
          </div>
          <AmenitySubcategoryGroup
            subcategories={menuPanel.subcategories}
            selectedAmenities={selectedAmenities}
            onChange={closeAfter(onAmenitiesChange)}
          />
        </FilterSection>
      )}

      <FilterSection
        label="Deals"
        selectedCount={selectedDeals.size + (dealsPanel ? countIn(dealsPanel.subcategories) : 0)}
        open={openSection === 'deals'}
        onToggle={() => toggleSection('deals')}
      >
        <div>
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
            What's discounted
          </p>
          <div className="flex flex-wrap gap-1.5">
            {DEAL_FILTERS.map(d => (
              <ChipToggle
                key={d.id}
                label={d.label}
                active={selectedDeals.has(d.id)}
                onClick={() => toggleSet(selectedDeals, d.id, onDealsChange)}
              />
            ))}
          </div>
        </div>
        {dealsPanel && (
          <AmenitySubcategoryGroup
            subcategories={dealsPanel.subcategories}
            selectedAmenities={selectedAmenities}
            onChange={closeAfter(onAmenitiesChange)}
          />
        )}
      </FilterSection>

      <FilterSection
        label="Time"
        selectedCount={selectedTimes.size}
        open={openSection === 'time'}
        onToggle={() => toggleSection('time')}
      >
        <p className="text-[11px] text-muted-foreground mb-1.5">
          Time of day, read from each venue's happy hour schedule for the selected day.
        </p>
        <div className="flex flex-wrap gap-1.5">
          {TIME_BUCKETS.map(b => (
            <ChipToggle
              key={b.id}
              label={b.label}
              active={selectedTimes.has(b.id)}
              onClick={() => toggleSet(selectedTimes, b.id, onTimesChange)}
            />
          ))}
        </div>
      </FilterSection>

      {middlePanels.map(panel => (
        <FilterSection
          key={panel.id}
          label={panel.label}
          selectedCount={countIn(panel.subcategories)}
          open={openSection === panel.id}
          onToggle={() => toggleSection(panel.id)}
        >
          <AmenitySubcategoryGroup
            subcategories={panel.subcategories}
            selectedAmenities={selectedAmenities}
            onChange={closeAfter(onAmenitiesChange)}
          />
        </FilterSection>
      ))}

      {occasionPanel && (
        <FilterSection
          label="Occasion"
          selectedCount={countIn(occasionPanel.subcategories)}
          open={openSection === 'occasion'}
          onToggle={() => toggleSection('occasion')}
        >
          <AmenitySubcategoryGroup
            subcategories={occasionPanel.subcategories}
            selectedAmenities={selectedAmenities}
            onChange={closeAfter(onAmenitiesChange)}
          />
        </FilterSection>
      )}
    </div>
  );
}