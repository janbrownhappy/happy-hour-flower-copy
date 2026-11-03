import ChipToggle from '@/components/filters/ChipToggle';

// Renders catalog records (VenueType / Cuisine) as chips, grouped by `groupKey`.
// Selection is stored as Base44 record ids.
export default function CatalogChipGroup({ records, groupKey, selectedIds, onChange }) {
  const groups = {};
  for (const r of records) {
    const key = r[groupKey] || 'Other';
    if (!groups[key]) groups[key] = [];
    groups[key].push(r);
  }

  const toggle = (id) => {
    const next = new Set(selectedIds);
    next.has(id) ? next.delete(id) : next.add(id);
    onChange(next);
  };

  if (!records.length) {
    return <p className="text-xs text-muted-foreground">Catalog not seeded yet.</p>;
  }

  return (
    <div className="space-y-2.5">
      {Object.entries(groups).map(([group, items]) => (
        <div key={group}>
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">{group}</p>
          <div className="flex flex-wrap gap-1.5">
            {items.map(item => (
              <ChipToggle
                key={item.id}
                label={item.name}
                active={selectedIds.has(item.id)}
                onClick={() => toggle(item.id)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}