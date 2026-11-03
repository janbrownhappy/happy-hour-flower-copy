// Phase 3 Arrival Engine — the single, server-authoritative implementation used by
// production location updates AND the admin Arrival Engine Test Mode.
// States: OUTSIDE → NEARBY → ARRIVED → NOTIFIED → DEPARTED (per user + venue visit).
import { findNearbyVenues, haversineMeters, hasValidCoords } from './nearbyVenues.ts';
import { pushToUser } from './oneSignalPush.ts';
import { isServingNow } from './truckStops.ts';

const OPEN_STATES = ['NEARBY', 'ARRIVED', 'NOTIFIED'];
const round = (n) => Math.round(n * 10) / 10;

// Notification copy lives here (not in the state machine) so templates can be made configurable later.
function buildNotification(venue, special) {
  return {
    title: `You're near ${venue.venue_name} 🌼`,
    body: special?.summary ? `Happy Hour is happening now: ${special.summary}` : "Happy Hour is happening now — tap to see today's specials.",
    deep_link: `/venue/${venue.venue_id}?section=specials`,
  };
}

// Closest-first selection. Kept separate so it can become smarter later.
function selectCandidate(arrivals) {
  // Prefer venues with an active special so a special-less venue at the same spot can't block one that has a special.
  return [...arrivals].sort((a, b) => (!!b.special - !!a.special) || (a.distance - b.distance))[0] || null;
}

async function checkEligibility(sr, ctx, cand) {
  const { subjectId, settings, now, profile } = ctx;
  if (cand.visit.notified_at) return 'ALREADY_NOTIFIED';
  if (!cand.special) return 'NO_ACTIVE_SPECIAL';
  if (profile && (profile.notif_push === false || profile.location_services_enabled === false)) return 'NOTIFICATION_DISABLED';
  const since24 = new Date(now.getTime() - 86400000).toISOString();
  const sinceCooldown = new Date(now.getTime() - settings.arrival_notification_cooldown_hours * 3600000).toISOString();
  const recent = await sr.entities.ArrivalNotificationEvent.filter({ user_id: subjectId, arrived_at: { $gte: since24 < sinceCooldown ? since24 : sinceCooldown } }, '-arrived_at', 200);
  const nowIso = now.toISOString();
  if (recent.some((e) => e.venue_id === cand.venue.venue_id && e.arrived_at >= sinceCooldown && e.arrived_at <= nowIso)) return 'COOLDOWN';
  if (recent.filter((e) => e.arrived_at >= since24 && e.arrived_at <= nowIso).length >= settings.max_arrival_notifications_per_24h) return 'RATE_LIMIT';
  return null;
}

/**
 * Process one location reading for a user.
 * ctx: { subjectId, pushUserId, isTest, lat, lng, accuracy, now, settings, arrivalRadius, profile }
 */
