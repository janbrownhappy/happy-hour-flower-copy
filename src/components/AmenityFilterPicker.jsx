import { useState } from 'react';
import { Check, ChevronDown, ChevronUp, X } from 'lucide-react';
import { AMENITY_CATEGORIES, ALL_AMENITIES } from '@/lib/amenities';

export default function AmenityFilterPicker({ selectedAmenities, onChange, onAfterSelect }) {
  const [expandedCategories, setExpandedCategories] = useState(new Set());

  const toggle = (slug, catId) => {
    const next = new Set(selectedAmenities);
    next.has(slug) ? next.delete(slug) : next.add(slug);
    onChange(next);
    setExpandedCategories(new Set());
    onAfterSelect?.();
  };

  const toggleCategory = (id) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectedLabels = ALL_AMENITIES.filter(a => selectedAmenities.has(a.slug));

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Amenities & Filters</p>
        {selectedAmenities.size > 0 && (
          <button
            onClick={() => onChange(new Set())}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold text-white bg-primary hover:bg-primary/90 shadow-sm transition-colors"
          >
            <X className="w-4 h-4" />
            Clear All ({selectedAmenities.size})
          </button>
        )}
      </div>

      {/* Selected amenity chips */}
      {selectedLabels.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {selectedLabels.map(a => (
            <button
              key={a.slug}
              onClick={() => { const next = new Set(selectedAmenities); next.delete(a.slug); onChange(next); }}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-primary text-white border border-primary"
            >
              {a.label} <X className="w-3 h-3" />
            </button>
          ))}
        </div>
      )}

      <div className="space-y-1.5">
        {AMENITY_CATEGORIES.map(cat => {
          const isExpanded = expandedCategories.has(cat.id);
          const catSelected = cat.amenities.filter(a => selectedAmenities.has(a.slug)).length;
          return (
            <div key={cat.id} className="border border-border rounded-lg overflow-hidden">
              <button
                onClick={() => toggleCategory(cat.id)}
                className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-muted/50 transition-colors"
              >
                <span className="text-xs font-semibold text-foreground">{cat.label}</span>
                <div className="flex items-center gap-1.5">
                  {catSelected > 0 && (
                    <span className="text-xs bg-primary text-white rounded-full px-1.5 py-0.5 font-medium leading-none">{catSelected}</span>
                  )}
                  {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
                </div>
              </button>
              {isExpanded && (
                <div className="px-2 pb-2 flex flex-wrap gap-1.5 border-t border-border pt-2">
                  {cat.amenities.map(amenity => {
                    const active = selectedAmenities.has(amenity.slug);
                    return (
                      <button
                        key={amenity.slug}
                        onClick={() => toggle(amenity.slug, cat.id)}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors ${
                          active
                            ? 'bg-primary text-white border-primary'
                            : 'bg-background border-border hover:border-primary text-foreground'
                        }`}
                      >
                        {active && <Check className="w-3 h-3" />}
                        {amenity.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}