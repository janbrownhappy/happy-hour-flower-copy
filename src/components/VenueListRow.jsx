import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Clock, Heart } from 'lucide-react';
import { cn } from '@/lib/utils';
import VenueDistance from '@/components/venue/VenueDistance';
import TruckStopBadge from '@/components/venue/TruckStopBadge';

export default function VenueListRow({ venue, isFavorite, onToggleFavorite }) {
  // Optimistic favorite state — heart flips instantly, mirrors VenueCard behavior.
  const [optimisticFav, setOptimisticFav] = useState(isFavorite);
  useEffect(() => { setOptimisticFav(isFavorite); }, [isFavorite]);

  const topDeal = venue.deals?.[0];
  const priceLevel = Number(venue.price_level) || 0;

  return (
    <Link
      to={`/venue/${venue.id}`}
      className="flex items-center gap-3 px-3 py-2.5 bg-card border border-border rounded-xl hover:border-primary/50 hover:shadow-sm transition-all"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-sm text-foreground truncate">{venue.name}</h3>
          {priceLevel > 0 && (
            <span className="text-xs font-bold text-green-700 flex-shrink-0">{'$'.repeat(priceLevel)}</span>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2">
          <span className="truncate">{venue.neighborhood || venue.category}</span>
          <VenueDistance venue={venue} />
        </p>
        {venue._truck && <TruckStopBadge venue={venue} className="mt-0.5" />}
        {(topDeal || venue.happy_hour_start) && (
          <p className="text-xs text-primary font-medium truncate mt-0.5 flex items-center gap-1">
            {venue.happy_hour_start && <Clock className="w-3 h-3 flex-shrink-0" />}
            <span className="truncate">
              {topDeal ? `🍹 ${topDeal}` : `${venue.happy_hour_start} – ${venue.happy_hour_end}`}
            </span>
          </p>
        )}
      </div>
      <button
        onClick={(e) => { e.preventDefault(); setOptimisticFav(v => !v); onToggleFavorite?.(venue); }}
        className="p-1.5 rounded-full hover:bg-muted transition-colors active:scale-90 flex-shrink-0"
        aria-label="Toggle favorite"
      >
        <Heart className={cn('w-4 h-4 transition-colors', optimisticFav ? 'fill-red-500 text-red-500' : 'text-muted-foreground')} />
      </button>
    </Link>
  );
}