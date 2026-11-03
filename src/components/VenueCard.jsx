import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import AmenityBadges from '@/components/venue/AmenityBadges';
import { Star, Clock, MapPin, Heart, Crown, Truck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import TierBadge from '@/components/TierBadge';
import VenueDistance from '@/components/venue/VenueDistance';
import TruckStopBadge from '@/components/venue/TruckStopBadge';
import { thumbOf } from '@/lib/imageUpload';

export default function VenueCard({ venue, isFavorite, onToggleFavorite, compact = false, amenitySlugs = [] }) {
  const [photoFailed, setPhotoFailed] = useState(false);
  // Optimistic favorite state — heart flips instantly, then syncs with the parent's source of truth.
  const [optimisticFav, setOptimisticFav] = useState(isFavorite);
  useEffect(() => { setOptimisticFav(isFavorite); }, [isFavorite]);
  const photo = thumbOf(venue, venue.photo_urls?.[0]);
  const today = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date().getDay()];
  // Mobile venues are "open today" when they have a confirmed stop for today.
  // Trucks are resolved by useResolvedVenues: "open" only when a dated stop applies.
  const truck = !!venue._truck;
  const isOpenToday = truck ? !!venue._stop : venue.days?.includes(today);

  const tier = venue.subscription_tier;
  const isPlatinum = tier === 'platinum';
  const isPremium = tier === 'premium';

  return (
    <div className={cn(
      "bg-card rounded-2xl overflow-hidden shadow-sm border hover:shadow-md transition-shadow group",
      isPlatinum ? "border-slate-500/60 shadow-slate-100" : isPremium ? "border-amber-400/60 shadow-amber-100" : "border-border"
    )}>
      {/* Image */}
      <Link to={`/venue/${venue.id}`} className="block relative">
        <div className={cn('bg-muted overflow-hidden', compact ? 'h-36' : 'h-48')}>
          {photo && !photoFailed ? (
            <div className="relative w-full h-full">
              <img src={photo} alt="" aria-hidden="true" className="absolute inset-0 w-full h-full object-cover scale-110 blur-xl opacity-60" />
              <img
                src={photo}
                alt={venue.name}
                className="relative w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                onError={() => setPhotoFailed(true)}
              />
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-accent/20">
              <span className="text-4xl">🌸</span>
            </div>
          )}
        </div>

        {/* Badges */}
        <div className="absolute top-2 left-2 flex gap-1 flex-wrap">
          {isPlatinum && (
            <Badge className="bg-slate-700 text-white text-xs px-2 py-0.5 flex items-center gap-1 shadow-sm">
              <Crown className="w-3 h-3" />Platinum
            </Badge>
          )}
          {isPremium && (
            <Badge className="bg-amber-500 text-white text-xs px-2 py-0.5 flex items-center gap-1 shadow-sm">
              <Crown className="w-3 h-3" />Premium
            </Badge>
          )}
          {truck && (
            <Badge className="bg-orange-600 text-white text-xs px-2 py-0.5 flex items-center gap-1 shadow-sm">
              <Truck className="w-3 h-3" />Food Truck
            </Badge>
          )}
          {venue.is_new && (
            <Badge className="bg-green-500 text-white text-xs px-2 py-0.5">New</Badge>
          )}
          {venue.is_fan_favorite && (
            <Badge className="bg-purple-500 text-white text-xs px-2 py-0.5">Fan Fave</Badge>
          )}
        </div>

        {/* Open today indicator */}
        <div className="absolute top-2 right-2">
          <span className={cn(
            'text-xs font-semibold px-2 py-1 rounded-full',
            isOpenToday ? 'bg-green-500 text-white' : 'bg-black/60 text-white'
          )}>
            {truck ? (isOpenToday ? 'Stop Posted' : 'No Stop Posted') : (isOpenToday ? 'Open Today' : 'Closed Today')}
          </span>
        </div>
      </Link>

      {/* Content */}
      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <Link to={`/venue/${venue.id}`} className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className="font-semibold text-foreground text-sm truncate">{venue.name}</h3>
              <TierBadge tier={tier} />
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
              <MapPin className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">{venue.category}</span>
              <VenueDistance venue={venue} />
            </p>
            {truck && <TruckStopBadge venue={venue} className="mt-1" />}
          </Link>
          <div className="flex items-center gap-2 flex-shrink-0">
            {venue.rating > 0 && (
              <div className="flex items-center gap-0.5">
                <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                <span className="text-xs font-semibold">{venue.rating?.toFixed(1)}</span>
              </div>
            )}
            <button
              onClick={(e) => { e.preventDefault(); setOptimisticFav(v => !v); onToggleFavorite?.(venue); }}
              className="p-1 rounded-full hover:bg-muted transition-colors active:scale-90"
            >
              <Heart className={cn('w-4 h-4 transition-colors', optimisticFav ? 'fill-red-500 text-red-500' : 'text-muted-foreground')} />
            </button>
          </div>
        </div>

        {/* Happy hour times */}
        {venue.happy_hour_start && (
          <div className="mt-2 flex items-center gap-1 text-xs text-primary font-semibold">
            <Clock className="w-3 h-3" />
            <span>{venue.happy_hour_start} – {venue.happy_hour_end}</span>
            {venue.days?.length > 0 && (
              <span className="text-muted-foreground font-normal ml-1">
                · {venue.days.slice(0, 3).join(', ')}{venue.days.length > 3 ? '...' : ''}
              </span>
            )}
          </div>
        )}

        {/* Deals preview */}
        {!compact && venue.deals?.length > 0 && (
          <div className="mt-2 space-y-0.5">
            {(() => {
              // Free venues reveal only 1 deal; paid venues show 2 before the "+X more" line.
              const shown = ['premium', 'platinum'].includes(venue.subscription_tier) ? 2 : 1;
              return (
                <>
                  {venue.deals.slice(0, shown).map((deal, i) => (
                    <p key={i} className="text-xs text-muted-foreground truncate">🍹 {deal}</p>
                  ))}
                  {venue.deals.length > shown && (
                    <p className="text-xs text-primary font-medium">+{venue.deals.length - shown} more deals</p>
                  )}
                </>
              );
            })()}
          </div>
        )}

        {amenitySlugs.length > 0 && (
          <div className="mt-2"><AmenityBadges slugs={amenitySlugs} max={compact ? 3 : 5} /></div>
        )}
      </div>
    </div>
  );
}