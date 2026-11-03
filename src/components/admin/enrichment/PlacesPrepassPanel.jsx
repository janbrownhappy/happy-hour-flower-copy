import { Badge } from '@/components/ui/badge';
import { MapPin, ShieldCheck, AlertTriangle } from 'lucide-react';

const FIELD_LABELS = {
  address: 'Address', city: 'City', zip_code: 'ZIP', phone: 'Phone', website: 'Website',
  category: 'Category', lat: 'Latitude', lng: 'Longitude', price_level: 'Price level',
};

// What Google Places settled before the LLM ran. These facts are authoritative —
// the admin doesn't verify them, they just see what was applied.
export default function PlacesPrepassPanel({ places }) {
  if (!places) return null;

  if (!places.matched) {
    return (
      <div className="flex items-start gap-2 rounded-lg p-3 text-sm bg-amber-500/10 text-amber-700">
        <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
        <span>
          Google Places could not confirm this business{places.reason ? ` (${places.reason})` : ''}. Contact
          details below came from AI research only — verify them manually before saving.
        </span>
      </div>
    );
  }

  const entries = Object.entries(places.fields || {});

  return (
    <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <ShieldCheck className="w-4 h-4 text-primary shrink-0" />
        <span className="text-sm font-semibold">Verified by Google Places</span>
        <Badge variant="outline" className="text-[10px] border-primary/40 text-primary">
          {places.applied ? 'Applied' : 'Ready to save'}
        </Badge>
        {places.amenity_count > 0 && (
          <Badge variant="outline" className="text-[10px]">{places.amenity_count} amenities from attributes</Badge>
        )}
      </div>

      {places.display_name && (
        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
          <MapPin className="w-3 h-3 shrink-0" /> Matched listing: {places.display_name}
        </p>
      )}

      {entries.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 pt-1">
          {entries.map(([key, value]) => (
            <div key={key} className="text-xs flex gap-1.5">
              <span className="text-muted-foreground shrink-0">{FIELD_LABELS[key] || key}:</span>
              <span className="font-medium break-all">{String(value)}</span>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground pt-1">
        {places.applied
          ? 'These contact details are already saved and marked verified. AI only researched happy hour, description and social links.'
          : 'These contact details will be saved and marked verified when you save this new venue.'}
      </p>
    </div>
  );
}