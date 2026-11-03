import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { createResend } from '../../shared/resendClient.ts';

// Email the unlocked coupon as a fallback for users without push enabled.
// Mirrors the manual-issue email but points at the in-app wallet pass deep link.
async function emailCoupon({ email, name, venueName, title, discountValue, description, redemptionCode, passUrl }) {
  const apiKey = Deno.env.get('RESEND_API_KEY');
  if (!apiKey || !email) return false;
  const link = `https://happyhourflower.com${passUrl}`;
  const resend = createResend(apiKey);
  const html = `
    <div style="font-family:sans-serif;max-width:520px;margin:auto;padding:24px;">
      <h2 style="color:#1a1a2e;">You unlocked an offer at ${venueName}! 🌸</h2>
      <p>Hi ${name || 'there'},</p>
      <p><strong>${title}</strong>${discountValue ? ` — <span style="color:#f5a623;font-weight:bold;">${discountValue}</span>` : ''}</p>
      ${description ? `<p style="color:#555;">${description}</p>` : ''}
      <div style="text-align:center;margin:24px 0;">
        <a href="${link}" style="background:#f5a623;color:#fff;padding:14px 28px;border-radius:10px;text-decoration:none;font-weight:bold;font-size:16px;">
          🎟️ Open My Coupon
        </a>
      </div>
      <div style="background:#f5f5f5;border-radius:8px;padding:16px;margin:16px 0;">
        <p style="margin:0;font-size:13px;color:#444;">Your redemption code:</p>
        <p style="font-size:22px;font-family:monospace;font-weight:bold;color:#f5a623;letter-spacing:4px;margin:8px 0;">${redemptionCode}</p>
        <p style="margin:0;font-size:12px;color:#888;">Present this at the venue to redeem.</p>
      </div>
      <p style="font-size:12px;color:#999;">Happy Hour Flower — Find the best happy hours near you.</p>
    </div>
  `;
  const { error } = await resend.emails.send({
    from: 'Happy Hour Flower <happy@updates.happyhourflower.com>',
    to: [email],
    subject: `Your coupon from ${venueName} 🌸`,
    html,
  });
  return !error;
}

// Resolve a consumer into a dynamic-coupon segment based on their check-in history.
function resolveSegment(checkIns, regularThreshold, lapsedDays) {
  const count = checkIns.length;
  if (count === 0) return 'newcomer';

  // Most recent check-in time
  const last = checkIns
    .map(c => new Date(c.checked_in_at || c.created_date || 0).getTime())
    .sort((a, b) => b - a)[0];
  const daysSince = (Date.now() - last) / (1000 * 60 * 60 * 24);

  if (daysSince >= lapsedDays) return 'lapsed';
  if (count >= regularThreshold) return 'regular';
  return 'newcomer';
}

function randomCode(len) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  let out = '';
  for (let i = 0; i < len; i++) out += chars[bytes[i] % chars.length];
  return out;
}

function metersBetween(lat1, lng1, lat2, lng2) {
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(a));
}

// Extra meters allowed on top of the trigger range to absorb normal phone GPS error.
const GPS_SLACK_METERS = 150;
// A consumer gets at most one coupon per template in this window.
const COUPON_COOLDOWN_MS = 24 * 60 * 60 * 1000;
// At most this many new coupons per consumer per 24h, across all venues.
const DAILY_COUPON_CAP = 5;
// Faster than this between two venues is treated as spoofed location.
const MAX_TRAVEL_KMH = 150;

import { pushToUser } from '../../shared/oneSignalPush.ts';

