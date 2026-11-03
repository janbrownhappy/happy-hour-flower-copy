import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { secrets } from 'base44:runtime';
import { requireAutomationCaller } from '../../shared/automationAuth.ts';
import { researchVenueUrl } from '../../shared/researchVenueUrl.ts';
import { createResend } from '../../shared/resendClient.ts';
import { queueVenueForInstagram, INSTAGRAM_POSTER_EMAIL } from '../../shared/instagramVenuePost.ts';

const CONCURRENCY = 8;      // URLs processed per run (each takes ~1-2 min)
const STALE_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 2;

// Directory, listing, job and government sites — never a venue's own website.
const BLOCKED = /(^|\.)(ziprecruiter|zoominfo|zumper|yellowpages|yellow-pages|cybo|yelp|tripadvisor|walmart|waterwayguide|votedthestatesbest|indeed|glassdoor|mapquest|manta|bbb|apartments|opentable|doordash|ubereats|grubhub|menupix|allmenus|restaurantji|foursquare)\.|\.gov$|countyof|county\.org$|greenvillecounty\.org$/i;

const isEmpty = (x) => x == null || x === '' || x === 'null' || (Array.isArray(x) && !x.length);

async function processJob(base44, job, internalKey) {
  const Job = base44.asServiceRole.entities.WebsiteImportJob;
  const Venue = base44.asServiceRole.entities.Venue;
  const finish = (patch) => Job.update(job.id, { ...patch, finished_at: new Date().toISOString() });

  let draft, duplicates;
  if (job.prefill?.name) {
    // Sheet row: use the sheet's data; drop directory sites so enrichment finds the real one.
    draft = { ...job.prefill };
    try { if (draft.website && BLOCKED.test(new URL(draft.website).hostname)) delete draft.website; } catch { delete draft.website; }
    const prior = await Job.filter({ source_key: job.source_key || '__none', status: { $in: ['done', 'partial'] }, id: { $ne: job.id } }, { limit: 1 });
    if (prior.items.length) return finish({ status: 'skipped', venue_id: prior.items[0].venue_id, venue_name: prior.items[0].venue_name, note: 'Skipped: already processed in an earlier import' });
    const byKey = draft.venue_key ? (await Venue.filter({ venue_key: draft.venue_key }, { limit: 1 })).items : [];
    const byName = byKey.length ? [] : (await Venue.filter({ name: { $regex: `^${draft.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' }, city: draft.city }, { limit: 1 })).items;
    duplicates = [...byKey, ...byName];
  } else {
    let host = '';
    try { host = new URL(job.url).hostname.toLowerCase(); } catch { return finish({ status: 'skipped', note: 'Not a valid URL' }); }
    if (BLOCKED.test(host)) return finish({ status: 'skipped', note: `Skipped: ${host} is a directory/listing site, not a venue website` });

    // Skip URLs an earlier import already processed successfully.
    const prior = await Job.filter({ url: job.url, status: { $in: ['done', 'partial'] }, id: { $ne: job.id } }, { limit: 1 });
    if (prior.items.length) return finish({ status: 'skipped', venue_id: prior.items[0].venue_id, venue_name: prior.items[0].venue_name, note: 'Skipped: already processed in an earlier import' });

    ({ draft, duplicates } = await researchVenueUrl(base44, job.url));
    if (!draft?.name) return finish({ status: 'failed', note: 'No venue found on this website' });
  }

  // Save: fill only missing fields on a match, otherwise create a draft venue.
  const clean = Object.fromEntries(Object.entries(draft).filter(([, v]) => !isEmpty(v)));
  const dupId = duplicates?.[0]?.id;
  let v;
  if (dupId) {
    const existing = await Venue.get(dupId);
    const missing = Object.fromEntries(Object.entries(clean).filter(([k]) => isEmpty(existing[k])));
    if (Object.keys(missing).length) await Venue.update(dupId, missing);
    v = { ...existing, ...missing, id: dupId, updatedExisting: true };
  } else {
    v = await Venue.create({ ...clean, status: 'draft', source_url: draft.source_url || draft.website, scrape_status: 'needs_review' });
  }
  const base = { venue_id: v.id, venue_name: v.name, updated_existing: !!v.updatedExisting };

  // Enrich: fill fields still empty and save cited amenities.
  const res = await base44.asServiceRole.functions.invoke('enrichVenueProfile', { venue_id: v.id, internal_key: internalKey, lite_places: false })
    .then((r) => r.data).catch((e) => ({ error: e?.response?.data?.error || e.message }));
  if (res?.error) return finish({ ...base, status: 'partial', note: `Enrichment failed: ${res.error}` });

  const updates = {};
  for (const [key, f] of Object.entries(res.suggestions?.fields || {})) {
    if (isEmpty(v[key]) && !isEmpty(f?.value) && !res.protection?.[key]) updates[key] = f.value;
  }
  const amenities = res.amenities || [];
  if (Object.keys(updates).length || amenities.length) {
    await base44.asServiceRole.functions.invoke('enrichVenueProfile', {
      action: 'save', venue_id: v.id, updates, amenities, places_verified: res.places_verified, internal_key: internalKey,
    });
  }
  if (job.publish && !v.updatedExisting && v.status !== 'active') {
    await Venue.update(v.id, { status: 'active' });
    // Queue for Instagram review only for imports started by the account owner.
    const owner = await base44.asServiceRole.entities.User.filter({ email: INSTAGRAM_POSTER_EMAIL }).catch(() => []);
    if (owner?.[0]?.id && job.created_by_id === owner[0].id) await queueVenueForInstagram(base44.asServiceRole, v.id);
  }
  return finish({ ...base, status: 'done', note: '', fields_filled: Object.keys(updates).length, amenities_added: amenities.length });
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const internalKey = secrets.get('HHF_WEBHOOK_KEY') || '';
    const denied = await requireAutomationCaller(base44, req);
    if (denied) return denied;
    const Job = base44.asServiceRole.entities.WebsiteImportJob;

    // Recover jobs stuck in "working" (a run that was cut off).
    const stale = await Job.filter({ status: 'working', started_at: { $lt: new Date(Date.now() - STALE_MS).toISOString() } }, { limit: 20 });
    for (const j of stale.items) {
      await Job.update(j.id, (j.attempts || 0) >= MAX_ATTEMPTS
        ? { status: 'failed', note: 'Timed out', finished_at: new Date().toISOString() }
        : { status: 'queued' });
    }

    const page = await Job.filter({ status: 'queued' }, { sort: 'created_date', limit: body.limit || CONCURRENCY });
    const jobs = page.items;
    const now = new Date().toISOString();
    await Promise.all(jobs.map((j) => Job.update(j.id, { status: 'working', started_at: now, attempts: (j.attempts || 0) + 1 })));

    const results = await Promise.allSettled(jobs.map((j) => processJob(base44, j, internalKey)));
    await Promise.all(results.map((r, i) => r.status === 'rejected'
      ? Job.update(jobs[i].id, { status: 'failed', note: String(r.reason?.message || r.reason).slice(0, 300), finished_at: new Date().toISOString() })
      : null));

    // Email the admin a summary when a batch finishes.
    const to = secrets.get('ADMIN_EMAIL');
    for (const label of [...new Set(jobs.map((j) => j.batch_label).filter(Boolean))]) {
      if (!to || await Job.count({ batch_label: label, status: { $in: ['queued', 'working'] } })) continue;
      const { rows } = await Job.aggregate({ query: { batch_label: label }, groupBy: 'status' });
      const lines = rows.map((r) => `${r.status}: ${r.count}`).join('<br>');
      await createResend(Deno.env.get('RESEND_API_KEY')).emails.send({
        to, subject: `Venue import complete: ${label}`,
        html: `<p>The import batch <b>${label}</b> has finished.</p><p>${lines}</p><p><a href="https://happyhourflower.com/admin">Review in Admin</a></p>`,
      }).catch(() => null);
    }

    const remaining = await Job.count({ status: 'queued' });
    return Response.json({ processed: jobs.length, recovered: stale.items.length, remaining });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}