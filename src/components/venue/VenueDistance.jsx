import { Navigation } from 'lucide-react';
import useUserCoords, { milesBetween } from '@/hooks/useUserCoords';

export default function VenueDistance({ venue, className = '' }) {
  const coords = useUserCoords();
  if (!coords || !Number.isFinite(venue?.lat) || !Number.isFinite(venue?.lng)) return null;

  const miles = milesBetween(coords.lat, coords.lng, venue.lat, venue.lng);
  const label = miles < 10 ? miles.toFixed(1) : Math.round(miles);

  return (
    <span className={`inline-flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0 ${className}`}>
      <Navigation className="w-3 h-3" />
      {label} mi
    </span>
  );
}