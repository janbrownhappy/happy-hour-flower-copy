import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { createResend } from '../../shared/resendClient.ts';
import { requireAutomationCaller } from '../../shared/automationAuth.ts';
import { esc } from '../../shared/htmlEscape.ts';

// Fires when a Venue is updated. If its deals changed, email any owners who track
// this venue as a competitor so they can respond. Throttled to once/day per recipient venue.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const denied = await requireAutomationCaller(base44, req);
    if (denied) return denied;
    const payload = await req.json();

    const { event, data, old_data } = payload;
    // Always load the stored venue — never trust venue fields from the request body.
    const entityId = event?.entity_id || data?.id;
    const venue = entityId ? await base44.asServiceRole.entities.Venue.get(entityId).catch(() => null) : null;
    if (!venue || !venue.id) {
      return Response.json({ skipped: true, reason: 'No venue data' });
    }

    // Only act when the deals actually changed
    const dealsNow = JSON.stringify(venue.deals_by_day || venue.deals || {});
    const dealsBefore = old_data ? JSON.stringify(old_data.deals_by_day || old_data.deals || {}) : null;
    if (dealsBefore !== null && dealsNow === dealsBefore) {
      return Response.json({ skipped: true, reason: 'Deals unchanged' });
    }

    // Find all competitor records that reference this venue
    const allCompetitors = await base44.asServiceRole.entities.VenueCompetitor.list('-created_date', 5000);
    const trackers = allCompetitors.filter(c => {
      const ids = [
        ...(c.competitor_ids || []),
        ...(c.competitors || []).map(x => x.matched_venue_id).filter(Boolean),
      ];
      return ids.map(String).includes(String(venue.id));
    });

    if (trackers.length === 0) {
      return Response.json({ skipped: true, reason: 'No one tracks this venue' });
    }

    const resend = createResend(Deno.env.get('RESEND_API_KEY'));
    const oneDay = 24 * 60 * 60 * 1000;
    let sent = 0;

    for (const tracker of trackers) {
      const ownerVenue = await base44.asServiceRole.entities.Venue.get(tracker.venue_id).catch(() => null);
      if (!ownerVenue || !ownerVenue.owner_id) continue;

      // Throttle per tracking venue
      if (ownerVenue.competitor_alert_sent_at) {
        const last = new Date(ownerVenue.competitor_alert_sent_at).getTime();
        if (Date.now() - last < oneDay) continue;
      }

      const owner = await base44.asServiceRole.entities.User.get(ownerVenue.owner_id).catch(() => null);
      if (!owner?.email) continue;

      await resend.emails.send({
        from: 'Happy Hour Flower <happy@updates.happyhourflower.com>',
        to: owner.email,
        subject: `👀 ${venue.name} just updated their deals`,
        html: `<!DOCTYPE html>
<html>
<body style="font-family:'Nunito',sans-serif;background:#f8f4ef;padding:32px;color:#1a1a1a;">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:16px;padding:32px;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
    <p style="color:#666;">Hi ${esc(owner.full_name || 'there')},</p>
    <h2 style="color:#f5a623;margin:8px 0 16px;">A venue you're watching just changed their happy hour deals</h2>
    <p><strong>${esc(venue.name)}</strong> — one of your tracked competitors — just updated their deals. Now's a good time to review your own and stay ahead.</p>
    <div style="text-align:center;margin:28px 0;">
      <a href="https://happyhourflower.com/venue-owner" style="background:#f5a623;color:#fff;text-decoration:none;padding:12px 28px;border-radius:10px;font-weight:700;display:inline-block;">Review My Deals</a>
    </div>
    <hr style="margin:32px 0;border:none;border-top:1px solid #eee;" />
    <p style="font-size:12px;color:#aaa;text-align:center;">Happy Hour Flower · Greenville, SC</p>
  </div>
</body>
</html>`,
      });

      await base44.asServiceRole.entities.Venue.update(ownerVenue.id, {
        competitor_alert_sent_at: new Date().toISOString(),
      });
      sent++;
    }

    return Response.json({ success: true, sent });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});