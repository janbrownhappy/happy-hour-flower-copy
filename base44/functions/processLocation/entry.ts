import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { waitUntil } from 'base44:runtime';
import { findNearbyVenues, getLocationSettings, isValidLat, isValidLng } from '../../shared/nearbyVenues.ts';
import { runArrivalEngine } from '../../shared/arrivalEngine.ts';
import { recordFieldTestReading } from '../../shared/fieldTest.ts';

// Phase 2: Despia GPS → backend → distance calc → nearby venues. No notifications here.
export default async function (req) {
  const base44 = createClientFromRequest(req);
  const sr = base44.asServiceRole;
  let user = null;
  try {
    user = await base44.auth.me().catch(() => null);
    if (!user) return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const email = (user.email || '').toLowerCase();
    const isAdmin = user.role === 'admin' || email === 'jan.brown@happyhourflower.com'
      || email === (Deno.env.get('ADMIN_EMAIL') || '').toLowerCase();
    const isTest = isAdmin && body.test_mode === true;
    const isDespia = body.source === 'despia' && !isTest;
    // Phase 4: Despia field-test history is kept only for admin test accounts (short retention).
    const logSource = isTest ? 'admin_test' : (isDespia && isAdmin ? 'despia' : 'app');
    const diag = (v) => (v == null || v === '' || !Number.isFinite(Number(v)) ? null : Number(v));

    if (body.user_id && body.user_id !== user.id) {
      return Response.json({ success: false, error: 'user_id does not match the authenticated user' }, { status: 403 });
    }

    const testSubject = `test-${user.id}`;
    if (isTest && body.action === 'reset_arrival_test') {
      await Promise.all([
        sr.entities.VenueVisit.deleteMany({ user_id: testSubject }),
        sr.entities.ArrivalNotificationEvent.deleteMany({ user_id: testSubject }),
      ]);
      return Response.json({ success: true, reset: true });
    }

    const settings = await getLocationSettings(sr);
    const lat = Number(body.latitude);
    const lng = Number(body.longitude);
    const accuracy = body.accuracy == null || body.accuracy === '' ? null : Number(body.accuracy);

    const log = (entry) => {
      if (!settings.logging_enabled) return;
      waitUntil((async () => {
        await sr.entities.LocationDiagnosticLog.create({
          user_id: user.id, source: logSource,
          speed: diag(body.speed), heading: diag(body.heading), altitude: diag(body.altitude),
          client_timestamp: body.timestamp ? String(body.timestamp) : '',
          latitude: Number.isFinite(lat) ? lat : null, longitude: Number.isFinite(lng) ? lng : null,
          accuracy_meters: Number.isFinite(accuracy) ? accuracy : null, ...entry,
        });
        const cutoff = new Date(Date.now() - settings.log_retention_days * 86400000).toISOString();
        await sr.entities.LocationDiagnosticLog.deleteMany({ created_date: { $lt: cutoff } });
        const histCutoff = new Date(Date.now() - settings.history_retention_hours * 3600000).toISOString();
        await sr.entities.LocationDiagnosticLog.deleteMany({ source: 'despia', created_date: { $lt: histCutoff } });
      })().catch((e) => console.error('diagnostic log failed', e.message)));
    };

    if (body.latitude == null || body.longitude == null || !isValidLat(lat) || !isValidLng(lng)) {
      log({ status: 'rejected', error: 'Invalid coordinates' });
      return Response.json({ success: false, error: 'Invalid latitude/longitude' }, { status: 400 });
    }

    let radius = settings.radius_meters;
    if (isTest && body.radius_meters != null) {
      const r = Number(body.radius_meters);
      if (!Number.isFinite(r) || r <= 0 || r > 5000) return Response.json({ success: false, error: 'Invalid test radius' }, { status: 400 });
      radius = r;
    }

    const nearby = await findNearbyVenues(sr, lat, lng, radius);

    // Phase 3: production always runs the Arrival Engine; admin test runs it only in Arrival Test Mode
    // (isolated under a test subject id, optional simulated clock). Same engine either way.
    let arrival = null;
    if (!isTest || body.arrival_test === true) {
      const simulated = isTest && body.simulate_time ? new Date(body.simulate_time) : null;
      arrival = await runArrivalEngine(sr, {
        subjectId: isTest ? testSubject : user.id, pushUserId: user.id, isTest,
        lat, lng, accuracy: Number.isFinite(accuracy) ? accuracy : null,
        now: simulated && !isNaN(simulated.getTime()) ? simulated : new Date(),
        settings, arrivalRadius: radius, phase4DeliveryLock: isDespia,
        profile: (await sr.entities.Profile.filter({ created_by_id: user.id }))[0] || null,
      });
    }

    // Admin diagnostics only: closest active venue within a wider lookup radius. Does not feed the Arrival Engine.
    const closest = nearby[0] || (isAdmin
      ? (await findNearbyVenues(sr, lat, lng, settings.diagnostic_nearest_venue_radius_meters))[0] || null
      : null);
    const closestVisit = arrival?.visits?.find((v) => v.venue_id === closest?.venue_id);
    const diagnosticClosest = closest ? {
      venue_id: closest.venue_id, venue_name: closest.venue_name, distance_meters: closest.distance_meters,
      has_active_special: closest.has_active_special, arrival_radius_meters: radius,
      inside_arrival_radius: closest.distance_meters <= radius,
      arrival_state: closestVisit?.current_state || 'OUTSIDE',
      lookup_radius_meters: settings.diagnostic_nearest_venue_radius_meters,
    } : null;
    log({
      status: 'success', search_radius_meters: radius, nearby_count: nearby.length,
      closest_venue_id: closest?.venue_id || '', closest_venue_name: closest?.venue_name || '', closest_distance_meters: closest?.distance_meters ?? null,
      arrival_state: closestVisit?.current_state || (arrival ? 'OUTSIDE' : ''), notification_eligible: !!closestVisit?.notification_eligible,
      suppression_reason: closestVisit?.suppression_reason || '',
    });

    // Phase 5: capture Despia readings into the admin's active field-test session (diagnostics only).
    if (isDespia && isAdmin) {
      await recordFieldTestReading(sr, {
        userId: user.id, body, lat, lng, accuracy: Number.isFinite(accuracy) ? accuracy : null,
        closest, arrival, radius, settings,
      }).catch((e) => console.error('field test reading failed', e.message));
    }

    // Venue coordinates are only returned to admins (testing tool).
    const out = isAdmin ? nearby : nearby.map(({ venue_latitude, venue_longitude, ...rest }) => rest);
    return Response.json({
      success: true,
      search_radius_meters: radius,
      location: { latitude: lat, longitude: lng, accuracy: Number.isFinite(accuracy) ? accuracy : null },
      nearby: out,
      ...(isAdmin && arrival ? { arrival, arrival_settings: settings } : {}),
      ...(isAdmin ? { diagnostic_closest: diagnosticClosest } : {}),
    });
  } catch (error) {
    console.error('processLocation error', error.message);
    return Response.json({ success: false, error: 'Location processing failed' }, { status: 500 });
  }
}