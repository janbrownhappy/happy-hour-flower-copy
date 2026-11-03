import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { requireAutomationCaller } from '../../shared/automationAuth.ts';
import { buildPassBody, updatePass } from '../../shared/walletwallet.ts';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const denied = await requireAutomationCaller(base44, req);
    if (denied) return denied;
    const payload = await req.json();

    // Called by entity automation — no user auth needed, use service role
    const { event, data } = payload;

    if (!data || !data.venue_id) {
      return Response.json({ skipped: true, reason: 'No venue_id on pass' });
    }

    const { venue_id, pass_type, title, description, status } = data;

    // Only notify for active passes
    if (status && status !== 'active') {
      return Response.json({ skipped: true, reason: 'Pass is not active' });
    }

    // Template edited: refresh every pass already on customers' phones
    if (event?.type === 'update' && data.id) {
      const page = await base44.asServiceRole.entities.PassInstance.filter({ wallet_pass_id: data.id, status: 'issued' }, { limit: 500 });
      for (const inst of (page.items || page)) {
        if (inst.passkit_id) await updatePass(inst.passkit_id, buildPassBody(data, inst)).catch(() => {});
      }
    }

    // Get venue info
    const venues = await base44.asServiceRole.entities.Venue.filter({ id: venue_id });
    const venue = venues[0];
    if (!venue) return Response.json({ skipped: true, reason: 'Venue not found' });

    // Get opted-in fans for this venue
    const favorites = await base44.asServiceRole.entities.Favorite.filter({ venue_id });
    const optedInFans = favorites.filter(f => f.receive_venue_comms === true);
    if (optedInFans.length === 0) {
      return Response.json({ success: true, sent: 0, reason: 'No opted-in fans' });
    }

    const fanUserIds = optedInFans.map(f => f.user_id).filter(Boolean);

    const isNew = event?.type === 'create';
    const passLabel = pass_type === 'loyalty_card' ? 'Loyalty Card' : 'Coupon';
    const notifTitle = isNew
      ? `New ${passLabel} from ${venue.name}!`
      : `${venue.name} updated their ${passLabel}`;
    const notifMessage = description
      ? `${title} — ${description}`
      : title || `Check out the latest offer from ${venue.name}`;

    const appId = Deno.env.get('ONESIGNAL_APP_ID');
    const apiKey = Deno.env.get('ONESIGNAL_REST_API_KEY');

    // Send push notification via OneSignal
    let totalSent = 0;
    if (appId && apiKey && fanUserIds.length > 0) {
      const pushPayload = {
        app_id: appId,
        headings: { en: notifTitle },
        contents: { en: notifMessage },
        url: `/venue/${venue_id}`,
        include_external_user_ids: fanUserIds,
        channel_for_external_user_ids: 'push',
      };
      const res = await fetch('https://onesignal.com/api/v1/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Basic ${apiKey}` },
        body: JSON.stringify(pushPayload),
      });
      const result = await res.json();
      totalSent = result.recipients || fanUserIds.length;
    }

    // Also send emails to fans who have email addresses
    const mailApiKey = Deno.env.get('MAILERSEND_API_KEY');
    let emailsSent = 0;
    if (mailApiKey) {
      const allProfiles = await base44.asServiceRole.entities.Profile.list();
      const profilesByCreator = {};
      allProfiles.forEach(p => { profilesByCreator[p.created_by_id] = p; });

      const emailFans = fanUserIds
        .map(uid => profilesByCreator[uid])
        .filter(p => p && p.email);

      for (const profile of emailFans) {
        const emailBody = `
          <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:24px">
            <h2 style="color:#f5a623">${notifTitle}</h2>
            <p style="font-size:16px;color:#333">${notifMessage}</p>
            <a href="https://happyhourflower.com/venue/${venue_id}"
               style="display:inline-block;margin-top:16px;padding:12px 24px;background:#f5a623;color:#fff;border-radius:8px;text-decoration:none;font-weight:bold">
              View ${passLabel}
            </a>
            <p style="font-size:12px;color:#999;margin-top:24px">
              You're receiving this because you follow ${venue.name} on Happy Hour Flower.
            </p>
          </div>`;

        await fetch('https://api.mailersend.com/v1/email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${mailApiKey}`,
          },
          body: JSON.stringify({
            from: { email: 'noreply@happyhourflower.com', name: venue.name },
            to: [{ email: profile.email }],
            subject: notifTitle,
            html: emailBody,
          }),
        }).catch(() => {}); // don't block on individual email failures
        emailsSent++;
      }
    }

    return Response.json({ success: true, push_sent: totalSent, emails_sent: emailsSent, fans: optedInFans.length });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});