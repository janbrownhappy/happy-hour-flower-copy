import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { dayLabel, geocodeAddress, toIsoDate, OWNER_SOURCE } from '../../shared/truckSchedule.ts';

// Owner-facing save for a food truck's date-specific stops.
// Runs server-side so each stop's address can be geocoded to a map pin, and so
// confirming the schedule clears the pending-confirmation flag in one write.
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const venueId = body.venue_id;
    const incoming = Array.isArray(body.schedule) ? body.schedule : [];
    if (!venueId) return Response.json({ error: 'venue_id is required' }, { status: 400 });

    const svc = base44.asServiceRole.entities;
    const venue = await svc.Venue.get(venueId);
    if (!venue) return Response.json({ error: 'Venue not found' }, { status: 404 });

    const canEdit =
      user.role === 'admin' ||
      venue.owner_id === user.id ||
      (venue.editor_ids || []).includes(user.id);
    if (!canEdit) return Response.json({ error: 'Forbidden' }, { status: 403 });

    const placesKey = Deno.env.get('GOOGLE_PLACES_API_KEY');
    const prior = venue.truck_schedule || [];
    const geoCache = new Map();

    const schedule = [];
    for (const stop of incoming) {
      const date = toIsoDate(stop.date);
      if (!date) continue;

      const address = String(stop.address || '').trim();
      const locationName = String(stop.location_name || '').trim();
      let lat = Number.isFinite(Number(stop.lat)) ? Number(stop.lat) : null;
      let lng = Number.isFinite(Number(stop.lng)) ? Number(stop.lng) : null;

      // Re-geocode when coordinates are missing or the address moved.
      const previous = prior.find((p) => p.date === date);
      const addressChanged = previous ? previous.address !== address : true;
      if ((lat === null || lng === null || addressChanged) && (address || locationName)) {
        const query = [address, locationName].filter(Boolean).join(' ');
        if (!geoCache.has(query)) geoCache.set(query, await geocodeAddress(placesKey, query));
        const coords = geoCache.get(query);
        if (coords) {
          lat = coords.lat;
          lng = coords.lng;
        }
      }

      schedule.push({
        date,
        day: dayLabel(date),
        location_name: locationName,
        address,
        lat,
        lng,
        start_time: String(stop.start_time || '').trim(),
        end_time: String(stop.end_time || '').trim(),
        source: stop.source === OWNER_SOURCE ? OWNER_SOURCE : stop.source || OWNER_SOURCE,
        // A stop is public only once it carries a date AND both times.
        confirmed: !!(stop.start_time && stop.end_time),
      });
    }

    schedule.sort((a, b) => a.date.localeCompare(b.date));

    const now = new Date().toISOString();
    const updated = await svc.Venue.update(venueId, {
      truck_schedule: schedule,
      schedule_pending_confirmation: false,
      schedule_confirmed_at: now,
      schedule_changed_at: now,
    });

    return Response.json({ success: true, stops: schedule.length, venue: updated });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}