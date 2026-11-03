// Phase 2.5 unattended runner: each call advances the current EnrichmentBatch for ~100s,
// finalizes it with the integrity check when full, and halts on safety/infrastructure stops.
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { secrets } from 'base44:runtime';
import { requireAutomationCaller } from '../../shared/automationAuth.ts';

const BUDGET_MS = 100000;
const LOCK_MS = 4 * 60 * 1000;
const FIELDS = ['name', 'status', 'owner_id', 'address', 'city', 'state_code', 'zip_code', 'phone', 'website', 'description', 'category', 'facebook_url', 'instagram_url', 'tiktok_url', 'x_url', 'youtube_url', 'threads_url', 'days', 'happy_hour_start', 'happy_hour_end', 'deals', 'deals_by_day'];
const PLACEHOLDER = /^(null|n\/?a|none|unknown|undefined)$/i;
const isEmpty = (v) => v == null || v === '' || (Array.isArray(v) && !v.length);
const num = (s) => (String(s || '').match(/\d+/) || [''])[0];

async function finalize(db, b) {
  const viol = [];
  let changes = 0, amenLost = 0, dup = 0;
  for (const before of b.snapshot.venues) {
    const now = await db.Venue.get(before.id);
    const ownerProt = before.owner_id || before.verification_status === 'verified';
    for (const f of FIELDS) {
      if (JSON.stringify(before[f] ?? null) === JSON.stringify(now[f] ?? null)) continue;
      changes++;
      const empty = isEmpty(before[f]);
      if (f === 'status' && now.status === 'inactive' && now.field_provenance?.activity_status === 'CONFIRMED_CLOSED') continue;
      if (isEmpty(now[f])) viol.push([before.name, f, 'cleared']);
      else if (typeof now[f] === 'string' && PLACEHOLDER.test(now[f])) viol.push([before.name, f, 'placeholder']);
      else if ((f === 'deals' || f === 'days') && Array.isArray(before[f]) && before[f].some((d) => !now[f].includes(d))) viol.push([before.name, f, `${f === 'deals' ? 'deal' : 'day'} removed`]);
      else if (!empty && f === 'address' && now.field_provenance?.address === 'google_places' && num(before.address) && num(before.address) === num(now.address)) { /* Google reformat, same street number */ }
      else if (!empty && f !== 'deals' && f !== 'days') viol.push([before.name, f, 'overwrote existing']);
      if (ownerProt && !empty) viol.push([before.name, f, 'owner-protected change']);
    }
    const am = await db.VenueAmenity.filter({ venue_id: before.id });
    const slugs = new Set(am.map((a) => a.amenity_slug));
    const cnt = {};
    am.forEach((a) => { cnt[a.amenity_slug] = (cnt[a.amenity_slug] || 0) + 1; });
    dup += Object.values(cnt).filter((v) => v > 1).length;
    for (const a of b.snapshot.amenities.filter((x) => x.venue_id === before.id)) {
      if (!slugs.has(a.amenity_slug)) { amenLost++; viol.push([before.name, `amenity:${a.amenity_slug}`, 'removed']); }
    }
  }
  if (dup) viol.push(['*', 'amenities', `${dup} duplicate slugs`]);
  // Violations no longer halt the run: each one is queued for admin review and the runner moves on.
  const byName = Object.fromEntries(b.snapshot.venues.map((v) => [v.name, v]));
  const now = new Date().toISOString();
  const rows = viol.map(([name, field, why]) => {
    const v = byName[name] || {};
    return {
      venue_id: v.id || '*', venue_name: name, field, current_value: JSON.stringify(v[field] ?? null).slice(0, 500),
      reason: `Batch ${b.batch_number} integrity check: ${why}`, origin_function: 'integrity_check', detected_at: now, status: 'pending',
    };
  });
  if (rows.length) await db.EnrichmentDiscrepancy.bulkCreate(rows);
  const review = viol.length || (b.results || []).some((r) => r.disc > 0 || (r.hh || []).length);
  const status = review ? 'COMPLETED_WITH_REVIEW_ITEMS' : 'COMPLETED';
  await db.EnrichmentBatch.update(b.id, {
    batch_status: status, completion_time: new Date().toISOString(),
    integrity_result: viol.length ? `FAIL: ${JSON.stringify(viol).slice(0, 1500)}` : 'PASS',
    metrics: { ...(b.metrics || {}), lock_until: null, field_changes: changes, violations: viol.length, amenities_lost: amenLost, duplicate_slugs: dup },
  });
  return { finalized: b.batch_number, status, violations: viol.length };
}

