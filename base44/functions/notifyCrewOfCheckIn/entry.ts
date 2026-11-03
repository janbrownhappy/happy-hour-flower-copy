import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { createResend } from '../../shared/resendClient.ts';
import { requireAutomationCaller } from '../../shared/automationAuth.ts';
import { esc, safeHttpUrl } from '../../shared/htmlEscape.ts';

const PREMIUM_STATUSES = ['active'];

// Normalize a phone number to E.164 (defaults to US +1 when no country code present)
function toE164(raw) {
  if (!raw) return null;
  const trimmed = String(raw).trim();
  if (trimmed.startsWith('+')) {
    const digits = trimmed.slice(1).replace(/\D/g, '');
    return digits ? `+${digits}` : null;
  }
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  return digits ? `+${digits}` : null;
}

// Triggered by an entity automation on CheckIn create/update.
// Notifies the crew owner's members when a check-in is shared with the crew (new) or its note changes (plan updated).
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const denied = await requireAutomationCaller(base44, req);
    if (denied) return denied;
    const body = await req.json();
    const { event, data, old_data, payload_too_large } = body;

    const entityId = event?.entity_id;
    let checkIn = data;
    if (payload_too_large && entityId) {
      checkIn = await base44.asServiceRole.entities.CheckIn.get(entityId);
    }
    if (!checkIn) return Response.json({ skipped: 'no check-in data' });

    // Only notify for crew-shared check-ins.
    if (!checkIn.shared_with_crew) return Response.json({ skipped: 'not shared with crew' });

    // On update, only notify when this became shared, or the note actually changed.
    const isUpdate = event?.type === 'update';
    if (isUpdate && old_data) {
      const becameShared = !old_data.shared_with_crew && checkIn.shared_with_crew;
      const noteChanged = (old_data.note || '') !== (checkIn.note || '');
      if (!becameShared && !noteChanged) {
        return Response.json({ skipped: 'no relevant change' });
      }
    }

    const ownerId = checkIn.user_id || checkIn.created_by_id;
    if (!ownerId) return Response.json({ skipped: 'no owner' });

    // Owner must be a premium consumer for crew notifications.
    const ownerProfiles = await base44.asServiceRole.entities.Profile.filter({ created_by_id: ownerId });
    const ownerProfile = ownerProfiles[0];
    const isPremium = ownerProfile?.is_premium || PREMIUM_STATUSES.includes(ownerProfile?.subscription_status);
    if (!isPremium) return Response.json({ skipped: 'owner not premium' });

    // Gather the owner's crew members (joined or invited with contact info).
    const crew = await base44.asServiceRole.entities.CrewMember.filter({ owner_id: ownerId });
    if (!crew.length) return Response.json({ skipped: 'no crew members' });

    const ownerName = checkIn.user_name || ownerProfile?.display_name || 'Your crew member';
    const venueName = checkIn.venue_name || 'a venue';

    // Load the full venue so the notification can include real venue details.
    let venue = null;
    if (checkIn.venue_id) {
      venue = await base44.asServiceRole.entities.Venue.get(checkIn.venue_id).catch(() => null);
    }
    const venueAddress = [venue?.address, venue?.city, venue?.zip_code].filter(Boolean).join(', ');
    const venueLink = venue?.id ? `https://happyhourflower.com/venue/${venue.id}` : 'https://happyhourflower.com';
    // Google Maps directions link — prefer precise coordinates, fall back to the address.
    const directionsDestination = (Number.isFinite(venue?.lat) && Number.isFinite(venue?.lng))
      ? `${venue.lat},${venue.lng}`
      : venueAddress;
    const directionsLink = directionsDestination
      ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(directionsDestination)}`
      : null;
    const venueDetailLines = [
      venue?.category,
      venueAddress,
      venue?.phone,
    ].filter(Boolean);
    const verb = isUpdate ? 'updated their plan at' : 'just checked in at';
    const noteLine = checkIn.note ? ` — "${checkIn.note}"` : '';
    const subject = `${ownerName} ${verb} ${venueName} 🌸`;
    const messageText = `${ownerName} ${verb} ${venueName}${venueAddress ? ` (${venueAddress})` : ''}${noteLine}. See it on Happy Hour Flower: ${venueLink}${directionsLink ? ` — Directions: ${directionsLink}` : ''}`;

    const resend = createResend(Deno.env.get('RESEND_API_KEY'));
    const appId = Deno.env.get('ONESIGNAL_APP_ID');
    const apiKey = Deno.env.get('ONESIGNAL_REST_API_KEY');

    // Only notify crew who actually joined the app; email goes to their real account
    // address, never to an address typed in by the crew owner.
    const joined = crew.filter(m => m.status === 'joined' && m.member_user_id);
    const memberUsers = joined.length
      ? await base44.asServiceRole.entities.User.filter({ id: { $in: joined.map(m => m.member_user_id) } })
      : [];
    const emailById = Object.fromEntries(memberUsers.map(u => [u.id, u.email]));

    const emails = [];
    const phones = [];
    for (const m of joined) {
      const accountEmail = emailById[m.member_user_id];
      if (accountEmail) emails.push(accountEmail);
      else if (m.phone) {
        const e164 = toE164(m.phone);
        if (e164) phones.push(e164);
      }
    }

    let emailsSent = 0;
    let smsSent = 0;

    // Email crew members
    if (emails.length) {
      const html = `
