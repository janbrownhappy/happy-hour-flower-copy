import { useMemo } from 'react';
import useTruckStops, { useFoodTruckTypeIds } from '@/hooks/useTruckStops';
import { applyTruckStops, intervalFor } from '@/lib/truckStops';

// Venues with food trucks resolved to their stop for the requested time
// (mode: now | today | tonight | tomorrow | date | weekday). Fixed venues pass through unchanged.
export default function useResolvedVenues(venues, mode = 'today', opts = {}) {
  const truckTypeIds = useFoodTruckTypeIds();
  const { stopsByVenue, now } = useTruckStops();
  const key = `${mode}|${opts.date || ''}|${opts.weekday || ''}`;
  return useMemo(() => {
    const interval = intervalFor(mode, now, opts);
    return applyTruckStops(venues, truckTypeIds, stopsByVenue, interval, now);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [venues, truckTypeIds, stopsByVenue, now, key]);
}