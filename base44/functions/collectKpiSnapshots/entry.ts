import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import Stripe from 'npm:stripe@17.5.0';
import { requireAutomationCaller } from '../../shared/automationAuth.ts';

// Collects daily KPI snapshots (HHF internal, Stripe, Partnero) per geography scope.
// Read-only against operational data; writes only KpiSnapshot + KpiSourceSync.
const OWNER = 'jan.brown@happyhourflower.com';
const DAY = 86400000;

async function listAll(ent, query) {
  const out = [];
  for (let skip = 0; ; skip += 500) {
    const page = query ? await ent.filter(query, '-created_date', 500, skip) : await ent.list('-created_date', 500, skip);
    out.push(...page);
    if (page.length < 500) break;
  }
  return out;
}

const pct = (n, d) => (d > 0 ? Math.round((n / d) * 1000) / 10 : null);

function venueMetrics(vs, items, now) {
  const active = vs.filter((v) => v.status === 'active');
  const paid = active.filter((v) => v.subscription_tier && v.subscription_tier !== 'free');
  const fresh = active.filter((v) => v.has_happy_hour && v.last_scraped_at && now - new Date(v.last_scraped_at).getTime() <= 30 * DAY);
  const healths = active.map((v) => v.health_score).filter((h) => Number.isFinite(h));
  const ids = new Set(active.map((v) => v.id));
  return {
    venues_total: vs.length,
    venues_active: active.length,
    venues_paid: paid.length,
    venues_free: active.length - paid.length,
    venues_paid_pct: pct(paid.length, active.length),
    venues_verified: active.filter((v) => v.verification_status === 'verified').length,
    venues_contacts_verified: active.filter((v) => v.contacts_verified).length,
    venues_with_happy_hour: active.filter((v) => v.has_happy_hour).length,
    venues_fresh_pct: pct(fresh.length, active.length),
    venues_avg_health: healths.length ? Math.round(healths.reduce((a, b) => a + b, 0) / healths.length) : null,
    venues_new_30d: vs.filter((v) => now - new Date(v.created_date).getTime() <= 30 * DAY).length,
    specials_total: items.filter((i) => ids.has(i.venue_id)).length,
  };
}

function profileMetrics(ps, now) {
  const paid = ps.filter((p) => p.is_premium || (p.subscription_tier && p.subscription_tier !== 'free'));
  return {
    profiles_total: ps.length,
    consumers_paid: paid.length,
    consumers_free: ps.length - paid.length,
    paid_conversion_pct: pct(paid.length, ps.length),
    new_profiles_30d: ps.filter((p) => now - new Date(p.created_date).getTime() <= 30 * DAY).length,
  };
}

async function stripeMetrics() {
  const key = Deno.env.get('STRIPE_SECRET_KEY');
  if (!key) throw new Error('STRIPE_SECRET_KEY not set');
  const stripe = new Stripe(key, { apiVersion: '2024-12-18.acacia' });
  let venue = 0, consumer = 0, count = 0, venueSubs = 0, after;
  for (;;) {
    const page = await stripe.subscriptions.list({ status: 'active', limit: 100, ...(after ? { starting_after: after } : {}) });
    for (const sub of page.data) {
      count++;
      let m = 0;
      for (const it of sub.items.data) {
        const p = it.price; if (!p?.recurring) continue;
        const amt = (p.unit_amount || 0) * (it.quantity || 1), ic = p.recurring.interval_count || 1;
        const iv = p.recurring.interval;
        m += iv === 'year' ? amt / (12 * ic) : iv === 'week' ? (amt * 52) / 12 / ic : iv === 'day' ? (amt * 365) / 12 / ic : amt / ic;
      }
      if (sub.metadata?.venue_id) { venue += m; venueSubs++; } else consumer += m;
    }
    if (!page.has_more) break;
    after = page.data[page.data.length - 1].id;
  }
  const r = (c) => Math.round(c) / 100;
  return { mrr_total: r(venue + consumer), mrr_venue: r(venue), mrr_consumer: r(consumer), arr_total: r((venue + consumer) * 12),
    active_subscriptions: count, venue_subscriptions: venueSubs, consumer_subscriptions: count - venueSubs };
}

