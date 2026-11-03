import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

async function listAll(entity, sort) {
  const out = [];
  for (let skip = 0; skip < 50000; skip += 500) {
    const page = await entity.list(sort, 500, skip);
    out.push(...page);
    if (page.length < 500) break;
  }
  return out;
}

// Admin-only aggregation of scans + attributed conversions per QR campaign.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });
    const svc = base44.asServiceRole;
    const [campaigns, scans, attrs] = await Promise.all([
      listAll(svc.entities.QrCampaign, '-created_date'),
      listAll(svc.entities.QrScan, '-scanned_at'),
      listAll(svc.entities.Attribution, '-created_date'),
    ]);
    const now = Date.now();
    const per = {};
    const blank = () => ({ scans: 0, sessions: new Set(), users: new Set(), anonymous: 0, signups: 0, venue_views: 0, special_views: 0, directions: 0, arrivals: 0, premium: 0 });
    for (const c of campaigns) per[c.qr_id] = blank();
    let last7 = 0, last30 = 0;
    for (const s of scans) {
      const p = per[s.qr_id] || (per[s.qr_id] = blank());
      if (s.is_rapid_repeat) continue;
      p.scans++;
      if (s.session_id) p.sessions.add(s.session_id);
      if (s.hhf_user_id) p.users.add(s.hhf_user_id); else p.anonymous++;
      const age = now - new Date(s.scanned_at).getTime();
      if (age <= 7 * 864e5) last7++;
      if (age <= 30 * 864e5) last30++;
    }
    const bump = (qr, k) => { if (qr && per[qr]) per[qr][k]++; };
    for (const a of attrs) {
      bump(a.signup_qr_id, 'signups'); bump(a.venue_viewed_qr_id, 'venue_views');
      bump(a.special_viewed_qr_id, 'special_views'); bump(a.directions_qr_id, 'directions');
      bump(a.arrival_qr_id, 'arrivals'); bump(a.premium_qr_id, 'premium');
    }
    const byQr = {};
    const totals = { scans: 0, signups: 0, arrivals: 0, premium: 0 };
    for (const [qr, p] of Object.entries(per)) {
      byQr[qr] = { ...p, sessions: p.sessions.size, users: p.users.size };
      totals.scans += p.scans; totals.signups += p.signups; totals.arrivals += p.arrivals; totals.premium += p.premium;
    }
    return Response.json({
      byQr,
      summary: { active: campaigns.filter(c => c.status === 'active').length, total_scans: totals.scans, last7, last30, signups: totals.signups, arrivals: totals.arrivals, premium: totals.premium },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}