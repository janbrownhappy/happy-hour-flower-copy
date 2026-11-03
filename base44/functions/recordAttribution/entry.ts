import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { applyTouch, getAttribution, withinWindow } from '../../shared/attribution.ts';

// Authenticated attribution writer.
// event: 'touch' | 'signup' | 'venue_view' | 'special_view' | 'directions' | 'arrival' | 'premium'
// Conversions are credited to the last QR touch only inside the 7-day window and (for
// venue-specific events) only when the QR was tied to that same venue.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const svc = base44.asServiceRole;
    const { event, touch, venue_id, method } = await req.json();

    let attr = touch ? await applyTouch(svc, user.id, touch) : await getAttribution(svc, user.id);
    const now = new Date().toISOString();
    const inWin = withinWindow(attr);
    const sameVenue = !!venue_id && attr?.venue_id === venue_id;
    let patch = null;

    if (event === 'signup' && inWin && !attr.signup_qr_id) patch = { signup_qr_id: attr.qr_id, signup_at: now };
    if (event === 'venue_view' && inWin && sameVenue && !attr.venue_viewed_at) patch = { venue_viewed_qr_id: attr.qr_id, venue_viewed_at: now };
    if (event === 'special_view' && inWin && sameVenue && !attr.special_viewed_at) patch = { special_viewed_qr_id: attr.qr_id, special_viewed_at: now };
    if (event === 'directions' && inWin && sameVenue && !attr.directions_clicked_at) patch = { directions_qr_id: attr.qr_id, directions_clicked_at: now };
    if (event === 'arrival' && inWin && sameVenue && !attr.arrival_at) patch = { arrival_qr_id: attr.qr_id, arrival_at: now, arrival_method: String(method || '').slice(0, 20) };
    if (event === 'premium' && inWin && !attr.premium_at) patch = { premium_qr_id: attr.qr_id, premium_at: now };

    if (patch) attr = await svc.entities.Attribution.update(attr.id, patch);

    const credited = !!patch;
    return Response.json({
      credited,
      attribution: attr ? {
        acquisition_source: attr.first_source || '', acquisition_channel: attr.first_channel || '',
        acquisition_campaign: attr.first_campaign || '', acquisition_placement: attr.first_placement || '',
        qr_id: credited || inWin ? attr.qr_id : '', campaign: inWin ? attr.campaign : '',
        ambassador_id: attr.ambassador_id || '', market: attr.market || '',
      } : null,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}