async function partneroMetrics() {
  const key = Deno.env.get('PARTNERO_API_KEY');
  if (!key) throw new Error('PARTNERO_API_KEY not set');
  const headers = { Authorization: `Bearer ${key}`, Accept: 'application/json' };
  const partners = [];
  for (let page = 1; page <= 20; page++) {
    const res = await fetch(`https://api.partnero.com/v1/partners?limit=100&page=${page}`, { headers });
    if (!res.ok) throw new Error(`Partnero ${res.status}`);
    const data = (await res.json()).data || [];
    partners.push(...data);
    if (data.length < 100) break;
  }
  const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
  const leaderboard = partners.map((p) => ({ name: [p.name, p.surname].filter(Boolean).join(' ') || p.email || p.id,
    referrals: num(p.referrals_count), clicks: num(p.clicks), earnings: num(p.earnings) }))
    .sort((a, b) => b.referrals - a.referrals).slice(0, 25);
  return {
    metrics: { ambassadors_total: partners.length, ambassador_referrals: leaderboard.reduce((a, b) => a + b.referrals, 0),
      ambassador_clicks: partners.reduce((a, p) => a + num(p.clicks), 0), ambassador_earnings: partners.reduce((a, p) => a + num(p.earnings), 0) },
    leaderboard,
  };
}

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const denied = await requireAutomationCaller(base44, req);
    if (denied) return denied;
    const sr = base44.asServiceRole;
    const now = Date.now();
    const nowIso = new Date(now).toISOString();
    const date = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(new Date(now));
    const sync = {};

    const [venues, items, profiles, users, markets, areas, states] = await Promise.all([
      listAll(sr.entities.Venue), listAll(sr.entities.HappyHourItem), listAll(sr.entities.Profile), listAll(sr.entities.User),
      listAll(sr.entities.LocationMarket), listAll(sr.entities.LocationArea), listAll(sr.entities.LocationState),
    ]);
    const since30 = new Date(now - 30 * DAY).toISOString();
    const [sessions, favorites, checkins, offers, attributions, qrScans] = await Promise.all([
      listAll(sr.entities.AppSession, { started_at: { $gte: since30 } }),
      listAll(sr.entities.Favorite, { created_date: { $gte: since30 } }),
      listAll(sr.entities.CheckIn, { created_date: { $gte: since30 } }),
      listAll(sr.entities.OfferStat), listAll(sr.entities.Attribution),
      listAll(sr.entities.QrScan, { created_date: { $gte: since30 } }),
    ]);
    sync.hhf_internal = { status: 'success', message: `${venues.length} venues, ${profiles.length} profiles, ${sessions.length} sessions (30d)` };

    const distinct = (ms) => new Set(sessions.filter((s) => now - new Date(s.started_at).getTime() <= ms).map((s) => s.user_id)).size;
    const dau = distinct(DAY), mau = distinct(30 * DAY);
    const durations = sessions.map((s) => s.duration_seconds).filter((d) => Number.isFinite(d) && d > 0);
    const globalExtra = {
      consumers_total: users.filter((u) => u.role !== 'admin' && u.role !== 'venue_owner').length,
      users_total: users.length,
      venue_owner_accounts: users.filter((u) => u.role === 'venue_owner').length,
      dau, wau: distinct(7 * DAY), mau, stickiness_pct: pct(dau, mau),
      sessions_30d: sessions.length,
      avg_session_minutes: durations.length ? Math.round((durations.reduce((a, b) => a + b, 0) / durations.length / 60) * 10) / 10 : null,
      favorites_30d: favorites.length, checkins_30d: checkins.length,
      offer_views: offers.reduce((a, o) => a + (o.view_count || 0), 0),
      offer_redeem_clicks: offers.reduce((a, o) => a + (o.redeem_click_count || 0), 0),
      attributions_total: attributions.length,
      attributed_signups: attributions.filter((a) => a.signup_qr_id).length,
      qr_scans_30d: qrScans.length,
      venues_unmapped: venues.filter((v) => !v.market_id).length,
    };

    let details = {};
    try { Object.assign(globalExtra, await stripeMetrics()); sync.stripe = { status: 'success', message: 'Active subscriptions collected' }; }
    catch (e) { sync.stripe = { status: 'failed', message: e.message }; }
    try { const p = await partneroMetrics(); Object.assign(globalExtra, p.metrics); details.leaderboard = p.leaderboard; sync.partnero = { status: 'success', message: `${p.metrics.ambassadors_total} partners` }; }
    catch (e) { sync.partnero = { status: 'failed', message: e.message }; }
    sync.meta = { status: 'not_connected', message: 'Meta Ads is not connected' };
    sync.website_analytics = { status: 'not_connected', message: 'Website analytics export is not connected' };

    const prefs = (p) => p.location_preferences || {};
    const build = (level, id, name, parent, vf, pf) => {
      const vs = venues.filter(vf), ps = profiles.filter(pf);
      return { snapshot_date: date, scope_level: level, scope_id: id, scope_name: name, parent_id: parent, collected_at: nowIso,
        metrics: { ...venueMetrics(vs, items, now), ...profileMetrics(ps, now) } };
    };
    const snaps = [build('all', 'all', 'All HHF', '', () => true, () => true)];
    Object.assign(snaps[0].metrics, globalExtra);
    snaps[0].details = details;
    for (const s of states) snaps.push(build('state', s.code, s.name, 'all', (v) => v.state_code === s.code, (p) => prefs(p).state_code === s.code));
    for (const m of markets) snaps.push(build('market', m.market_id, m.market_name, m.state_code, (v) => v.market_id === m.market_id, (p) => prefs(p).market_id === m.market_id));
    for (const a of areas) snaps.push(build('area', a.area_id, a.area_name, a.market_id, (v) => v.area === a.area_id, (p) => prefs(p).area === a.area_id));

    await sr.entities.KpiSnapshot.deleteMany({ snapshot_date: date });
    for (let i = 0; i < snaps.length; i += 200) await sr.entities.KpiSnapshot.bulkCreate(snaps.slice(i, i + 200));

    const existing = await sr.entities.KpiSourceSync.list();
    for (const [source, s] of Object.entries(sync)) {
      const row = existing.find((r) => r.source === source);
      const data = { source, status: s.status, message: s.message, last_run_at: nowIso, ...(s.status === 'success' ? { last_success_at: nowIso } : {}) };
      if (row) await sr.entities.KpiSourceSync.update(row.id, data); else await sr.entities.KpiSourceSync.create(data);
    }
    return Response.json({ success: true, snapshot_date: date, scopes: snaps.length, sync });
  } catch (error) {
    console.error('collectKpiSnapshots', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}