import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { getLocationSettings } from '../../shared/nearbyVenues.ts';

// Phase 5 admin-only field-test sessions: start / stop (+ auto summary). Never changes settings.
const avg = (a) => (a.length ? Math.round((a.reduce((s, x) => s + x, 0) / a.length) * 10) / 10 : null);
const max = (a) => (a.length ? Math.max(...a) : null);
const min = (a) => (a.length ? Math.min(...a) : null);

function summarize(session, readings) {
  const gaps = readings.map((r) => r.seconds_since_previous).filter((x) => x != null);
  const moves = readings.map((r) => r.meters_since_previous).filter((x) => x != null);
  const accs = readings.map((r) => r.accuracy_meters).filter((x) => x != null);
  const dists = readings.map((r) => r.target_distance_meters).filter((x) => x != null);
  const within = (m) => dists.filter((d) => d <= m).length;
  const R = session.arrival_radius_meters;
  const inside = readings.filter((r) => r.inside_arrival_radius);
  const qualifying = inside.filter((r) => r.accuracy_ok).length;
  const arrived = readings.some((r) => ['ARRIVED', 'NOTIFIED'].includes(r.new_state));
  // Missed arrival: approached then receded, closest approach within 250m, but too few qualifying readings inside R.
  let missed = false; let missedNote = '';
  const idx = dists.length ? dists.indexOf(min(dists)) : -1;
  if (idx >= 0 && qualifying < session.required_arrival_readings && dists[idx] <= 250 && dists.slice(idx + 1).some((d) => d > dists[idx])) {
    missed = true;
    missedNote = `Closest reading ${dists[idx]}m, then distance increased — passed the venue with ${qualifying} qualifying reading(s) inside ${R}m.`;
  }
  const start = new Date(session.started_at).getTime();
  return {
    duration_seconds: Math.round((Date.now() - start) / 1000),
    total_readings: readings.length,
    avg_seconds_between: avg(gaps), max_seconds_between: max(gaps),
    avg_meters_between: avg(moves), max_meters_between: max(moves),
    best_accuracy: min(accs), worst_accuracy: max(accs), avg_accuracy: avg(accs),
    within_500: within(500), within_250: within(250), within_100: within(100), within_75: within(75), within_50: within(50), within_25: within(25),
    closest_approach_meters: min(dists),
    readings_inside_radius: inside.length, qualifying_inside_radius: qualifying,
    arrival_detected: inside.length > 0, arrived_reached: arrived,
    notification_eligible_reached: readings.some((r) => r.notification_eligible),
    possible_missed_arrival: missed, missed_arrival_note: missedNote,
    confirmation_failed_message: !arrived && qualifying > 0 && qualifying < session.required_arrival_readings
      ? `Arrival confirmation failed because only ${qualifying} of ${session.required_arrival_readings} required readings was received inside the arrival radius.` : '',
  };
}

export default async function (req) {
  const base44 = createClientFromRequest(req);
  const sr = base44.asServiceRole;
  const user = await base44.auth.me().catch(() => null);
  const email = (user?.email || '').toLowerCase();
  const isAdmin = user && (user.role === 'admin' || email === 'jan.brown@happyhourflower.com' || email === (Deno.env.get('ADMIN_EMAIL') || '').toLowerCase());
  if (!isAdmin) return Response.json({ error: 'Forbidden' }, { status: 403 });
  const body = await req.json().catch(() => ({}));

  if (body.action === 'start') {
    const active = await sr.entities.FieldTestSession.filter({ user_id: user.id, status: 'active' });
    if (active.length) return Response.json({ error: 'A field test is already active' }, { status: 400 });
    const settings = await getLocationSettings(sr);
    const mv = (await sr.entities.AppSetting.filter({ key: 'despia_location_movement_meters' }))[0];
    const venue = body.test_venue_id ? await sr.entities.Venue.get(body.test_venue_id).catch(() => null) : null;
    const now = new Date();
    const session = await sr.entities.FieldTestSession.create({
      test_session_id: `FT-${now.toISOString().slice(0, 16).replace(/[-:T]/g, '')}`,
      user_id: user.id, user_email: user.email, platform: body.platform || 'other', user_agent: String(body.user_agent || '').slice(0, 300),
      status: 'active', started_at: now.toISOString(), test_modes: Array.isArray(body.test_modes) ? body.test_modes : [],
      test_venue_id: venue?.id || '', test_venue_name: venue?.name || '', test_venue_lat: venue?.lat ?? null, test_venue_lng: venue?.lng ?? null,
      despia_location_movement_meters: Number(mv?.value_string) || 500,
      arrival_radius_meters: settings.radius_meters, departure_radius_meters: settings.departure_radius_meters,
      required_arrival_readings: settings.required_arrival_readings, max_arrival_accuracy_meters: settings.max_arrival_accuracy_meters,
      notification_delivery_status: 'DISABLED — PHASE 5', notes: body.notes || '',
    });
    return Response.json({ session });
  }

  if (body.action === 'stop') {
    const session = (await sr.entities.FieldTestSession.filter({ user_id: user.id, status: 'active' }))[0];
    if (!session) return Response.json({ error: 'No active field test' }, { status: 400 });
    const readings = await sr.entities.FieldTestReading.filter({ session_id: session.id }, 'reading_at', 5000);
    const summary = summarize(session, readings);
    const updated = await sr.entities.FieldTestSession.update(session.id, {
      status: 'ended', ended_at: new Date().toISOString(), summary,
      readings_count: summary.total_readings, readings_inside_radius: summary.readings_inside_radius,
      arrival_detected: summary.arrival_detected, arrived_reached: summary.arrived_reached, possible_missed_arrival: summary.possible_missed_arrival,
    });
    return Response.json({ session: { ...session, ...updated, summary } });
  }
  return Response.json({ error: 'Unknown action' }, { status: 400 });
}