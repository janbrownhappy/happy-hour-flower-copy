// Second quick-filter row: one chip per broad venue group (all its venue types at once).
const GROUPS = [
  { label: 'Food Trucks', group: 'Food Trucks & Mobile' },
  { label: 'Restaurants', group: 'Restaurants' },
  { label: 'Breweries', group: 'Breweries & Taprooms' },
  { label: 'Wine Bar', slug: 'wine_bar' },
];

export default function QuickGroupChips({ venueTypes = [], selectedVenueTypeIds, onVenueTypesChange }) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 mt-2 scrollbar-hide -mx-1 px-1">
      {GROUPS.map(({ label, group, slug }) => {
        const ids = venueTypes.filter(t => (slug ? t.slug === slug : t.venue_group === group)).map(t => t.id);
        if (!ids.length) return null;
        const active = ids.every(id => selectedVenueTypeIds.has(id));
        const toggle = () => {
          const next = new Set(selectedVenueTypeIds);
          ids.forEach(id => (active ? next.delete(id) : next.add(id)));
          onVenueTypesChange(next);
        };
        return (
          <button
            key={label}
            type="button"
            onClick={toggle}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
              active
                ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                : 'bg-card border-border text-foreground hover:border-primary'
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}