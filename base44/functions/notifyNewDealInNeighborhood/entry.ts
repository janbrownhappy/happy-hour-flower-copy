import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { createResend } from '../../shared/resendClient.ts';
import { withConsumerFooterHtml } from '../../shared/consumerEmailFooter.ts';
import { requireAutomationCaller } from '../../shared/automationAuth.ts';
import { esc } from '../../shared/htmlEscape.ts';

// Emails users when a venue in their saved neighborhood adds/updates a happy hour deal.
// Triggered by an entity automation on Venue update.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const denied = await requireAutomationCaller(base44, req);
    if (denied) return denied;
    const body = await req.json();
    const { event, data, changed_fields } = body || {};

    // Always load the stored venue — never trust venue fields from the request body.
    const venueId = event?.entity_id || data?.id;
    const venue = venueId ? await base44.asServiceRole.entities.Venue.get(venueId).catch(() => null) : null;
    if (!venue) {
      return Response.json({ skipped: true, reason: 'No venue data' });
    }

    // Only consider active venues with a neighborhood
    if (venue.status !== 'active') {
      return Response.json({ skipped: true, reason: 'Venue is not active' });
    }
    const neighborhoodLabel = venue.neighborhood;
    if (!neighborhoodLabel) {
      return Response.json({ skipped: true, reason: 'Venue has no neighborhood' });
    }

    // Require an actual deal-related change
    const dealFields = ['deals', 'deals_by_day'];
    const hasDealChange = changed_fields
      ? changed_fields.some(f => dealFields.includes(f))
      : true; // creates without changed_fields fall through if deals exist

    if (!hasDealChange) {
      return Response.json({ skipped: true, reason: 'No deal changes' });
    }

    // Make sure the venue actually has deals now (not just cleared them)
    const hasDeals =
      (Array.isArray(venue.deals) && venue.deals.length > 0) ||
      (venue.deals_by_day && Object.values(venue.deals_by_day).some(d => Array.isArray(d) && d.length > 0));
    if (!hasDeals) {
      return Response.json({ skipped: true, reason: 'No active deals on venue' });
    }

    // Neighborhood code is the leading token, e.g. "GVL-01 Downtown / Main Street" -> "GVL-01"
    const neighborhoodCode = String(neighborhoodLabel).split(/\s+/)[0];

    // Find profiles whose saved territory matches this neighborhood (by code or full label)
    const allProfiles = await base44.asServiceRole.entities.Profile.list();
    const matching = allProfiles.filter(p => {
      const pref = p.location_preferences?.neighborhood;
      if (!pref) return false;
      return pref === neighborhoodCode || pref === neighborhoodLabel;
    });

    if (matching.length === 0) {
      return Response.json({ success: true, emails_sent: 0, reason: 'No users in this neighborhood' });
    }

    // Map profiles to user emails
    const allUsers = await base44.asServiceRole.entities.User.list();
    const usersById = Object.fromEntries(allUsers.map(u => [u.id, u]));

    const venueName = venue.name || 'A venue';
    const cleanHood = String(neighborhoodLabel).replace(/^[A-Z]+-\d+\s*/, '') || neighborhoodLabel;
    const subject = `🌸 New happy hour deal at ${venueName}`;

    const resend = createResend(Deno.env.get('RESEND_API_KEY'));
    let sent = 0;

    for (const profile of matching) {
      const user = usersById[profile.created_by_id];
      const email = user?.email || profile.email;
      if (!email) continue;

      const html = withConsumerFooterHtml(`
        <p>Hi ${esc(user?.full_name || profile.display_name || 'there')},</p>
        <p><strong>${esc(venueName)}</strong> in <strong>${esc(cleanHood)}</strong> — one of your saved neighborhoods — just added a new happy hour deal!</p>
        <p>Open Happy Hour Flower to see the latest deals and hours.</p>
        <p style="color:#888;font-size:13px;">— Happy Hour Flower 🌸</p>
      `);

      const { error: sendError } = await resend.emails.send({
        from: 'Happy Hour Flower <happy@updates.happyhourflower.com>',
        to: [email],
        subject,
        html,
      });
      if (!sendError) sent++;
    }

    return Response.json({ success: true, emails_sent: sent, matched_users: matching.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});