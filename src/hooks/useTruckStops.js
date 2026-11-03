import { useEffect, useMemo, useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { FOOD_TRUCK_SLUG } from '@/lib/truckStops';

let typeIdsPromise = null;
export function useFoodTruckTypeIds() {
  const [ids, setIds] = useState(new Set());
  useEffect(() => {
    typeIdsPromise = typeIdsPromise || base44.entities.VenueType.filter({ slug: FOOD_TRUCK_SLUG }).then((t) => new Set(t.map((x) => x.id))).catch(() => new Set());
    typeIdsPromise.then(setIds);
  }, []);
  return ids;
}

// Live food-truck stops. Re-fetches on any stop change and ticks `now` every 30s
// so serving windows start and end on open screens without a reload.
export default function useTruckStops({ venueId, pastDays = 2 } = {}) {
  const [stops, setStops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());

  const load = useCallback(async () => {
    const since = new Date(Date.now() - pastDays * 86400000).toISOString();
    const q = { end_at: { $gte: since }, ...(venueId ? { venue_id: venueId } : {}) };
    const rows = await base44.entities.FoodTruckStop.filter(q, 'start_at', 2000).catch(() => []);
    setStops(rows);
    setLoading(false);
  }, [venueId, pastDays]);

  useEffect(() => {
    load();
    const unsub = base44.entities.FoodTruckStop.subscribe(() => load());
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => {
      // subscribe() may return an object or promise rather than a function
      if (typeof unsub === 'function') unsub();
      else if (typeof unsub?.unsubscribe === 'function') unsub.unsubscribe();
      clearInterval(t);
    };
  }, [load]);

  const stopsByVenue = useMemo(() => {
    const m = {};
    for (const s of stops) (m[s.venue_id] = m[s.venue_id] || []).push(s);
    return m;
  }, [stops]);

  return { stops, stopsByVenue, now, loading, reload: load };
}