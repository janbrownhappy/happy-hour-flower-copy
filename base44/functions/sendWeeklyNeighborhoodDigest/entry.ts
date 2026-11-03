import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { requireAutomationCaller } from '../../shared/automationAuth.ts';
import { createResend } from '../../shared/resendClient.ts';
import { withConsumerFooterHtml } from '../../shared/consumerEmailFooter.ts';

// Weekly digest: emails each user the newest venues added in their saved neighborhood
// over the past 7 days, sent via Resend.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const denied = await requireAutomationCaller(base44, req);
    if (denied) return denied;

    const sinceTs = Date.now() - 7 * 24 * 60 * 60 * 1000;

    // Newest active venues created in the past week
    const allVenues = await base44.asServiceRole.entities.Venue.list('-created_date', 1000);
    const recentVenues = allVenues.filter(v =>
      v.status === 'active' &&
      v.neighborhood &&
      v.created_date && new Date(v.created_date).getTime() >= sinceTs
    );

    if (recentVenues.length === 0) {
      return Response.json({ success: true, emails_sent: 0, reason: 'No new venues this week' });
    }

    // Group recent venues by neighborhood code (leading token, e.g. "GVL-01")
    const venuesByCode = {};
    for (const v of recentVenues) {
      const code = String(v.neighborhood).split(/\s+/)[0];
      (venuesByCode[code] ||= []).push(v);
    }

    // Users with a saved neighborhood
    const allProfiles = await base44.asServiceRole.entities.Profile.list();
    const allUsers = await base44.asServiceRole.entities.User.list();
    const usersById = Object.fromEntries(allUsers.map(u => [u.id, u]));

    const resend = createResend(Deno.env.get('RESEND_API_KEY'));

    let sent = 0;
    for (const profile of allProfiles) {
      const pref = profile.location_preferences?.neighborhood;
      if (!pref) continue;
      const code = String(pref).split(/\s+/)[0];
      const matches = venuesByCode[code];
      if (!matches || matches.length === 0) continue;

      const user = usersById[profile.created_by_id];
      const email = user?.email || profile.email;
      if (!email) continue;

      const cleanHood = String(matches[0].neighborhood).replace(/^[A-Z]+-\d+\s*/, '') || matches[0].neighborhood;
      const items = matches.map(v => {
        const cat = v.category ? ` — ${v.category}` : '';
        return `<li style="margin-bottom:8px;"><strong>${v.name}</strong>${cat}</li>`;
      }).join('');

      const html = withConsumerFooterHtml(`
        <div style="font-family:Arial,sans-serif;color:#1a1a1a;">
          <p>Hi ${user?.full_name || profile.display_name || 'there'},</p>
          <p>Here are the newest happy hour spots added to <strong>${cleanHood}</strong> this week:</p>
          <ul style="padding-left:18px;">${items}</ul>
          <p>Open Happy Hour Flower to explore their deals and hours.</p>
          <p style="color:#888;font-size:13px;">— Happy Hour Flower 🌸</p>
        </div>
      `);

      const { error: sendError } = await resend.emails.send({
        from: 'Happy Hour Flower <happy@updates.happyhourflower.com>',
        to: [email],
        subject: `🌸 ${matches.length} new happy hour ${matches.length === 1 ? 'spot' : 'spots'} in ${cleanHood}`,
        html,
      });
      if (!sendError) sent++;
    }

    return Response.json({ success: true, emails_sent: sent, new_venues: recentVenues.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});