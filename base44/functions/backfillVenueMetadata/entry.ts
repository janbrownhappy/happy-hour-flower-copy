import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { SOURCES, applyProtectedUpdates, recordDiscrepancies } from '../../shared/enrichmentProtection.ts';

// Fills missing lat/lng (Geocoding) and website (Places) for one venue so photo matching works.
const hasCoords = (v) => Number.isFinite(v.lat) && Number.isFinite(v.lng) && (v.lat !== 0 || v.lng !== 0);

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    const email = (user?.email || '').toLowerCase();
    const isAdmin = user && (user.role === 'admin' || email === 'jan.brown@happyhourflower.com' || email === (Deno.env.get('ADMIN_EMAIL') || '').toLowerCase());
    if (!isAdmin) return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });

    const { venueId } = await req.json();
    const venue = await base44.asServiceRole.entities.Venue.get(venueId);
    if (!venue) return Response.json({ error: 'Venue not found' }, { status: 404 });
    const key = Deno.env.get('GOOGLE_PLACES_API_KEY');
    const patch = {};

    if (!hasCoords(venue) && venue.address) {
      const q = [venue.address, venue.city, venue.state_code || 'SC', venue.zip_code].filter(Boolean).join(', ');
      const geo = await (await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(q)}&key=${key}`)).json();
      const loc = geo.results?.[0]?.geometry?.location;
      if (loc) { patch.lat = loc.lat; patch.lng = loc.lng; }
    }

    if (!venue.website) {
      const q = [venue.name, venue.address, venue.city, venue.state_code || 'SC'].filter(Boolean).join(' ');
      const lat = patch.lat ?? venue.lat, lng = patch.lng ?? venue.lng;
      let url = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(q)}&inputtype=textquery&fields=place_id,geometry&key=${key}`;
      if (Number.isFinite(lat) && Number.isFinite(lng)) url += `&locationbias=circle:500@${lat},${lng}`;
      const fp = await (await fetch(url)).json();
      const cand = fp.candidates?.[0];
      if (cand) {
        const det = await (await fetch(`https://maps.googleapis.com/maps/api/place/details/json?place_id=${cand.place_id}&fields=website&key=${key}`)).json();
        if (det.result?.website) patch.website = det.result.website;
        if (patch.lat == null && !hasCoords(venue) && cand.geometry?.location) { patch.lat = cand.geometry.location.lat; patch.lng = cand.geometry.location.lng; }
      }
    }

    // Writes pass through the shared protection policy; blocked findings become discrepancies.
    const plan = applyProtectedUpdates(venue, patch, SOURCES.GOOGLE_PLACES);
    if (plan.applied.length) await base44.asServiceRole.entities.Venue.update(venueId, plan.updates);
    await recordDiscrepancies(base44, venue, plan.protected, 'backfillVenueMetadata');
    return Response.json({ success: true, updated: plan.applied, protected: plan.protected.map((p) => p.field) });
  } catch (error) {
    console.error('backfillVenueMetadata error:', error.message);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}