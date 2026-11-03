import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { SHORT_URL_BASE, isSafePath } from '../../shared/hhfDestination.ts';

const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const IMMUTABLE = ['qr_id', 'short_code', 'short_url', 'created_by', 'destination_history'];

function randomCode(len = 6) {
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  return Array.from(bytes, b => ALPHABET[b % ALPHABET.length]).join('');
}

// Admin-only create/update for QR campaigns. Generates permanent qr_id + short_code on create.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });
    const svc = base44.asServiceRole;
    const { id, data } = await req.json();
    const clean = { ...(data || {}) };
    for (const k of IMMUTABLE) delete clean[k];
    if (clean.destination_type === 'url' && !isSafePath(clean.destination_url)) {
      return Response.json({ error: 'Approved URL must be a same-site path like /explore' }, { status: 400 });
    }

    if (id) {
      const prev = await svc.entities.QrCampaign.get(id);
      const destChanged = (clean.destination_type && clean.destination_type !== prev.destination_type)
        || (clean.destination_id !== undefined && clean.destination_id !== prev.destination_id)
        || (clean.destination_url !== undefined && clean.destination_url !== prev.destination_url);
      if (destChanged) {
        clean.destination_history = [...(prev.destination_history || []), {
          changed_at: new Date().toISOString(), changed_by: user.id,
          from_type: prev.destination_type, from_id: prev.destination_id || prev.destination_url || '',
          to_type: clean.destination_type || prev.destination_type, to_id: clean.destination_id || clean.destination_url || '',
        }];
      }
      return Response.json({ campaign: await svc.entities.QrCampaign.update(id, clean) });
    }

    const market = String(clean.market || 'GEN').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 5) || 'GEN';
    const sameMarket = await svc.entities.QrCampaign.filter({ market });
    const maxSeq = sameMarket.reduce((m, c) => Math.max(m, parseInt(String(c.qr_id).split('-').pop(), 10) || 0), 0);
    const qr_id = `QR-${market}-${String(maxSeq + 1).padStart(6, '0')}`;

    let short_code = '';
    for (let i = 0; i < 10 && !short_code; i++) {
      const cand = randomCode();
      const taken = await svc.entities.QrCampaign.filter({ short_code: cand });
      if (!taken.length) short_code = cand;
    }
    if (!short_code) return Response.json({ error: 'Could not allocate a unique short code' }, { status: 500 });

    const campaign = await svc.entities.QrCampaign.create({
      ...clean, market, qr_id, short_code, short_url: `${SHORT_URL_BASE}/q/${short_code}`,
      status: clean.status || 'active', created_by: user.id,
    });
    return Response.json({ campaign });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}