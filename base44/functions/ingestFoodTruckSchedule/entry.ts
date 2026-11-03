import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { secrets } from 'base44:runtime';
import { safeEqual } from '../../shared/automationAuth.ts';
import {
  FEED_SOURCE,
  buildAppearance,
  buildVenueIndex,
  geocodeAddress,
  matchVenue,
  normName,
  toIsoDate,
} from '../../shared/truckSchedule.ts';
import { DEFAULT_TZ, addDays, zonedToUtc } from '../../shared/truckStops.ts';

// '5:00 PM' / '17:00' / '5pm' → 'HH:MM' (null if unreadable)
function to24(t) {
  const m = String(t || '').trim().toLowerCase().match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm|a\.m\.|p\.m\.)?$/);
  if (!m) return null;
  let h = Number(m[1]);
  const min = Number(m[2] || 0);
  const ap = m[3]?.[0];
  if (ap === 'p' && h < 12) h += 12;
  if (ap === 'a' && h === 12) h = 0;
  if (h > 23 || min > 59) return null;
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

// Webhook receiver for the external 864FoodTrucks skill.
//
// POST body: { rows: [{ truck_name, date, start_time, end_time, location_name,
//                       address, website, phone, email }] }
// Auth: shared secret in the `x-foodtruck-secret` header (never in the URL).
//
// Matched trucks get dated FoodTruckStop records (unconfirmed — owners confirm or
// check in from their schedule). Unmatched trucks become prospect Leads —
// never auto-created Venues, so nothing goes public without opting in.
export default async function (req) {
  try {
    const expected = secrets.get('FOODTRUCK_WEBHOOK_SECRET');
    const provided = req.headers.get('x-foodtruck-secret') || '';
    if (!expected || !safeEqual(provided, expected)) {
      return Response.json({ error: 'Invalid or missing secret' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const rows = Array.isArray(body.rows) ? body.rows : Array.isArray(body) ? body : [];
    if (!rows.length) {
      return Response.json({ error: 'No rows provided' }, { status: 400 });
    }

    const base44 = createClientFromRequest(req);
    const svc = base44.asServiceRole.entities;
    const placesKey = Deno.env.get('GOOGLE_PLACES_API_KEY');

    const venues = await svc.Venue.list('name', 5000);
    const index = buildVenueIndex(venues);

    // One geocode per distinct spot, reused across every truck parked there.
    const geoCache = new Map();
    const resolveCoords = async (row) => {
      const query = [row.address, row.location_name || row.venue].filter(Boolean).join(' ').trim();
      if (!query) return null;
      if (geoCache.has(query)) return geoCache.get(query);
      const coords = await geocodeAddress(placesKey, query);
      geoCache.set(query, coords);
      return coords;
    };

    // Group rows by truck so each venue is written once with its whole week.
    const groups = new Map();
    const invalid = [];
    for (const row of rows) {
      const name = String(row.truck_name || row.name || '').trim();
      const date = toIsoDate(row.date);
      if (!name || !date) {
        invalid.push({ row, reason: !name ? 'missing truck_name' : 'unreadable date' });
        continue;
      }
      const key = normName(name) || name.toLowerCase();
      if (!groups.has(key)) groups.set(key, { name, rows: [] });
      groups.get(key).rows.push(row);
    }

    const matched = [];
    const unmatched = [];

    for (const group of groups.values()) {
      const venue = matchVenue(index, { ...group.rows[0], truck_name: group.name });

      const appearances = [];
      for (const row of group.rows) {
        const coords = await resolveCoords(row);
        appearances.push(buildAppearance(row, coords));
      }

      if (!venue) {
        unmatched.push({ name: group.name, rows: group.rows, appearances });
        continue;
      }

      // Write dated FoodTruckStop records (unconfirmed). Existing stops at the same
      // start time are left alone so owner edits/check-ins are never overwritten.
      const existing = await svc.FoodTruckStop.filter({ venue_id: venue.id }, 'start_at', 1000);
      const taken = new Set(existing.map((s) => s.start_at));
      let added = 0;
      const skipped = [];
      for (const a of appearances) {
        const st = to24(a.start_time), et = to24(a.end_time);
        if (!st || !et || !Number.isFinite(a.lat) || !Number.isFinite(a.lng)) {
          skipped.push({ date: a.date, reason: !st || !et ? 'unreadable time' : 'no map pin' });
          continue;
        }
        const endDate = et <= st ? addDays(a.date, 1) : a.date;
        const startMs = zonedToUtc(a.date, st, DEFAULT_TZ);
        const endMs = zonedToUtc(endDate, et, DEFAULT_TZ);
        const start_at = new Date(startMs).toISOString();
        if (endMs <= Date.now() || taken.has(start_at)) continue;
        await svc.FoodTruckStop.create({
          venue_id: venue.id, location_name: a.location_name, address: a.address, lat: a.lat, lng: a.lng,
          timezone: DEFAULT_TZ, local_date: a.date, end_date: endDate, start_time: st, end_time: et,
          start_at, end_at: new Date(endMs).toISOString(), status: 'scheduled',
          request_id: `${FEED_SOURCE}:${venue.id}:${start_at}`,
        });
        taken.add(start_at);
        added++;
      }
      matched.push({ venue_id: venue.id, venue_name: venue.name, stops_added: added, skipped });
    }

    // Prospect Leads for trucks we don't carry yet. Lead needs an email address,
    // so a row without one is reported back instead of silently dropped.
    const leadResults = [];
    const existingLeads = await svc.Lead.filter({ source: FEED_SOURCE }, '-created_date', 5000);
    const knownLeadEmails = new Set(existingLeads.map((l) => String(l.email || '').toLowerCase()));

    for (const item of unmatched) {
      const row = item.rows[0];
      const email = String(row.email || '').trim().toLowerCase();
      if (!email) {
        leadResults.push({ name: item.name, status: 'skipped_no_email' });
        continue;
      }
      if (knownLeadEmails.has(email)) {
        leadResults.push({ name: item.name, status: 'already_a_lead' });
        continue;
      }
      await svc.Lead.create({
        email,
        phone: String(row.phone || '').trim(),
        role: 'venue_owner',
        venue_name: item.name,
        source: FEED_SOURCE,
        status: 'new',
        notes: `Food truck from the 864FoodTrucks weekly feed. Website: ${row.website || 'n/a'}. ${item.appearances.length} appearance(s) this week: ${item.appearances
          .map((a) => `${a.date} ${a.location_name || a.address}`)
          .join('; ')}`,
      });
      knownLeadEmails.add(email);
      leadResults.push({ name: item.name, status: 'lead_created' });
    }

    return Response.json({
      success: true,
      rows_received: rows.length,
      trucks: groups.size,
      matched_count: matched.length,
      unmatched_count: unmatched.length,
      matched,
      leads: leadResults,
      invalid_rows: invalid,
    });
  } catch (error) {
    // 500 keeps the delivery retry-able by the sender.
    return Response.json({ error: error.message }, { status: 500 });
  }
}