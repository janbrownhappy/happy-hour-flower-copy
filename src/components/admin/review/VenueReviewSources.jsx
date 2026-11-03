import { Badge } from '@/components/ui/badge';
import { ExternalLink, Link2, Search, ShieldCheck } from 'lucide-react';

// Verification links + cited amenity evidence for the venue under review.
export default function VenueReviewSources({ venue, amenities }) {
  const q = encodeURIComponent([venue.name, venue.address, venue.city, venue.state_code].filter(Boolean).join(' '));

  const links = [
    venue.website && { label: 'Official website', url: venue.website },
    { label: 'Google Maps listing', url: `https://www.google.com/maps/search/?api=1&query=${q}` },
    { label: 'Google search (happy hour)', url: `https://www.google.com/search?q=${q}+happy+hour` },
    venue.facebook_url && { label: 'Facebook page', url: venue.facebook_url },
    venue.instagram_url && { label: 'Instagram profile', url: venue.instagram_url },
    venue.phone && { label: 'Reverse phone lookup', url: `https://www.google.com/search?q=${encodeURIComponent(venue.phone)}` },
  ].filter(Boolean);

  return (
    <div className="border border-border rounded-xl overflow-hidden bg-card">
      <div className="px-4 py-2 bg-muted text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        Sources to verify against
      </div>

      <div className="divide-y divide-border">
        {links.map(l => (
          <a
            key={l.label}
            href={l.url}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2.5 flex items-center gap-2 text-sm hover:bg-muted/50 transition-colors"
          >
            {l.label.startsWith('Google') ? <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" /> : <Link2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
            <span className="flex-1 truncate">{l.label}</span>
            <ExternalLink className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          </a>
        ))}
      </div>

      <div className="px-4 py-3 border-t border-border">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
          Cited amenity evidence ({amenities.length})
        </p>
        {amenities.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">No amenities researched for this venue yet.</p>
        ) : (
          <div className="space-y-2">
            {amenities.map(a => {
              const fromPlaces = a.source === 'Google Places attributes';
              return (
                <div key={a.id} className="text-xs">
                  <Badge
                    variant="outline"
                    className={`text-[10px] ${fromPlaces ? 'border-primary/50 text-primary bg-primary/5' : ''}`}
                  >
                    {a.amenity_slug}
                  </Badge>
                  <p className={`mt-0.5 break-words ${fromPlaces ? 'text-primary/80' : 'text-muted-foreground'}`}>
                    {a.source || 'No source cited — verify manually'}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="px-4 py-2.5 border-t border-border bg-muted/30 space-y-1">
        <p className="text-xs text-muted-foreground flex items-center gap-1.5 flex-wrap">
          Contacts verified:{' '}
          {venue.contacts_verified ? (
            <span className="inline-flex items-center gap-1 text-green-600 font-semibold">
              <ShieldCheck className="w-3.5 h-3.5" />
              Yes{venue.contacts_verified_source ? ` · ${venue.contacts_verified_source}` : ''}
            </span>
          ) : (
            <span className="text-amber-600 font-medium">Not yet — check the links above</span>
          )}
        </p>
        {venue.contacts_verified_source === 'google_places' && (
          <p className="text-xs text-muted-foreground">
            Address, phone, website and category came straight from Google Places — no manual check needed.
          </p>
        )}
      </div>
    </div>
  );
}