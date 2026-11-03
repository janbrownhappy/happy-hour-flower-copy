import { useState, useEffect, useMemo, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Sparkles, Eye, Heart } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AMENITY_CATEGORIES, ALL_AMENITIES } from '@/lib/amenities';
import { useAdminLocation, venueInTerritory, hasTerritory } from '@/lib/AdminLocationContext';
import AmenityMaintenancePanel from '@/components/admin/amenity/AmenityMaintenancePanel';
import AmenityProposalQueue from '@/components/admin/amenity/AmenityProposalQueue';

const SLUG_LABEL = Object.fromEntries(ALL_AMENITIES.map(a => [a.slug, a.label]));

export default function AmenityAnalytics() {
  const { locationFilter } = useAdminLocation();
  const [allVenues, setAllVenues] = useState([]);
  const [venueAmenities, setVenueAmenities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [drill, setDrill] = useState(null); // { slug, label, venues[] }

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      base44.entities.Venue.list('-view_count', 1000),
      base44.entities.VenueAmenity.list('-created_date', 10000).catch(() => []),
    ]).then(([v, va]) => {
      setAllVenues(v);
      setVenueAmenities(va);
    }).finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  const venues = useMemo(() =>
    hasTerritory(locationFilter) ? allVenues.filter(v => venueInTerritory(v, locationFilter)) : allVenues,
  [allVenues, locationFilter]);

  const venueById = useMemo(() => {
    const map = {};
    venues.forEach(v => { map[String(v.id)] = v; });
    return map;
  }, [venues]);

  // slug -> array of venues that have it
  const venuesBySlug = useMemo(() => {
    const map = {};
    venueAmenities.forEach(a => {
      const venue = venueById[String(a.venue_id)];
      if (!venue) return;
      if (!map[a.amenity_slug]) map[a.amenity_slug] = [];
      map[a.amenity_slug].push(venue);
    });
    return map;
  }, [venueAmenities, venueById]);

  // Flat ranked list of every amenity by venue count
  const ranked = useMemo(() => {
    return ALL_AMENITIES
      .map(a => ({ ...a, count: venuesBySlug[a.slug]?.length || 0 }))
      .sort((a, b) => b.count - a.count);
  }, [venuesBySlug]);

  const taggedVenueCount = useMemo(
    () => new Set(venueAmenities.map(a => String(a.venue_id)).filter(id => venueById[id])).size,
    [venueAmenities, venueById]
  );

  // Per-category breakdown
  const categoryBreakdown = useMemo(() => {
    return AMENITY_CATEGORIES.map(cat => {
      const items = cat.amenities
        .map(a => ({ ...a, count: venuesBySlug[a.slug]?.length || 0 }))
        .sort((a, b) => b.count - a.count);
      return { ...cat, items, total: items.reduce((s, i) => s + i.count, 0) };
    }).sort((a, b) => b.total - a.total);
  }, [venuesBySlug]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-4 border-amber-200 border-t-amber-500 rounded-full animate-spin" />
      </div>
    );
  }

  const topUsed = ranked.filter(a => a.count > 0).slice(0, 20);
  const unused = ranked.filter(a => a.count === 0);
  const maxCount = topUsed[0]?.count || 1;

  return (
    <div className="space-y-6">
      {/* Header + summary */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Sparkles className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="text-base font-semibold">Amenity Analytics</h3>
          <p className="text-xs text-muted-foreground">How amenities are distributed across your venues</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-2xl font-bold">{ALL_AMENITIES.length}</p>
          <p className="text-xs text-muted-foreground">Total amenity types</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-2xl font-bold">{ranked.filter(a => a.count > 0).length}</p>
          <p className="text-xs text-muted-foreground">In use</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-2xl font-bold">{taggedVenueCount.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">Venues tagged</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-2xl font-bold">{venueAmenities.length.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">Total assignments</p>
        </div>
      </div>

      <AmenityMaintenancePanel onChanged={load} />

      <AmenityProposalQueue />

      {/* Top amenities — horizontal bars, click to drill */}
      <div className="bg-card border border-border rounded-xl p-4">
        <h3 className="text-sm font-semibold mb-1">Most Common Amenities</h3>
        <p className="text-xs text-muted-foreground mb-4">Click any amenity to see which venues offer it</p>
        {topUsed.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-8">No amenities assigned yet</p>
        ) : (
          <div className="space-y-1.5">
            {topUsed.map(a => {
              const pct = Math.round((a.count / maxCount) * 100);
              return (
                <button
                  key={a.slug}
                  onClick={() => setDrill({ slug: a.slug, label: a.label, venues: (venuesBySlug[a.slug] || []).slice().sort((x, y) => (y.view_count || 0) - (x.view_count || 0)) })}
                  className="w-full flex items-center gap-3 group text-left hover:bg-muted/40 rounded-lg px-2 py-1 transition-colors"
                >
                  <span className="text-xs text-muted-foreground w-36 truncate flex-shrink-0 group-hover:text-foreground transition-colors">{a.label}</span>
                  <div className="flex-1 h-5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs font-semibold w-8 text-right flex-shrink-0">{a.count}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Category breakdown */}
      <div className="bg-card border border-border rounded-xl p-4">
        <h3 className="text-sm font-semibold mb-1">By Category</h3>
        <p className="text-xs text-muted-foreground mb-4">Amenity assignments grouped by category</p>
        <div className="space-y-4">
          {categoryBreakdown.map(cat => (
            <div key={cat.id}>
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-xs font-semibold">{cat.label}</p>
                <span className="text-xs text-muted-foreground">{cat.total} assignments</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {cat.items.map(a => (
                  <button
                    key={a.slug}
                    onClick={() => a.count > 0 && setDrill({ slug: a.slug, label: a.label, venues: (venuesBySlug[a.slug] || []).slice().sort((x, y) => (y.view_count || 0) - (x.view_count || 0)) })}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                      a.count > 0
                        ? 'bg-primary/5 border-primary/30 text-foreground hover:bg-primary/10'
                        : 'bg-muted/40 border-border text-muted-foreground cursor-default'
                    }`}
                  >
                    {a.label}
                    <span className={`font-bold ${a.count > 0 ? 'text-primary' : 'text-muted-foreground'}`}>{a.count}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Unused amenities */}
      {unused.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="text-sm font-semibold mb-1">Unused Amenities <span className="text-muted-foreground font-normal">({unused.length})</span></h3>
          <p className="text-xs text-muted-foreground mb-3">No venue currently offers these</p>
          <div className="flex flex-wrap gap-1.5">
            {unused.map(a => (
              <span key={a.slug} className="px-2.5 py-1 rounded-full text-xs bg-muted/40 border border-border text-muted-foreground">{a.label}</span>
            ))}
          </div>
        </div>
      )}

      {/* Drill-down dialog */}
      <Dialog open={!!drill} onOpenChange={() => setDrill(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{drill?.label} <span className="text-muted-foreground font-normal text-sm">({drill?.venues.length} venues)</span></DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto space-y-2 pr-1">
            {drill?.venues.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">No venues offer this amenity</p>
            ) : drill?.venues.map(v => (
              <div key={v.id} className="flex items-center justify-between border border-border rounded-lg px-3 py-2.5 bg-card">
                <div>
                  <p className="text-sm font-semibold">{v.name}</p>
                  <p className="text-xs text-muted-foreground">{v.market_name || v.neighborhood?.replace(/^[A-Z]+-\d+\s*/, '') || v.city || '—'}</p>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground flex-shrink-0">
                  <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{(v.view_count || 0).toLocaleString()}</span>
                  <span className="flex items-center gap-1 text-rose-500"><Heart className="w-3 h-3" />{(v.favorite_count || 0).toLocaleString()}</span>
                  <span className={`px-2 py-0.5 rounded-full font-semibold ${v.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-muted text-muted-foreground'}`}>{v.status || 'active'}</span>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}