function slim(r) {
  return {
    venue_id: r.venue_id, venue_name: r.venue_name, activity: r.activity?.status, identity: r.identity?.status,
    structure: r.location_structure, places_matched: r.places?.matched ?? r.places_matched, updates: r.updates_written,
    fields_updated: r.fields_updated, amen_added: r.amenities_saved, auto_saved: (r.auto_saved || []).map((a) => a.slug),
    places_amen: r.places_amenities, proposals: r.proposals_queued, disc: r.discrepancies_recorded,
    hh: (r.happy_hour_gate || []).map((e) => `${e.action}:${e.reason}`), amen_reasons: (r.amenity_gate || []).map((e) => e.reason),
    field_gate: (r.field_gate || []).map((e) => `${e.field}:${e.decision}:${e.reason}`),
    web: r.website_research && { s: r.website_research.status, p: r.website_research.pages, q: r.website_research.requests, ms: r.website_research.duration_ms, err: (r.website_research.errors || []).length },
    error: r.error ? String(r.error).slice(0, 300) : undefined, set_inactive: r.set_inactive,
  };
}

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const denied = await requireAutomationCaller(base44, req);
    if (denied) return denied;
    const db = base44.asServiceRole.entities;
    const t0 = Date.now();

    const all = await db.EnrichmentBatch.filter({ phase_id: '2.5' }, 'batch_number', 100);
    let b = all.find((x) => ['RUNNING', 'QUEUED', 'STOPPED_BY_SAFETY_RULE', 'PAUSED_INFRASTRUCTURE'].includes(x.batch_status));
    if (!b) return Response.json({ done: true });
    if (b.batch_status === 'STOPPED_BY_SAFETY_RULE' || b.batch_status === 'PAUSED_INFRASTRUCTURE') {
      return Response.json({ halted: b.batch_number, status: b.batch_status, why: b.stop_reason || b.integrity_result });
    }
    // Prevent overlapping scheduled runs from processing the same venues twice.
    const lock = b.metrics?.lock_until;
    if (lock && Date.parse(lock) > Date.now()) return Response.json({ locked: b.batch_number });
    const metrics = { ...(b.metrics || {}), lock_until: new Date(Date.now() + LOCK_MS).toISOString() };

    if (b.batch_status === 'QUEUED') {
      const snap = { venues: [], amenities: [] };
      for (const id of b.venue_ids) {
        snap.venues.push(await db.Venue.get(id));
        snap.amenities.push(...(await db.VenueAmenity.filter({ venue_id: id })).map((a) => ({ id: a.id, venue_id: a.venue_id, amenity_slug: a.amenity_slug, source: a.source, provenance: a.provenance })));
      }
      b = await db.EnrichmentBatch.update(b.id, { batch_status: 'RUNNING', start_time: new Date().toISOString(), snapshot: snap, metrics });
    } else {
      b = await db.EnrichmentBatch.update(b.id, { metrics });
    }

    const handled = new Set([...(b.completed_venue_ids || []), ...(b.failed_venue_ids || []), ...(b.skipped_venue_ids || [])]);
    let pending = b.venue_ids.filter((id) => !handled.has(id));
    if (!pending.length) return Response.json(await finalize(db, b));

    const res = [...(b.results || [])];
    const C = [...(b.completed_venue_ids || [])], F = [...(b.failed_venue_ids || [])], S = [...(b.skipped_venue_ids || [])];
    const key = secrets.get('HHF_WEBHOOK_KEY');
    let infra = 0;
    while (pending.length && Date.now() - t0 < BUDGET_MS) {
      const pair = pending.slice(0, 2);
      pending = pending.slice(2);
      const out = await Promise.all(pair.map((id) => base44.asServiceRole.functions.invoke('enrichAllVenuesFull', { phase: '2.5', force: true, venue_ids: [id], batch_size: 1, internal_key: key })
        .then((r) => r.data?.results?.[0] || { venue_id: id, error: r.data?.error || 'no result' })
        .catch((e) => ({ venue_id: id, error: e.message }))));
      for (const r of out) {
        res.push(slim(r));
        if (r.error) { F.push(r.venue_id); if (/429|rate|quota/i.test(r.error)) infra++; }
        else if (r.skipped) S.push(r.venue_id);
        else C.push(r.venue_id);
        if ((r.website_research?.errors || []).some((e) => /HTTP_429/.test(e))) infra++;
      }
      await db.EnrichmentBatch.update(b.id, { results: res, completed_venue_ids: C, failed_venue_ids: F, skipped_venue_ids: S });
      if (infra >= 2) {
        await db.EnrichmentBatch.update(b.id, { batch_status: 'PAUSED_INFRASTRUCTURE', stop_reason: 'repeated 429/quota', metrics: { ...metrics, lock_until: null } });
        return Response.json({ paused: b.batch_number });
      }
    }
    await db.EnrichmentBatch.update(b.id, { metrics: { ...metrics, lock_until: null } });
    return Response.json({ batch: b.batch_number, remaining: pending.length, completed: C.length, failed: F.length, skipped: S.length, ms: Date.now() - t0 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}