// The proximity clearinghouse. Handles both geofence arrival (broad GPS) and beacon
// detection (precise BLE). On a beacon hit linked to a coupon template, it resolves the
// user's segment, applies the dynamic offer, generates a PassInstance, and pushes a
// "Redeem Now" notification.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { event_type, venue_id, beacon_uid, lat, lng } = body;

    if (!event_type || !['geofence_enter', 'beacon_detected'].includes(event_type)) {
      return Response.json({ error: 'event_type must be geofence_enter or beacon_detected' }, { status: 400 });
    }

    const now = new Date().toISOString();
    const svc = base44.asServiceRole;

    // Resolve the venue (either passed directly, or via the beacon record)
    let venue = null;
    let beacon = null;

    if (event_type === 'beacon_detected') {
      if (!beacon_uid) {
        return Response.json({ error: 'beacon_uid is required for beacon_detected events' }, { status: 400 });
      }
      const beacons = await svc.entities.Beacon.filter({ beacon_uid: beacon_uid.trim(), is_active: true });
      if (beacons.length === 0) {
        return Response.json({ error: 'No active beacon registered for that UID.' }, { status: 404 });
      }
      beacon = beacons[0];
      venue = await svc.entities.Venue.get(beacon.venue_id);
    } else {
      if (!venue_id) {
        return Response.json({ error: 'venue_id is required for geofence_enter events' }, { status: 400 });
      }
      venue = await svc.entities.Venue.get(venue_id);
    }

    if (!venue) {
      return Response.json({ error: 'Venue not found.' }, { status: 404 });
    }

    // Presence check: the reported position must be within the trigger range of the venue.
    // The venue's own team (and admins) may fire test events from anywhere.
    const isManager = user.role === 'admin' || venue.owner_id === user.id || (venue.editor_ids || []).includes(user.id);
    if (!isManager) {
      const uLat = Number(lat), uLng = Number(lng);
      const vLat = Number(venue.lat), vLng = Number(venue.lng);
      if (lat == null || lng == null || !Number.isFinite(uLat) || !Number.isFinite(uLng)) {
        return Response.json({ error: 'Turn on location to unlock offers at this venue.' }, { status: 400 });
      }
      if (!Number.isFinite(vLat) || !Number.isFinite(vLng)) {
        return Response.json({ error: 'This venue has no location set yet.' }, { status: 400 });
      }
      const range = event_type === 'beacon_detected'
        ? (Number(beacon.range_yards) || 20) * 0.9144
        : (Number(venue.geofence_radius_meters) || 100);
      if (metersBetween(uLat, uLng, vLat, vLng) > range + GPS_SLACK_METERS) {
        return Response.json({ error: `You need to be at ${venue.name} to unlock this.` }, { status: 403 });
      }
    }

    // Base event record
    const eventRecord = {
      event_type,
      user_id: user.id,
      user_name: user.full_name || user.email,
      venue_id: venue.id,
      venue_name: venue.name,
      beacon_id: beacon?.id || '',
      beacon_uid: beacon_uid || '',
      triggered_at: now,
      action_taken: 'no_action',
    };

    // ── GEOFENCE: broad arrival → welcome notification ──
    if (event_type === 'geofence_enter') {
      eventRecord.action_taken = 'welcome_notification';
      const sent = await pushToUser(
        user.id,
        `Welcome to ${venue.name}!`,
        `You're here — check out today's happy hour deals.`,
        { deep_link: `/venue/${venue.id}` },
      );
      if (!sent) eventRecord.action_taken = 'no_action';
      const created = await svc.entities.ProximityEvent.create(eventRecord);
      return Response.json({ success: true, action: eventRecord.action_taken, proximity_event_id: created.id, venue_id: venue.id });
    }

    // ── BEACON: precise → surface a (dynamic) coupon ──
    if (!beacon.wallet_pass_id) {
      const created = await svc.entities.ProximityEvent.create(eventRecord);
      return Response.json({ success: true, action: 'no_action', reason: 'Beacon has no coupon linked.', proximity_event_id: created.id, venue_id: venue.id });
    }

    const template = await svc.entities.WalletPass.get(beacon.wallet_pass_id);
    if (!template || template.status !== 'active' || template.pass_type !== 'coupon') {
      const created = await svc.entities.ProximityEvent.create(eventRecord);
      return Response.json({ success: true, action: 'no_action', reason: 'Linked coupon is not an active coupon template.', proximity_event_id: created.id, venue_id: venue.id });
    }

    // Cooldown: re-surface the coupon already issued recently instead of minting another.
    const recent = (await svc.entities.PassInstance.filter({ consumer_user_id: user.id, wallet_pass_id: template.id }))
      .find(p => Date.now() - new Date(p.issued_at || p.created_date || 0).getTime() < COUPON_COOLDOWN_MS);
    if (recent) {
      eventRecord.action_taken = 'coupon_surfaced';
      eventRecord.pass_instance_id = recent.id;
      eventRecord.wallet_pass_id = template.id;
      const created = await svc.entities.ProximityEvent.create(eventRecord);
      return Response.json({
        success: true,
        action: 'coupon_surfaced',
        already_issued: true,
        pass_instance_id: recent.id,
        redemption_code: recent.redemption_code,
        proximity_event_id: created.id, venue_id: venue.id,
      });
    }

    // Client GPS is advisory, so add server-side fraud checks before minting a new coupon.
    if (!isManager) {
      const since = new Date(Date.now() - COUPON_COOLDOWN_MS).toISOString();
      const issuedToday = await svc.entities.PassInstance.filter({ consumer_user_id: user.id, issued_at: { $gte: since } }, '-issued_at', DAILY_COUPON_CAP);
      if (issuedToday.length >= DAILY_COUPON_CAP) {
        return Response.json({ error: "You've unlocked the maximum number of offers for today." }, { status: 429 });
      }
      // Impossible travel: the last proximity event at another venue must be reachable at a plausible speed.
      const [last] = await svc.entities.ProximityEvent.filter({ user_id: user.id }, '-triggered_at', 1);
      if (last && last.venue_id !== venue.id && last.triggered_at) {
        const prevVenue = await svc.entities.Venue.get(last.venue_id).catch(() => null);
        if (prevVenue && Number.isFinite(Number(prevVenue.lat)) && Number.isFinite(Number(prevVenue.lng))) {
          const meters = metersBetween(Number(prevVenue.lat), Number(prevVenue.lng), Number(venue.lat), Number(venue.lng));
          const hours = Math.max((Date.now() - new Date(last.triggered_at).getTime()) / 3600000, 1 / 60);
          if (meters > 2000 && meters / 1000 / hours > MAX_TRAVEL_KMH) {
            return Response.json({ error: `You need to be at ${venue.name} to unlock this.` }, { status: 403 });
          }
        }
      }
    }

    // Resolve the user's dynamic segment from their check-in history at this venue
    const checkIns = await svc.entities.CheckIn.filter({ user_id: user.id, venue_id: venue.id });
    const regularThreshold = template.regular_threshold || 5;
    const lapsedDays = template.lapsed_days || 30;
    const segment = resolveSegment(checkIns, regularThreshold, lapsedDays);
    eventRecord.segment = segment;

    // Apply dynamic offer overrides for this segment
    let discountValue = template.discount_value;
    let description = template.description;
    if (template.is_dynamic && template.dynamic_offers && template.dynamic_offers[segment]) {
      const seg = template.dynamic_offers[segment];
      if (seg.discount_value) discountValue = seg.discount_value;
      if (seg.description) description = seg.description;
    }

    // Compute expiry
    let expiresAt = null;
    if (template.expiration_date) {
      expiresAt = new Date(template.expiration_date).toISOString();
    } else if (template.expiration_days) {
      expiresAt = new Date(Date.now() + template.expiration_days * 24 * 60 * 60 * 1000).toISOString();
    }

    // Generate the PassInstance for this user
    const serial = `BC-${Date.now().toString(36).toUpperCase()}-${randomCode(4)}`;
    const redemptionCode = `${randomCode(4)}-${randomCode(4)}`;

    const instance = await svc.entities.PassInstance.create({
      wallet_pass_id: template.id,
      venue_id: venue.id,
      pass_type: 'coupon',
      consumer_user_id: user.id,
      consumer_name: user.full_name || '',
      consumer_email: user.email || '',
      serial_number: serial,
      redemption_code: redemptionCode,
      status: 'issued',
      issued_at: now,
      ...(expiresAt ? { expires_at: expiresAt } : {}),
      delivery_method: 'link',
      delivery_status: 'pending',
    });

    // Bump template issued count + beacon trigger stats
    await svc.entities.WalletPass.update(template.id, { total_issued: (template.total_issued || 0) + 1 });
    await svc.entities.Beacon.update(beacon.id, {
      last_triggered_at: now,
      trigger_count: (beacon.trigger_count || 0) + 1,
    });

    // Push the "Redeem Now" notification to just this user
    const headline = discountValue ? `${discountValue} at ${venue.name}` : `A deal is waiting at ${venue.name}`;
    const pushed = await pushToUser(
      user.id,
      headline,
      description || template.title || 'Tap to open your coupon and redeem now.',
      { pass_instance_id: instance.id, deep_link: `/wallet-pass/${instance.id}` },
    );

    // Email fallback so the coupon is never lost (esp. for users without push).
    const emailed = await emailCoupon({
      email: user.email,
      name: user.full_name,
      venueName: venue.name,
      title: template.title,
      discountValue,
      description,
      redemptionCode,
      passUrl: `/wallet-pass/${instance.id}`,
    });
    await svc.entities.PassInstance.update(instance.id, {
      delivery_status: (pushed || emailed) ? 'sent' : 'failed',
    });

    eventRecord.action_taken = 'coupon_surfaced';
    eventRecord.pass_instance_id = instance.id;
    eventRecord.wallet_pass_id = template.id;
    const created = await svc.entities.ProximityEvent.create(eventRecord);

    return Response.json({
      success: true,
      action: 'coupon_surfaced',
      segment,
      discount_value: discountValue,
      description,
      pass_instance_id: instance.id,
      redemption_code: redemptionCode,
      proximity_event_id: created.id, venue_id: venue.id,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});