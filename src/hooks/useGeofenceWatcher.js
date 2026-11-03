import { useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { proximityEvent } from '@/functions/proximityEvent';
import { trackArrival } from '@/lib/attributionClient';

// Haversine distance in meters between two lat/lng points.
function metersBetween(lat1, lng1, lat2, lng2) {
  const R = 6371000; // earth radius in meters
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

// Watches the user's GPS position and fires a `geofence_enter` proximity event the first
// time they cross into a venue's enabled geofence radius. Re-arms when they leave, so a
// later return triggers again. Only active when `enabled` is true (user opted into location).
export default function useGeofenceWatcher(enabled) {
  const venuesRef = useRef([]);
  // venueId -> 'inside' | 'outside', tracks transitions so we only fire on entry
  const stateRef = useRef({});

  useEffect(() => {
    if (!enabled || typeof navigator === 'undefined' || !navigator.geolocation) return;

    let cancelled = false;
    let watchId = null;

    // Load the geofence-enabled venues once when the watcher starts.
    base44.entities.Venue.filter({ geofence_enabled: true })
      .then((venues) => {
        if (cancelled) return;
        venuesRef.current = venues.filter((v) => {
          const lat = Number(v.lat);
          const lng = Number(v.lng);
          return Number.isFinite(lat) && Number.isFinite(lng) && lat !== 0 && lng !== 0;
        });

        watchId = navigator.geolocation.watchPosition(
          (pos) => {
            const { latitude, longitude } = pos.coords;
            venuesRef.current.forEach((v) => {
              const dist = metersBetween(latitude, longitude, Number(v.lat), Number(v.lng));
              const radius = v.geofence_radius_meters || 100;
              const prev = stateRef.current[v.id] || 'outside';
              const now = dist <= radius ? 'inside' : 'outside';

              if (prev === 'outside' && now === 'inside') {
                // Crossed in — fire a single arrival event.
                proximityEvent({ event_type: 'geofence_enter', venue_id: v.id, lat: latitude, lng: longitude })
                  .then((res) => { if (res?.data?.success) trackArrival(v.id, 'geofence'); })
                  .catch(() => {});
              }
              stateRef.current[v.id] = now;
            });
          },
          () => {},
          { enableHighAccuracy: true, maximumAge: 15000, timeout: 20000 }
        );
      })
      .catch(() => {});

    return () => {
      cancelled = true;
      if (watchId !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [enabled]);
}