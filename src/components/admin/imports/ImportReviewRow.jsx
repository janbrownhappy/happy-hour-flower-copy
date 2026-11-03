import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Check, Trash2, ExternalLink, Loader2, Facebook } from 'lucide-react';

export default function ImportReviewRow({ venue, amenityCount = 0, selected, onSelect, onApprove, onDelete, busy }) {
  const photo = venue.photo_urls?.[0];
  return (
    <div className="flex items-center gap-3 p-3 border-b last:border-b-0">
      <Checkbox checked={selected} onCheckedChange={onSelect} />
      {photo ? <img src={photo} alt="" className="w-12 h-12 rounded object-cover shrink-0" /> : <div className="w-12 h-12 rounded bg-muted shrink-0" />}
      <div className="flex-1 min-w-0">
        <div className="font-semibold truncate">{venue.name}</div>
        <div className="text-xs text-muted-foreground truncate">
          {[venue.address, venue.city].filter(Boolean).join(', ') || 'No address'}
          {venue.category ? ` · ${venue.category}` : ''}
          {!venue.lat ? ' · No map location' : ''}
        </div>
        <div className="text-xs space-y-0.5 mt-0.5">
          {venue.website && (
            <a href={venue.website} target="_blank" rel="noreferrer" className="text-primary flex items-center gap-1 min-h-0 truncate">
              <ExternalLink className="w-3 h-3 shrink-0" /><span className="truncate">{venue.website.replace(/^https?:\/\/(www\.)?/, '')}</span>
            </a>
          )}
          {venue.facebook_url && (
            <a href={venue.facebook_url} target="_blank" rel="noreferrer" className="text-primary flex items-center gap-1 min-h-0 truncate">
              <Facebook className="w-3 h-3 shrink-0" /><span className="truncate">{venue.facebook_url.replace(/^https?:\/\/(www\.)?/, '')}</span>
            </a>
          )}
          <div className="text-muted-foreground">{amenityCount} {amenityCount === 1 ? 'amenity' : 'amenities'}</div>
        </div>
      </div>
      {busy ? <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /> : (
        <div className="flex gap-2">
          <Button size="sm" onClick={onApprove}><Check className="w-4 h-4" />Approve</Button>
          <Button size="sm" variant="outline" onClick={onDelete} className="text-destructive"><Trash2 className="w-4 h-4" /></Button>
        </div>
      )}
    </div>
  );
}