// Venue owners text their opted-in fans via GoHighLevel. Paid tiers only,
// capped by admin-set weekly/monthly limits per tier. action: 'status' | 'send'.
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { ghlSmsToPhones } from '../../shared/ghlSms.ts';
import { loadSmsLimits, periodStarts } from '../../shared/smsLimits.ts';

const PAID = ['premium', 'platinum', 'platinum_plus'];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const sr = base44.asServiceRole;
    const { action = 'status', venue_id, message } = await req.json();

    const venue = (await sr.entities.Venue.filter({ id: venue_id }))[0];
    if (!venue) return Response.json({ error: 'Venue not found' }, { status: 404 });
    const canManage = user.role === 'admin' || venue.owner_id === user.id || (venue.editor_ids || []).includes(user.id);
    if (!canManage) return Response.json({ error: 'Forbidden' }, { status: 403 });

    const tier = venue.subscription_tier === 'platinum' && venue.geofence_addon_status === 'active'
      ? 'platinum_plus' : venue.subscription_tier;
    const paid = PAID.includes(tier);
    const limits = (await loadSmsLimits(sr))[tier] || { daily: 0, weekly: 0 };
    const { day, week } = periodStarts();
    const logs = await sr.entities.VenueMessageLog.filter(
      { venue_id, channels: 'sms', status: { $ne: 'failed' }, created_date: { $gte: week < day ? week : day } }, '-created_date', 1000);
    const sentWeek = logs.filter((l) => l.created_date >= week).length;
    const sentDay = logs.filter((l) => l.created_date >= day).length;
    const status = { paid, tier, limits, sent_day: sentDay, sent_week: sentWeek };

    if (action === 'status') return Response.json(status);

    if (!paid) return Response.json({ ...status, error: 'Texting fans requires a Premium or Platinum plan.' }, { status: 403 });
    if (sentDay >= limits.daily) return Response.json({ ...status, error: `Daily text limit reached (${limits.daily}). Try again tomorrow.` }, { status: 429 });
    if (sentWeek >= limits.weekly) return Response.json({ ...status, error: `Weekly text limit reached (${limits.weekly}). Resets Monday.` }, { status: 429 });
    const text = String(message || '').trim();
    if (!text) return Response.json({ error: 'Message is required' }, { status: 400 });

    const favs = await sr.entities.Favorite.filter({ venue_id, receive_venue_comms: true }, '-created_date', 5000);
    const fanIds = [...new Set(favs.map((f) => f.user_id || f.created_by_id).filter(Boolean))];
    const profiles = fanIds.length
      ? await sr.entities.Profile.filter({ created_by_id: { $in: fanIds }, notif_sms: true }, '-created_date', 5000)
      : [];
    const phones = profiles.map((p) => p.phone).filter(Boolean);
    if (!phones.length) return Response.json({ ...status, error: 'None of your fans have text alerts turned on yet.' }, { status: 400 });

    const body = `${venue.name}: ${text} Reply STOP to opt out.`;
    const sent = await ghlSmsToPhones(phones, body);
    await sr.entities.VenueMessageLog.create({
      venue_id, venue_name: venue.name, message: body, channels: ['sms'], recipient_count: sent,
      status: sent === 0 ? 'failed' : sent < phones.length ? 'partial' : 'sent',
      sent_by_user_id: user.id, sent_by_name: user.full_name,
    });
    if (!sent) return Response.json({ ...status, error: 'Texts could not be delivered. Please try again later.' }, { status: 502 });
    return Response.json({ ...status, success: true, sent, sent_day: sentDay + 1, sent_week: sentWeek + 1 });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
});