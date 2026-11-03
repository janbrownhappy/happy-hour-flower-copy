import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// Records an offer view or redeem-click for a signed-in user.
Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me().catch(() => null);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { venue_id, day, offer_text, type } = await req.json();
  const text = String(offer_text || '').trim().slice(0, 500);
  if (!venue_id || !DAYS.includes(day) || !text) return Response.json({ error: 'Invalid input' }, { status: 400 });

  const svc = base44.asServiceRole.entities;
  const venue = await svc.Venue.get(venue_id).catch(() => null);
  if (!venue) return Response.json({ error: 'Venue not found' }, { status: 404 });

  const key = `${day}::${text}`;
  const field = type === 'redeem' ? 'redeem_click_count' : 'view_count';
  const now = new Date().toISOString();
  const [rec] = await svc.OfferStat.filter({ venue_id, offer_key: key });
  if (rec) {
    await svc.OfferStat.update(rec.id, { [field]: (rec[field] || 0) + 1, last_activity_at: now });
  } else {
    await svc.OfferStat.create({
      venue_id, owner_id: venue.owner_id || null, venue_name: venue.name, day, offer_text: text, offer_key: key,
      view_count: field === 'view_count' ? 1 : 0, redeem_click_count: field === 'redeem_click_count' ? 1 : 0, last_activity_at: now,
    });
  }
  return Response.json({ ok: true });
});