export async function runArrivalEngine(sr, ctx) {
  const { subjectId, pushUserId, isTest, lat, lng, accuracy, now, settings, arrivalRadius } = ctx;
  const nowIso = now.toISOString();
  const accuracyOk = typeof accuracy === 'number' && Number.isFinite(accuracy) && accuracy <= settings.max_arrival_accuracy_meters;
  const depRadius = Math.max(settings.departure_radius_meters, arrivalRadius);

  const [inRange, openVisits] = await Promise.all([
    findNearbyVenues(sr, lat, lng, depRadius, now),
    sr.entities.VenueVisit.filter({ user_id: subjectId, current_state: { $in: OPEN_STATES } }, '-updated_date', 100),
  ]);
  // Visits are keyed per venue AND food-truck stop, so separate truck stops are separate visits.
  const vkey = (x) => `${x.venue_id}|${x.stop_id || ''}`;
  const byVenue = Object.fromEntries(inRange.map((v) => [vkey(v), v]));
  const openByVenue = Object.fromEntries(openVisits.map((v) => [vkey(v), v]));
  const logs = [];
  const arrivalsThisCycle = [];
  const results = [];

  const log = (visit, prev, extra = {}) => logs.push({
    user_id: subjectId, is_test: isTest, venue_id: visit.venue_id, venue_name: visit.venue_name, visit_id: visit.id,
    stop_id: visit.stop_id || undefined,
    evaluated_at: nowIso, distance_meters: visit.last_distance_meters, accuracy_meters: accuracy ?? null, accuracy_ok: accuracyOk,
    previous_state: prev, new_state: visit.current_state,
    qualifying_arrival_readings: visit.qualifying_arrival_readings, qualifying_departure_readings: visit.qualifying_departure_readings,
    ...extra,
  });

  // 1) Venues inside the arrival radius → NEARBY / ARRIVED.
  for (const venue of inRange.filter((v) => v.distance_meters <= arrivalRadius)) {
    let visit = openByVenue[vkey(venue)];
    const prev = visit?.current_state || 'OUTSIDE';
    const patch = {
      last_location_at: nowIso, last_distance_meters: venue.distance_meters, last_accuracy_meters: accuracy ?? null,
      qualifying_departure_readings: 0,
    };
    const count = (visit?.qualifying_arrival_readings || 0) + (accuracyOk ? 1 : 0);
    if (!visit || visit.current_state === 'NEARBY') patch.qualifying_arrival_readings = count;
    let state = visit?.current_state || 'NEARBY';
    if (state === 'NEARBY' && count >= settings.required_arrival_readings) { state = 'ARRIVED'; patch.arrived_at = nowIso; }
    patch.current_state = state;
    visit = visit
      ? { ...visit, ...(await sr.entities.VenueVisit.update(visit.id, patch)), ...patch }
      : await sr.entities.VenueVisit.create({ user_id: subjectId, venue_id: venue.venue_id, venue_name: venue.venue_name, stop_id: venue.stop_id || undefined, is_test: isTest, first_nearby_at: nowIso, ...patch });
    const cand = { visit, venue, prev, special: venue.has_active_special ? { id: venue.active_special_id, summary: venue.active_special_summary } : null, distance: venue.distance_meters };
    if (prev === 'NEARBY' || prev === 'OUTSIDE') { if (state === 'ARRIVED') arrivalsThisCycle.push(cand); }
    results.push(cand);
  }

  // 2) Open visits outside the arrival radius → hysteresis / DEPARTED.
  for (const visit of openVisits) {
    const venue = byVenue[vkey(visit)];
    if (venue && venue.distance_meters <= arrivalRadius) continue;
    const prev = visit.current_state;
    let distance = venue?.distance_meters;
    let note = '';
    if (distance == null && visit.stop_id) {
      // Truck visit: the stop must still be checked in and serving; edits, cancel, finish or end time invalidate it.
      const s = await sr.entities.FoodTruckStop.get(visit.stop_id).catch(() => null);
      if (!isServingNow(s, now.getTime())) note = 'VENUE_INACTIVE';
      distance = s && Number.isFinite(s.lat) ? round(haversineMeters(lat, lng, s.lat, s.lng)) : null;
    } else if (distance == null) {
      const v = await sr.entities.Venue.get(visit.venue_id).catch(() => null);
      if (!v || v.status !== 'active' || !hasValidCoords(v)) note = 'VENUE_INACTIVE';
      distance = v && hasValidCoords(v) ? round(haversineMeters(lat, lng, v.lat, v.lng)) : null;
    }
    const patch = { last_location_at: nowIso, last_distance_meters: distance, last_accuracy_meters: accuracy ?? null };
    if (note === 'VENUE_INACTIVE') {
      patch.current_state = visit.arrived_at ? 'DEPARTED' : 'OUTSIDE'; patch.departed_at = nowIso;
      if (!visit.notified_at) patch.notification_suppression_reason = 'VENUE_INACTIVE';
    } else if (distance > settings.departure_radius_meters) {
      const dep = (visit.qualifying_departure_readings || 0) + (accuracyOk ? 1 : 0);
      patch.qualifying_departure_readings = dep;
      if (dep >= settings.required_departure_readings) {
        patch.current_state = visit.arrived_at ? 'DEPARTED' : 'OUTSIDE';
        if (visit.arrived_at) patch.departed_at = nowIso;
      }
    } else {
      patch.qualifying_departure_readings = 0; // back inside the departure radius: still on the visit
    }
    const updated = { ...visit, ...patch };
    await sr.entities.VenueVisit.update(visit.id, patch);
    log(updated, prev, { note: note || (distance > settings.departure_radius_meters ? 'beyond departure radius' : 'between arrival and departure radius'), suppression_reason: note || undefined });
    results.push({ visit: updated, venue: { venue_id: visit.venue_id, venue_name: visit.venue_name }, prev, special: null, distance });
  }

  // 3) Eligibility — at most ONE notification per processing cycle (closest new arrival).
  const selected = selectCandidate(arrivalsThisCycle);
  let event = null;
  for (const cand of arrivalsThisCycle) {
    let reason = cand === selected ? await checkEligibility(sr, ctx, cand) : 'CLOSER_VENUE_SELECTED';
    const patch = { notification_eligible: !reason, notification_suppression_reason: reason || '', notification_status: reason ? 'suppressed' : 'pending' };
    if (!reason) {
      const n = buildNotification(cand.venue, cand.special);
      event = await sr.entities.ArrivalNotificationEvent.create({
        user_id: subjectId, push_user_id: pushUserId, is_test: isTest, visit_id: cand.visit.id,
        venue_id: cand.venue.venue_id, venue_name: cand.venue.venue_name, arrived_at: nowIso,
        active_special_id: cand.special.id, active_special_summary: cand.special.summary,
        notification_type: 'ARRIVAL_SPECIAL', ...n, processing_status: 'pending',
      });
      // Phase 4/5: real Despia readings are logged as eligible but never delivered.
      let status = ctx.phase4DeliveryLock ? 'eligible_delivery_disabled_phase5' : 'not_sent_disabled';
      if (settings.arrival_notifications_enabled && !ctx.phase4DeliveryLock) {
        const ok = await pushToUser(pushUserId, n.title, n.body, { deep_link: n.deep_link, venue_id: cand.venue.venue_id, type: 'ARRIVAL_SPECIAL' }).catch(() => false);
        status = ok ? 'sent' : 'failed';
      }
      await sr.entities.ArrivalNotificationEvent.update(event.id, { processing_status: status });
      event = { ...event, processing_status: status };
      Object.assign(patch, { current_state: 'NOTIFIED', notified_at: nowIso, notification_status: status, notification_event_id: event.id });
    }
    await sr.entities.VenueVisit.update(cand.visit.id, patch);
    Object.assign(cand.visit, patch);
    cand.reason = reason;
  }

  // Diagnostics for every venue inside the arrival radius.
  for (const c of results.filter((r) => r.distance != null && r.distance <= arrivalRadius)) {
    log(c.visit, c.prev, {
      has_active_special: !!c.special, notification_eligible: !!c.visit.notification_eligible && arrivalsThisCycle.includes(c),
      suppression_reason: c.reason || (!accuracyOk ? 'POOR_GPS_ACCURACY' : (c.visit.notified_at ? 'ALREADY_NOTIFIED' : '')) || undefined,
      notification_event_id: c.visit.notification_event_id || undefined,
    });
  }
  if (logs.length) await sr.entities.ArrivalDiagnosticLog.bulkCreate(logs);

  return {
    accuracy_ok: accuracyOk,
    notification_event: event,
    visits: results.map((c) => ({
      visit_id: c.visit.id, venue_id: c.venue.venue_id, venue_name: c.venue.venue_name, distance_meters: c.distance,
      previous_state: c.prev, current_state: c.visit.current_state,
      qualifying_arrival_readings: c.visit.qualifying_arrival_readings || 0, qualifying_departure_readings: c.visit.qualifying_departure_readings || 0,
      active_special: c.special?.summary || '', notification_eligible: !!c.visit.notification_eligible,
      suppression_reason: c.visit.notification_suppression_reason || '', notification_status: c.visit.notification_status || '',
      notification_event_id: c.visit.notification_event_id || '',
    })),
  };
}