import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { secrets } from 'base44:runtime';
import { requireAutomationCaller } from '../../shared/automationAuth.ts';
import { upcomingAppearances } from '../../shared/truckSchedule.ts';
import { createResend } from '../../shared/resendClient.ts';

const APP_URL = 'https://happyhourflower.base44.app';

function renderRows(appearances) {
  return appearances
    .map((a) => {
      const when = [a.start_time, a.end_time].filter(Boolean).join(' – ') || 'time not set';
      const where = a.location_name || a.address || 'location not set';
      const flag = a.confirmed ? '' : ' <span style="color:#b45309;font-weight:600">needs confirming</span>';
      return `<tr>
        <td style="padding:6px 12px 6px 0;white-space:nowrap"><strong>${a.day || ''} ${a.date}</strong></td>
        <td style="padding:6px 12px 6px 0">${where}</td>
        <td style="padding:6px 0">${when}${flag}</td>
      </tr>`;
    })
    .join('');
}

function buildEmail(venue, appearances, isReview) {
  const link = `${APP_URL}/venue-dashboard/${venue.id}#truck-schedule`;
  const intro = isReview
    ? `You changed <strong>${venue.name}</strong>'s schedule recently — here's how it now reads to customers. Take a quick look and make sure it's right.`
    : `We've pre-filled <strong>${venue.name}</strong>'s stops for the week ahead. Confirm or correct them and they'll go live on the map — until then your truck stays hidden.`;

  return {
    subject: isReview
      ? `Review your updated schedule — ${venue.name}`
      : `Confirm this week's stops — ${venue.name}`,
    html: `<div style="font-family:system-ui,-apple-system,sans-serif;max-width:560px;color:#1c1917">
      <h2 style="font-size:20px;margin:0 0 12px">${isReview ? 'Your schedule changed' : "This week's stops"}</h2>
      <p style="line-height:1.5;margin:0 0 16px">${intro}</p>
      <table style="font-size:14px;border-collapse:collapse;margin:0 0 20px">${renderRows(appearances)}</table>
      <a href="${link}" style="display:inline-block;background:#d97706;color:#fff;text-decoration:none;padding:12px 20px;border-radius:10px;font-weight:600">
        ${isReview ? 'Review my schedule' : 'Confirm my schedule'}
      </a>
      <p style="color:#78716c;font-size:12px;line-height:1.5;margin:20px 0 0">
        Stops without a confirmed date and time are never shown to customers. You can add, change or remove
        stops at any time — including dates further out than this week.
      </p>
    </div>`,
  };
}

// Weekly owner confirmation for food-truck schedules. Invoked by the scheduled
// workflow (no user token) or manually by an admin for one venue.
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const denied = await requireAutomationCaller(base44, req);
    if (denied) return denied;

    const body = await req.json().catch(() => ({}));
    const onlyVenueId = body.venue_id || null;

    const svc = base44.asServiceRole.entities;
    const venues = onlyVenueId
      ? [await svc.Venue.get(onlyVenueId)].filter(Boolean)
      : await svc.Venue.list('name', 5000);

    const users = await svc.User.list('', 5000);
    const emailById = Object.fromEntries(users.map((u) => [u.id, u.email]));

    const sent = [];
    const skipped = [];

    for (const venue of venues) {
      const appearances = upcomingAppearances(venue, 7);
      if (!appearances.length) {
        if (onlyVenueId) skipped.push({ venue: venue.name, reason: 'no upcoming stops' });
        continue;
      }
      if (!venue.owner_id) {
        if (onlyVenueId) skipped.push({ venue: venue.name, reason: 'no owner yet' });
        continue;
      }
      const to = emailById[venue.owner_id];
      if (!to) {
        skipped.push({ venue: venue.name, reason: 'owner has no email on file' });
        continue;
      }

      // A mid-week owner edit earns one review email; otherwise we only chase
      // schedules still waiting on a first confirmation.
      const changedSinceNotice =
        venue.schedule_changed_at &&
        (!venue.schedule_notified_at || venue.schedule_changed_at > venue.schedule_notified_at);
      const isReview = !venue.schedule_pending_confirmation && changedSinceNotice;

      if (!onlyVenueId && !venue.schedule_pending_confirmation && !changedSinceNotice) continue;

      const { subject, html } = buildEmail(venue, appearances, isReview);
      const { error: sendError } = await createResend(Deno.env.get('RESEND_API_KEY')).emails.send({ to, subject, html });
      if (sendError) throw new Error(sendError.message);
      await svc.Venue.update(venue.id, { schedule_notified_at: new Date().toISOString() });
      sent.push({ venue: venue.name, to, kind: isReview ? 'review' : 'confirmation', stops: appearances.length });
    }

    return Response.json({ success: true, sent_count: sent.length, sent, skipped });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}