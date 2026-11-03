import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const ALLOWED_TIERS = ['premium', 'platinum'];

// Monthly promotional message credits included with each plan.
// Premium ships with 10/mo (as marketed); Platinum gets a higher allowance.
const LEGACY_LIMIT = 20; // pre-tier default — treated as "not explicitly set"
function monthlyCredits(tier) {
  if (tier === 'platinum') return 30;
  if (tier === 'premium') return 10;
  return 0;
}

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

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    // Health check for the admin System Status panel: confirm OneSignal accepts our keys.
    if (body.probe) {
      const appId = Deno.env.get('ONESIGNAL_APP_ID');
      const r = await fetch(`https://api.onesignal.com/apps/${appId}`, {
        headers: { Authorization: `Key ${Deno.env.get('ONESIGNAL_REST_API_KEY')}` },
      });
      return Response.json({ ok: r.ok, status: r.status });
    }
    const { venue_id, type, title, message, image_urls, video_url, fallback_sms, traffic_type } = body;
    // Normalize media inputs: image_urls is an array; video_url is a single string
    const images = Array.isArray(image_urls) ? image_urls.filter(Boolean) : [];
    const video = video_url || null;

    if (!venue_id) return Response.json({ error: 'venue_id is required' }, { status: 400 });
    if (!message) return Response.json({ error: 'message is required' }, { status: 400 });

    // Verify venue ownership + tier
    const venues = await base44.asServiceRole.entities.Venue.filter({ id: venue_id });
    const venue = venues[0];
    if (!venue) return Response.json({ error: 'Venue not found' }, { status: 404 });
    if (venue.owner_id !== user.id && user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (!ALLOWED_TIERS.includes(venue.subscription_tier) && user.role !== 'admin') {
      return Response.json({ error: 'This feature requires a Premium or Platinum subscription.' }, { status: 403 });
    }

    // --- Monthly limit check & tracking ---
    const currentMonth = new Date().toISOString().slice(0, 7); // "YYYY-MM"
    let settingsRecords = await base44.asServiceRole.entities.VenueCommunicationSettings.filter({ venue_id });
    let settings = settingsRecords[0];

    const tierCredits = monthlyCredits(venue.subscription_tier);

    if (!settings) {
      // First time — seed the record with the plan's included credits
      settings = await base44.asServiceRole.entities.VenueCommunicationSettings.create({
        venue_id,
        monthly_message_limit: tierCredits,
        messages_sent_this_month: 0,
        last_reset_date: currentMonth,
      });
    }

    // Reset counter if it's a new month
    let sentThisMonth = settings.messages_sent_this_month || 0;
    if (settings.last_reset_date !== currentMonth) {
      sentThisMonth = 0;
      await base44.asServiceRole.entities.VenueCommunicationSettings.update(settings.id, {
        messages_sent_this_month: 0,
        last_reset_date: currentMonth,
      });
    }

    // A stored limit is an admin override; the legacy 20 default is treated as unset
    // so the plan's own credit allowance applies.
    const stored = settings.monthly_message_limit;
    const limit = (stored == null || stored === LEGACY_LIMIT) ? tierCredits : stored;
    if (sentThisMonth >= limit) {
      return Response.json({
        error: `Monthly message limit reached (${limit}/${limit}). Resets on the 1st of next month.`,
        limit,
        sent: sentThisMonth,
      }, { status: 429 });
    }

    // --- Gather opted-in fans ---
    const favorites = await base44.asServiceRole.entities.Favorite.filter({ venue_id, receive_venue_comms: true });
    if (favorites.length === 0) {
      return Response.json({ success: true, sent: 0, message: 'No opted-in fans to notify yet.' });
    }

    // Get their profiles for phone numbers (SMS) and user IDs (push)
    const fanUserIds = favorites.map(f => f.user_id).filter(Boolean);
    const allProfiles = await base44.asServiceRole.entities.Profile.list();
    const profilesByCreator = {};
    allProfiles.forEach(p => { profilesByCreator[p.created_by_id] = p; });

    const appId = Deno.env.get('ONESIGNAL_APP_ID');
    const apiKey = Deno.env.get('ONESIGNAL_REST_API_KEY');

    let totalSent = 0;
    const errors = [];

    if (type === 'sms') {
      // Collect phone numbers from opted-in fans who have notif_sms enabled
      const phoneNumbers = fanUserIds
        .map(uid => profilesByCreator[uid])
        .filter(p => p && p.notif_sms && p.phone)
        .map(p => p.phone);

      if (phoneNumbers.length > 0) {
        const smsPayload = {
          app_id: appId,
          name: `${venue.name} - ${title || 'Venue Update'}`,
          contents: { en: message },
          channel_for_external_user_ids: 'sms',
          include_phone_numbers: phoneNumbers,
        };
        const res = await fetch('https://onesignal.com/api/v1/notifications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Key ${apiKey}` },
          body: JSON.stringify(smsPayload),
        });
        const result = await res.json();
        totalSent = result.recipients || phoneNumbers.length;
      }
    } else if (type === 'rcs') {
      // RCS — targets opted-in fans by phone number
      // Requires: RCS brand approved in OneSignal dashboard
      // Recipient phone numbers normalized to E.164 (e.g. +18645551212)
      const phoneNumbers = fanUserIds
        .map(uid => profilesByCreator[uid])
        .filter(p => p && p.notif_sms && p.phone)
        .map(p => toE164(p.phone))
        .filter(Boolean);

      // RCS sender / agent ID — the approved business sender (configurable via secret, falls back to venue name)
      const rcsSenderId = Deno.env.get('RCS_AGENT_ID') || venue.name;
      // Message purpose / traffic type — promotional by default for venue marketing
      const messageTrafficType = traffic_type || 'PROMOTION';
      // Fallback SMS text shown when RCS is unavailable on the recipient device
      const fallbackText = (fallback_sms && fallback_sms.trim()) || message;

      if (phoneNumbers.length > 0) {
        const rcsPayload = {
          app_id: appId,
          name: `${venue.name} - ${title || 'Venue Update'}`,
          contents: { en: message },             // Message body — actual text shown to the user
          headings: { en: title || venue.name },
          channel_for_external_user_ids: 'rcs',
          include_phone_numbers: phoneNumbers,    // Recipient phone numbers (E.164)
          rcs_sender_id: rcsSenderId,             // Approved RCS sender / agent ID
          message_traffic_type: messageTrafficType, // Promotional / transactional / etc.
          sms_fallback: { en: fallbackText },     // Fallback SMS text if RCS unavailable
          // Media: video takes priority as a single rich card; multiple images become a carousel;
          // a single image becomes one rich card; no media = plain text.
          ...(() => {
            if (video) {
              // Single rich card with an inline video
              return {
                rcs_card: { title: title || venue.name, description: message, media_url: video },
                big_picture: video,
              };
            }
            if (images.length > 1) {
              // Carousel — one card per image
              return {
                rcs_carousel: images.map((url, i) => ({
                  title: i === 0 ? (title || venue.name) : '',
                  description: i === 0 ? message : '',
                  media_url: url,
                })),
                big_picture: images[0],
              };
            }
            if (images.length === 1) {
              return {
                rcs_card: { title: title || venue.name, description: message, media_url: images[0] },
                big_picture: images[0],
              };
            }
            return {};
          })(),
        };
        const res = await fetch('https://onesignal.com/api/v1/notifications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Key ${apiKey}` },
          body: JSON.stringify(rcsPayload),
        });
        const result = await res.json();
        if (result.errors) errors.push(...(Array.isArray(result.errors) ? result.errors : [result.errors]));
        totalSent = result.recipients || phoneNumbers.length;
      }
    } else {
      // Push notification — target opted-in fans by external user IDs
      const pushPayload = {
        app_id: appId,
        headings: { en: title || venue.name },
        contents: { en: message },
        url: `/venue/${venue_id}`,
        include_external_user_ids: fanUserIds,
        channel_for_external_user_ids: 'push',
      };
      const res = await fetch('https://onesignal.com/api/v1/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Key ${apiKey}` },
        body: JSON.stringify(pushPayload),
      });
      const result = await res.json();
      totalSent = result.recipients || fanUserIds.length;
    }

    // Increment counter
    await base44.asServiceRole.entities.VenueCommunicationSettings.update(settings.id, {
      messages_sent_this_month: sentThisMonth + 1,
      last_reset_date: currentMonth,
    });

    return Response.json({
      success: true,
      sent: totalSent,
      fans_total: favorites.length,
      remaining: limit - sentThisMonth - 1,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});