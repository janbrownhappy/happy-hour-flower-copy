import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { resolveHHFDestination, campaignDestinationId } from '../../shared/hhfDestination.ts';
import { applyTouch } from '../../shared/attribution.ts';

const CODE_RE = /^[A-Z0-9]{4,12}$/;
const UA = ['ios', 'android', 'desktop', 'other'];
const REF = ['direct', 'internal', 'external'];

// Public QR resolver: validates the code, records the scan, returns a same-site destination.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const svc = base44.asServiceRole;
    const body = await req.json().catch(() => ({}));
    const code = String(body.short_code || '').trim().toUpperCase();
    if (!CODE_RE.test(code)) return Response.json({ ok: false, reason: 'malformed', short_code: code.slice(0, 12) });

    const found = await svc.entities.QrCampaign.filter({ short_code: code });
    const c = found[0];
    if (!c) return Response.json({ ok: false, reason: 'not_found', short_code: code });
    if (c.status !== 'active') return Response.json({ ok: false, reason: 'inactive', short_code: code });
    if (c.expiration_date && new Date(c.expiration_date + 'T23:59:59Z').getTime() < Date.now()) {
      return Response.json({ ok: false, reason: 'expired', short_code: code });
    }

    const destId = campaignDestinationId(c);
    const destination = await resolveHHFDestination(svc, c.destination_type, destId, { url: c.destination_url });
    if (!destination) return Response.json({ ok: false, reason: 'invalid_destination', short_code: code });

    let user = null;
    try { user = await base44.auth.me(); } catch (_) { user = null; }

    const sessionId = String(body.session_id || '').replace(/[^a-zA-Z0-9-]/g, '').slice(0, 64);
    const now = new Date();
    let rapid = false;
    if (sessionId) {
      const recent = await svc.entities.QrScan.filter({ short_code: code, session_id: sessionId }, '-scanned_at', 1);
      rapid = !!recent[0] && now.getTime() - new Date(recent[0].scanned_at).getTime() < 10000;
    }

    const props = {
      qr_id: c.qr_id, venue_id: c.venue_id || '', special_id: c.special_id || '',
      ambassador_id: c.ambassador_id || '', market: c.market || '', source: c.source || '',
      channel: c.channel || '', campaign: c.campaign || '', placement: c.placement_type || '',
      destination_type: c.destination_type, destination_id: destId || '',
    };

    await svc.entities.QrScan.create({
      ...props, qr_campaign_id: c.id, short_code: code, hhf_user_id: user?.id || '',
      scanned_at: now.toISOString(), session_id: sessionId,
      user_agent_category: UA.includes(body.user_agent_category) ? body.user_agent_category : 'other',
      referrer_type: REF.includes(body.referrer_type) ? body.referrer_type : 'direct',
      is_rapid_repeat: rapid,
    });

    if (user) await applyTouch(svc, user.id, { ...props, touched_at: now.toISOString() });

    return Response.json({ ok: true, destination, attribution: { ...props, touched_at: now.toISOString() } });
  } catch (error) {
    return Response.json({ ok: false, reason: 'error', error: error.message }, { status: 500 });
  }
}