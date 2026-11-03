import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { VENUE_TIERS, venueHasFeature } from '@/lib/featureTiers';
import { Settings2, Plus, Trash2, Loader2, Search, AlertCircle } from 'lucide-react';

// Flat list of every venue feature slug, with the tier it first appears in.
const ALL_VENUE_FEATURES = [
  ...VENUE_TIERS.free.features.map((f) => ({ key: f, tier: 'free' })),
  ...VENUE_TIERS.premium.features.map((f) => ({ key: f, tier: 'premium' })),
  ...VENUE_TIERS.platinum.features.map((f) => ({ key: f, tier: 'platinum' })),
];

const prettify = (slug) =>
  slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

const tierBadge = {
  free: 'bg-muted text-muted-foreground',
  premium: 'bg-amber-100 text-amber-700',
  platinum: 'bg-violet-100 text-violet-700',
};

export default function AdminVenueOverrides() {
  const [venues, setVenues] = useState([]);
  const [overrides, setOverrides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editVenue, setEditVenue] = useState(null);
  const [savingKey, setSavingKey] = useState(null);

  const load = async () => {
    setLoading(true);
    const [v, o] = await Promise.all([
      base44.entities.Venue.list(),
      base44.entities.VenueFeatureOverride.list(),
    ]);
    setVenues(v);
    setOverrides(o);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  // Overrides indexed by venue_id for O(1) lookups.
  const overridesByVenue = {};
  overrides.forEach((o) => {
    (overridesByVenue[o.venue_id] = overridesByVenue[o.venue_id] || []).push(o);
  });

  const filteredVenues = venues.filter((v) =>
    (v.name || '').toLowerCase().includes(search.toLowerCase())
  );

  // Only show venues with overrides at the top, then the rest (searchable).
  const venuesWithOverrides = filteredVenues.filter((v) => (overridesByVenue[v.id] || []).length > 0);

  const setOverride = async (venue, featureKey, isEnabled) => {
    setSavingKey(featureKey);
    const existing = (overridesByVenue[venue.id] || []).find((o) => o.feature_key === featureKey);
    if (existing) {
      await base44.entities.VenueFeatureOverride.update(existing.id, { is_enabled: isEnabled });
    } else {
      await base44.entities.VenueFeatureOverride.create({
        venue_id: venue.id,
        venue_name: venue.name,
        feature_key: featureKey,
        is_enabled: isEnabled,
      });
    }
    const fresh = await base44.entities.VenueFeatureOverride.list();
    setOverrides(fresh);
    setSavingKey(null);
  };

  const clearOverride = async (venue, featureKey) => {
    setSavingKey(featureKey);
    const existing = (overridesByVenue[venue.id] || []).find((o) => o.feature_key === featureKey);
    if (existing) {
      await base44.entities.VenueFeatureOverride.delete(existing.id);
      const fresh = await base44.entities.VenueFeatureOverride.list();
      setOverrides(fresh);
    }
    setSavingKey(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <div className="flex items-center gap-2">
          <Settings2 className="w-5 h-5 text-amber-500" />
          <h2 className="font-heading text-2xl font-bold">Venue Feature Overrides</h2>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Each venue inherits the feature set of its subscription tier by default. Add a
          one-off override here to force a specific feature ON or OFF for an individual
          venue — useful for trials, nudges, or à-la-carte add-ons.
        </p>
        <Badge variant="outline" className="mt-3">
          {overrides.length} active override{overrides.length === 1 ? '' : 's'} across {venuesWithOverrides.length} venue{venuesWithOverrides.length === 1 ? '' : 's'}
        </Badge>
      </div>

      <div className="relative mb-4 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search a venue to manage its features…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Venues that already have overrides */}
      {venuesWithOverrides.length > 0 && (
        <div className="space-y-3 mb-6">
          {venuesWithOverrides.map((venue) => (
            <Card key={venue.id} className="p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold leading-tight truncate">{venue.name}</p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {venue.subscription_tier || 'free'} tier baseline
                  </p>
                </div>
                <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setEditVenue(venue)}>
                  <Settings2 className="w-3.5 h-3.5" /> Manage
                </Button>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-3">
                {(overridesByVenue[venue.id] || []).map((o) => (
                  <Badge
                    key={o.id}
                    variant="outline"
                    className={`gap-1 ${o.is_enabled !== false ? 'border-green-300 text-green-700' : 'border-red-300 text-red-700'}`}
                  >
                    {o.is_enabled !== false ? 'ON' : 'OFF'}: {prettify(o.feature_key)}
                  </Badge>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Search results to add a new override */}
      {search.trim() && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Search results</p>
          {filteredVenues.slice(0, 20).map((venue) => (
            <Card key={venue.id} className="p-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium leading-tight truncate">{venue.name}</p>
                <p className="text-xs text-muted-foreground capitalize">{venue.subscription_tier || 'free'} tier</p>
              </div>
              <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setEditVenue(venue)}>
                <Plus className="w-3.5 h-3.5" /> Override
              </Button>
            </Card>
          ))}
          {filteredVenues.length === 0 && (
            <p className="text-sm text-muted-foreground py-4">No venues match "{search}".</p>
          )}
        </div>
      )}

      {!search.trim() && venuesWithOverrides.length === 0 && (
        <Card className="p-8 text-center">
          <AlertCircle className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="font-medium">No overrides yet</p>
          <p className="text-sm text-muted-foreground mt-1">Search for a venue above to grant or revoke a specific feature.</p>
        </Card>
      )}

      {/* Per-venue feature editor */}
      <Dialog open={!!editVenue} onOpenChange={(o) => !o && setEditVenue(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editVenue?.name}</DialogTitle>
            <p className="text-sm text-muted-foreground capitalize">
              {editVenue?.subscription_tier || 'free'} tier baseline — toggle a feature to override it
            </p>
          </DialogHeader>
          {editVenue && (
            <div className="space-y-1.5">
              {ALL_VENUE_FEATURES.map(({ key, tier }) => {
                const ov = (overridesByVenue[editVenue.id] || []).find((o) => o.feature_key === key);
                const baseline = venueHasFeature(editVenue.subscription_tier || 'free', key);
                const effective = ov ? ov.is_enabled !== false : baseline;
                return (
                  <div key={key} className="flex items-center justify-between gap-3 py-2 px-3 rounded-lg hover:bg-muted/40">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-sm leading-tight">{prettify(key)}</p>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full capitalize ${tierBadge[tier]}`}>{tier}</span>
                        {ov && <Badge variant="secondary" className="text-[10px]">Overridden</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Baseline: {baseline ? 'included' : 'not included'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {savingKey === key && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
                      {ov && (
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground" onClick={() => clearOverride(editVenue, key)} title="Remove override (revert to tier baseline)">
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                      <Switch
                        checked={effective}
                        onCheckedChange={(enabled) => setOverride(editVenue, key, enabled)}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditVenue(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}