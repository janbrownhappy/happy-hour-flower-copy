import { Zap } from 'lucide-react';
import QuickGroupChips from '@/components/filters/QuickGroupChips';
import { QUICK_VENUE_TYPE_SLUGS } from '@/lib/filterCatalogs';

// One-tap chips: "Happening Now" (derived from each venue's schedule) plus a
// curated set of venue types. Available to every user — the full filter panel
// stays Premium.
export default function QuickFilterChips({
  venueTypes = [],
  selectedVenueTypeIds,
  onVenueTypesChange,
  happeningNow,
  onToggleHappeningNow,
}) {
  const quickTypes = QUICK_VENUE_TYPE_SLUGS
    .map(slug => venueTypes.find(t => t.slug === slug))
    .filter(Boolean);

  const toggle = (id) => {
    const next = new Set(selectedVenueTypeIds);
    next.has(id) ? next.delete(id) : next.add(id);
    onVenueTypesChange(next);
  };

  return (
    <div>
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Quick filters</p>
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1">
        <button
          type="button"
          onClick={onToggleHappeningNow}
          className={`flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${
            happeningNow
              ? 'bg-green-600 text-white border-green-600 shadow-sm'
              : 'bg-card border-border text-foreground hover:border-green-500'
          }`}
        >
          <Zap className="w-3.5 h-3.5" /> Happening Now
        </button>
        {quickTypes.map(t => {
          const active = selectedVenueTypeIds.has(t.id);
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => toggle(t.id)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                active
                  ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                  : 'bg-card border-border text-foreground hover:border-primary'
              }`}
            >
              {t.name}
            </button>
          );
        })}
      </div>
      <QuickGroupChips venueTypes={venueTypes} selectedVenueTypeIds={selectedVenueTypeIds} onVenueTypesChange={onVenueTypesChange} />
    </div>
  );
}