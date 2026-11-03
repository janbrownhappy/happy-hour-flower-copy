import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { MapPin, Clock, Star, Phone, Globe } from 'lucide-react';

export default function VenuePreviewDialog({ venue, onClose }) {
  if (!venue) return null;
  const photo = venue.photo_urls?.[0];
  const deals = venue.deals || [];
  const days = venue.days || [];
  return (
    <Dialog open={!!venue} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md p-0 overflow-hidden max-h-[90vh] overflow-y-auto">
        {photo && <img src={photo} alt={venue.name} className="w-full h-48 object-cover" />}
        <div className="p-5 space-y-4">
          <DialogHeader>
            <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide">How your venue looks in the app</p>
            <DialogTitle className="font-heading text-2xl text-amber-900">{venue.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-1.5 text-sm text-amber-900/70">
            {(venue.address || venue.city) && <p className="flex items-center gap-2"><MapPin className="w-4 h-4" />{[venue.address, venue.city].filter(Boolean).join(', ')}</p>}
            {venue.rating > 0 && <p className="flex items-center gap-2"><Star className="w-4 h-4 text-amber-500" />{Number(venue.rating).toFixed(1)}{venue.review_count ? ` (${venue.review_count} reviews)` : ''}</p>}
            {(venue.happy_hour_start || days.length > 0) && <p className="flex items-center gap-2"><Clock className="w-4 h-4" />{days.join(', ')} {venue.happy_hour_start && `· ${venue.happy_hour_start}–${venue.happy_hour_end || ''}`}</p>}
            {venue.phone && <p className="flex items-center gap-2"><Phone className="w-4 h-4" />{venue.phone}</p>}
            {venue.website && <p className="flex items-center gap-2 truncate"><Globe className="w-4 h-4" />{venue.website}</p>}
          </div>
          {venue.description && <p className="text-sm text-amber-900/80">{venue.description}</p>}
          <div>
            <p className="text-sm font-semibold text-amber-900 mb-2">Happy hour deals</p>
            {deals.length > 0 ? (
              <ul className="space-y-1">{deals.map((d, i) => <li key={i} className="text-sm bg-amber-50 rounded-lg px-3 py-2 text-amber-900">{d}</li>)}</ul>
            ) : (
              <p className="text-sm text-amber-900/60">No deals listed yet. Claim your venue to add them.</p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}