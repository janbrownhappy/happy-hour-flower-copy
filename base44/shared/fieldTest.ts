// Phase 5 field-test capture. Diagnostics only — never feeds back into the Arrival Engine.
import { haversineMeters } from './nearbyVenues.ts';

export const PHASE5_ELIGIBLE_LABEL = 'ELIGIBLE — DELIVERY DISABLED DURING PHASE 5';
const r1 = (n) => Math.round(n * 10) / 10;
const num = (v) => (v == null || v === '' || !Number.isFinite(Number(v)) ? null : Number(v));

export async function recordFieldTestReading(sr, { userId, body, lat, lng, accuracy, closest, arrival, radius, settings }) {
  const session = (await sr.entities.FieldTestSession.filter({ user_id: userId, status: 'active' }, '-started_at', 1))[0];
  if (!session) return null;
  const prev = (await sr.entities.FieldTestReading.filter({ session_id: session.id }, '-reading_at', 1))[0];
  const now = new Date();
  const hasVenue = session.test_venue_id && Number.isFinite(session.test_venue_lat) && Number.isFinite(session.test_venue_lng);
  const testDist = hasVenue ? r1(haversineMeters(lat, lng, session.test_venue_lat, session.test_venue_lng)) : null;
  const targetId = session.test_venue_id || closest?.venue_id;
  const target = testDist ?? closest?.distance_meters ?? null;
  const visit = arrival?.visits?.find((v) => v.venue_id === targetId);
  const accOk = accuracy != null && accuracy <= settings.max_arrival_accuracy_meters;
  const eligible = !!visit?.notification_eligible && visit?.previous_state !== visit?.current_state && visit?.current_state === 'NOTIFIED';
  const reading = await sr.entities.FieldTestReading.create({
    session_id: session.id, user_id: userId, reading_at: now.toISOString(),
    client_timestamp: body.timestamp ? String(body.timestamp) : '',
    latitude: lat, longitude: lng, accuracy_meters: accuracy, speed: num(body.speed), heading: num(body.heading),
    closest_venue_id: closest?.venue_id || '', closest_venue_name: closest?.venue_name || '', closest_distance_meters: closest?.distance_meters ?? null,
    test_venue_id: session.test_venue_id || '', test_venue_name: session.test_venue_name || '', test_venue_distance_meters: testDist,
    target_distance_meters: target, arrival_radius_meters: radius,
    inside_arrival_radius: target != null && target <= radius, accuracy_ok: accOk,
    previous_state: visit?.previous_state || 'OUTSIDE', new_state: visit?.current_state || 'OUTSIDE',
    qualifying_arrival_readings: visit?.qualifying_arrival_readings || 0,
    qualifying_departure_readings: visit?.qualifying_departure_readings || 0,
    notification_eligible: eligible,
    suppression_reason: eligible ? PHASE5_ELIGIBLE_LABEL : (visit?.suppression_reason || (!accOk ? 'POOR_GPS_ACCURACY' : '')),
    seconds_since_previous: prev ? r1((now.getTime() - new Date(prev.reading_at).getTime()) / 1000) : null,
    meters_since_previous: prev && Number.isFinite(prev.latitude) ? r1(haversineMeters(prev.latitude, prev.longitude, lat, lng)) : null,
  });
  // Detailed GPS readings follow the existing diagnostic history retention (default 24h).
  const cutoff = new Date(Date.now() - settings.history_retention_hours * 3600000).toISOString();
  await sr.entities.FieldTestReading.deleteMany({ reading_at: { $lt: cutoff } });
  return reading;
}