<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="font-family:Arial,sans-serif;color:#1a1a1a;background:#f9fafb;margin:0;padding:0">
  <div style="max-width:520px;margin:30px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)">
    <div style="background:linear-gradient(135deg,#f59e0b,#d97706);padding:30px;text-align:center">
      <h1 style="margin:0;color:#fff;font-size:20px">🌸 Crew Update</h1>
    </div>
    <div style="padding:30px;text-align:center">
      <p style="font-size:16px;color:#374151;line-height:1.6">
        <strong>${esc(ownerName)}</strong> ${verb} <strong>${esc(venueName)}</strong>${noteLine ? `<br/><em style="color:#6b7280">${esc(checkIn.note)}</em>` : ''}
      </p>
      ${venueDetailLines.length ? `
      <div style="text-align:left;background:#fef3c7;border-radius:10px;padding:16px 20px;margin:20px 0">
        <p style="margin:0 0 6px;font-size:14px;font-weight:700;color:#92400e">${esc(venueName)}</p>
        ${venueDetailLines.map(line => `<p style="margin:2px 0;font-size:13px;color:#78350f">${esc(line)}</p>`).join('')}
        ${safeHttpUrl(venue?.website) ? `<p style="margin:8px 0 0"><a href="${esc(safeHttpUrl(venue.website))}" style="font-size:13px;color:#b45309">${esc(venue.website)}</a></p>` : ''}
        ${directionsLink ? `<p style="margin:8px 0 0"><a href="${directionsLink}" style="font-size:13px;color:#b45309;font-weight:600">📍 Get Directions</a></p>` : ''}
      </div>` : ''}
      <a href="${venueLink}" style="background:#f59e0b;color:#fff;padding:14px 32px;text-decoration:none;border-radius:8px;font-weight:600;display:inline-block;margin-top:16px">
        View Venue &amp; Join Them
      </a>
    </div>
    <div style="padding:20px;text-align:center;color:#9ca3af;font-size:12px;border-top:1px solid #f3f4f6">
      © ${new Date().getFullYear()} Happy Hour Flower
    </div>
  </div>
</body></html>`;
      const { error: sendError } = await resend.emails.send({
        from: 'Happy Hour Flower <happy@updates.happyhourflower.com>',
        to: emails,
        subject,
        html,
      });
      if (!sendError) emailsSent = emails.length;
    }

    // SMS crew members
    if (phones.length && appId && apiKey) {
      const authHeaders = { 'Content-Type': 'application/json', 'Authorization': `Key ${apiKey}` };
      const res = await fetch('https://onesignal.com/api/v1/notifications', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          app_id: appId,
          name: 'Crew Check-In Alert',
          contents: { en: messageText },
          channel_for_external_user_ids: 'sms',
          include_phone_numbers: phones,
        }),
      });
      const result = await res.json();
      if (res.ok && !result.errors) smsSent = result.recipients || phones.length;
    }

    return Response.json({ success: true, emailsSent, smsSent, crew: crew.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});