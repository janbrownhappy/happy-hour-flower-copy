import { Truck, MapPin } from 'lucide-react';
import { formatStopTime, stopLabel, stopPhase } from '@/lib/truckStops';

// Compact "where this truck is" line for cards, list rows and map popups.
// Expects a venue already resolved by useResolvedVenues (venue._stop).
export default function TruckStopBadge({ venue, className = '' }) {
  const stop = venue?._stop;
  if (!stop) {
    return (
      <p className={`text-xs text-muted-foreground flex items-center gap-1 ${className}`}>
        <Truck className="w-3 h-3 flex-shrink-0" /> No upcoming location posted
      </p>
    );
  }
  const phase = stopPhase(stop);
  const live = phase === 'serving' || phase === 'scheduled_now';
  const f = formatStopTime(stop);
  return (
    <div className={`min-w-0 ${className}`}>
      <p className="text-xs text-primary font-semibold flex items-center gap-1 min-w-0">
        <MapPin className="w-3 h-3 flex-shrink-0" />
        <span className="truncate">{stop.location_name} · {f.day} {f.hours}</span>
      </p>
      {live && (
        <p className={`text-[11px] font-semibold ${phase === 'serving' ? 'text-green-600' : 'text-amber-600'}`}>{stopLabel(stop).text}</p>
      )}
    </div>
  );
}