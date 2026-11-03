import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Search, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { AMENITY_CATEGORIES } from '@/lib/amenities';

const FREE_AMENITY_LIMIT = 4;

export default function AmenitySelectionDialog({ open, onOpenChange, venueId, subscriptionTier = 'free', provenance = 'venue_owner', onSaved }) {
  const isFree = !subscriptionTier || subscriptionTier === 'free';
  const [search, setSearch] = useState('');
  const [selectedSlugs, setSelectedSlugs] = useState(new Set());
  const [existingRecords, setExistingRecords] = useState([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState(new Set(AMENITY_CATEGORIES.map(c => c.id)));

  useEffect(() => {
    if (open && venueId) {
      loadExistingAmenities();
    }
  }, [open, venueId]);

  const loadExistingAmenities = async () => {
    setLoading(true);
    const records = await base44.entities.VenueAmenity.filter({ venue_id: String(venueId) });
    setExistingRecords(records);
    setSelectedSlugs(new Set(records.map(r => r.amenity_slug)));
    setLoading(false);
  };

  const toggleSlug = (slug) => {
    setSelectedSlugs(prev => {
      const next = new Set(prev);
      if (next.has(slug)) {
        next.delete(slug);
      } else {
        // Free tier can pick at most FREE_AMENITY_LIMIT amenities
        if (isFree && next.size >= FREE_AMENITY_LIMIT) return prev;
        next.add(slug);
      }
      return next;
    });
  };

  const atFreeLimit = isFree && selectedSlugs.size >= FREE_AMENITY_LIMIT;

  const toggleCategory = (id) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    const prevSlugs = new Set(existingRecords.map(r => r.amenity_slug));
    const toAdd = [...selectedSlugs].filter(s => !prevSlugs.has(s));
    const toRemove = existingRecords.filter(r => !selectedSlugs.has(r.amenity_slug));
    await Promise.all([
      ...toRemove.map(r => base44.entities.VenueAmenity.delete(r.id)),
      ...toAdd.map(slug => base44.entities.VenueAmenity.create({ venue_id: String(venueId), amenity_slug: slug, provenance })),
    ]);
    setSaving(false);
    onSaved && onSaved();
    onOpenChange(false);
  };

  const isSearching = search.trim().length > 0;

  const filteredCategories = AMENITY_CATEGORIES.map(cat => ({
    ...cat,
    amenities: isSearching
      ? cat.amenities.filter(a => a.label.toLowerCase().includes(search.toLowerCase()))
      : cat.amenities,
  })).filter(cat => cat.amenities.length > 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-800 border-slate-600 text-white max-w-lg w-full max-h-[85vh] flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle className="text-white text-lg">Select Amenities</DialogTitle>
        </DialogHeader>

        <div className="relative shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search amenities..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 bg-slate-700 border-slate-600 text-white placeholder:text-slate-500"
          />
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-4 border-amber-200 border-t-amber-500 rounded-full animate-spin" />
          </div>
        ) : (
          <div className="overflow-y-auto flex-1 space-y-2 pr-1">
            {filteredCategories.map(cat => {
              const isExpanded = isSearching || expandedCategories.has(cat.id);
              const catSelected = cat.amenities.filter(a => selectedSlugs.has(a.slug)).length;
              return (
                <div key={cat.id} className="bg-slate-700/50 rounded-xl overflow-hidden">
                  <button
                    onClick={() => toggleCategory(cat.id)}
                    className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-slate-700 transition-colors"
                  >
                    <span className="text-sm font-semibold text-slate-200">{cat.label}</span>
                    <div className="flex items-center gap-2">
                      {catSelected > 0 && (
                        <span className="text-xs bg-amber-500 text-white rounded-full px-2 py-0.5 font-medium">{catSelected}</span>
                      )}
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                    </div>
                  </button>
                  {isExpanded && (
                    <div className="px-3 pb-3 grid grid-cols-2 gap-1.5">
                      {cat.amenities.map(amenity => {
                        const active = selectedSlugs.has(amenity.slug);
                        const blocked = !active && atFreeLimit;
                        return (
                          <button
                            key={amenity.slug}
                            onClick={() => toggleSlug(amenity.slug)}
                            disabled={blocked}
                            className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left ${
                              active ? 'bg-amber-500 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                            } ${blocked ? 'opacity-40 cursor-not-allowed' : ''}`}
                          >
                            <span>{amenity.label}</span>
                            {active && <Check className="w-3.5 h-3.5 flex-shrink-0 ml-1" />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500">
            {selectedSlugs.size} selected{isFree ? ` / ${FREE_AMENITY_LIMIT}` : ''}
          </div>
          {isFree && (
            <div className="text-xs text-amber-400">
              {atFreeLimit ? 'Free plan limit reached — upgrade for more' : `Free plan: up to ${FREE_AMENITY_LIMIT} amenities`}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="border-slate-600 text-slate-300 hover:bg-slate-700">
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving} className="bg-amber-500 hover:bg-amber-600 text-white">
            {saving ? 'Saving...' : 'Save Amenities'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}