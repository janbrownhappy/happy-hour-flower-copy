import ChipToggle from '@/components/filters/ChipToggle';

export default function AmenitySubcategoryGroup({ subcategories, selectedAmenities, onChange }) {
  const toggle = (slug) => {
    const next = new Set(selectedAmenities);
    next.has(slug) ? next.delete(slug) : next.add(slug);
    onChange(next);
  };

  return (
    <div className="space-y-2.5">
      {subcategories.map(sub => (
        <div key={sub.id}>
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">{sub.label}</p>
          <div className="flex flex-wrap gap-1.5">
            {sub.amenities.map(a => (
              <ChipToggle
                key={a.slug}
                label={a.label}
                active={selectedAmenities.has(a.slug)}
                onClick={() => toggle(a.slug)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}