import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Search, Upload, RefreshCw } from 'lucide-react';

export default function MissingPhotoRow({ venue, onUpload, onRetry, retrying }) {
  const googleUrl = `https://www.google.com/search?tbm=isch&q=${encodeURIComponent([venue.name, venue.city, venue.state_code].filter(Boolean).join(' '))}`;
  return (
    <div className="flex items-center gap-3 p-3 bg-card border border-border rounded-xl">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-medium text-sm truncate">{venue.name}</p>
          {venue.photo_needs_manual
            ? <Badge variant="outline" className="text-xs py-0 border-amber-400 text-amber-700">Auto-fetch failed</Badge>
            : <Badge variant="secondary" className="text-xs py-0">Not tried yet</Badge>}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 truncate">
          {[venue.address, venue.city].filter(Boolean).join(', ') || 'No address'}
          {venue.photo_fetch_reason ? ` · ${venue.photo_fetch_reason}` : ''}
        </p>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        <Button variant="ghost" size="sm" asChild>
          <a href={googleUrl} target="_blank" rel="noopener noreferrer"><Search className="w-4 h-4" /> Images</a>
        </Button>
        {venue.website && (
          <Button variant="ghost" size="sm" asChild>
            <a href={venue.website.startsWith('http') ? venue.website : `https://${venue.website}`} target="_blank" rel="noopener noreferrer"><ExternalLink className="w-4 h-4" /> Site</a>
          </Button>
        )}
        <Button variant="outline" size="sm" onClick={() => onRetry(venue)} disabled={retrying}>
          <RefreshCw className={`w-4 h-4 ${retrying ? 'animate-spin' : ''}`} /> Retry
        </Button>
        <Button size="sm" onClick={() => onUpload(venue)}><Upload className="w-4 h-4" /> Upload</Button>
      </div>
    </div>
  );
}