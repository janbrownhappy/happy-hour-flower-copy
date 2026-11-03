import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { hasInternalKey } from '../../shared/automationAuth.ts';
import { VENUE_PHOTO_PLACEHOLDER } from '../../shared/venuePhotoPlaceholder.ts';
import {
  SOURCES, PROTECTED_SOURCES, isClaimed, photoPairs, applyProtectedUpdates, recordDiscrepancies,
} from '../../shared/enrichmentProtection.ts';
import { scrapflyPhotoCandidates } from '../../shared/scrapflyPhotos.ts';

const MAX_PHOTOS = 3;
const MAX_MATCH_METERS = 300;

function distMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000, toRad = (d) => d * Math.PI / 180;
  const a = Math.sin(toRad(lat2 - lat1) / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(toRad(lng2 - lng1) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

const hasCoords = (v) => Number.isFinite(v.lat) && Number.isFinite(v.lng) && (v.lat !== 0 || v.lng !== 0);

async function uploadImage(base44, url, name) {
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 HappyHourFlower/1.0' }, redirect: 'follow' });
  if (!res.ok) return null;
  const type = res.headers.get('content-type') || 'image/jpeg';
  if (!type.startsWith('image/')) return null;
  const bytes = new Uint8Array(await res.arrayBuffer());
  if (bytes.length < 5000) return null; // skip tiny icons/logos
  const ext = type.includes('png') ? 'png' : type.includes('webp') ? 'webp' : 'jpg';
  const up = await base44.asServiceRole.integrations.Core.UploadPublicFile({ file: new File([bytes], `${name}.${ext}`, { type }) });
  return up?.file_url || null;
}

// Google: text search with city/state + location bias; accept only a nearby match that has photos.
async function findGooglePlace(venue, apiKey) {
  const query = [venue.name, venue.address, venue.city, venue.state_code || 'SC'].filter(Boolean).join(' ');
  let url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${apiKey}`;
  if (hasCoords(venue)) url += `&location=${venue.lat},${venue.lng}&radius=500`;
  const data = await (await fetch(url)).json();
  const results = data.results || [];
  if (!results.length) return { reason: 'not_found_on_google' };
  const near = hasCoords(venue)
    ? results.filter((r) => distMeters(venue.lat, venue.lng, r.geometry.location.lat, r.geometry.location.lng) <= MAX_MATCH_METERS)
    : results.slice(0, 1);
  if (!near.length) return { reason: 'google_match_too_far' };
  const withPhotos = near.find((r) => r.photos?.length);
  if (!withPhotos) return { reason: 'no_photos_on_google', place: near[0] };
  return { place: withPhotos };
}

// Google candidates (landscape first — fewer menus/logos). Download happens later in rank order.
async function googleCandidates(venue, apiKey, place) {
  const det = await (await fetch(`https://maps.googleapis.com/maps/api/place/details/json?place_id=${place.place_id}&fields=photos&key=${apiKey}`)).json();
  const photos = det.result?.photos || place.photos || [];
  return photos.slice(0, 6).map((p, i) => ({
    url: `https://maps.googleapis.com/maps/api/place/photo?maxwidth=1200&photoreference=${p.photo_reference}&key=${apiKey}`,
    score: 6 + (p.width >= p.height ? 1 : 0) - i * 0.1,
    source: 'google',
  }));
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    // Enrichment routines call in without a user, authenticated by the internal key.
    const internal = hasInternalKey(body);
    const user = internal ? null : await base44.auth.me().catch(() => null);
    const email = (user?.email || '').toLowerCase();
    const isAdmin = internal || (user && (user.role === 'admin' || email === 'jan.brown@happyhourflower.com' || email === (Deno.env.get('ADMIN_EMAIL') || '').toLowerCase()));
    if (!isAdmin) return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });

    const { venueId, retry = true, assignPlaceholder = false } = body;
    if (!venueId) return Response.json({ error: 'venueId is required' }, { status: 400 });
    const venue = await base44.asServiceRole.entities.Venue.get(venueId);
    if (!venue) return Response.json({ error: 'Venue not found' }, { status: 404 });

    const apiKey = Deno.env.get('GOOGLE_PLACES_API_KEY');
    if (!apiKey) throw new Error('GOOGLE_PLACES_API_KEY not configured');

    // Photos already returned by the enrichment's Places match: no second Google lookup.
    const known = Array.isArray(body.google_photos) ? body.google_photos : null;
    let found = known ? (known.length ? {} : { reason: 'no_photos_on_google' }) : await findGooglePlace(venue, apiKey).catch(() => ({ reason: 'google_error' }));
    // Empty/errored Google responses during bulk runs are usually throttling — back off and retry once.
    if (!known && retry && (found.reason === 'not_found_on_google' || found.reason === 'google_error')) {
      await sleep(4000);
      found = await findGooglePlace(venue, apiKey).catch(() => ({ reason: 'google_error' }));
    }
    // Fill in missing coordinates from the matched place so maps/near-me work too —
    // through the shared protection policy (claimed/owner/admin coordinates are kept).
    const p = found.place;
    const coordPlan = p && !hasCoords(venue)
      ? applyProtectedUpdates(venue, { lat: p.geometry.location.lat, lng: p.geometry.location.lng }, SOURCES.GOOGLE_PLACES)
      : { updates: {}, applied: [], protected: [] };
    const patch = { ...coordPlan.updates };
    await recordDiscrepancies(base44, venue, coordPlan.protected, 'fetchVenuePhoto');
    // Existing photos with their provenance; the placeholder is never kept.
    const existing = photoPairs(venue).filter((x) => x.url !== VENUE_PHOTO_PLACEHOLDER);
    const toFields = (pairs) => ({ photo_urls: pairs.map((x) => x.url), photo_provenance: pairs.map((x) => x.source) });

    // Gather candidates from every source in parallel, then rank them together.
    const [g, scraped] = await Promise.all([
      found.reason ? Promise.resolve([])
        : known ? Promise.resolve(known.map((ph, i) => ({
          url: `https://places.googleapis.com/v1/${ph.name}/media?maxWidthPx=1200&key=${apiKey}`,
          score: 6 + (ph.width >= ph.height ? 1 : 0) - i * 0.1,
          source: 'google',
        })))
        : googleCandidates(venue, apiKey, p).catch(() => []),
      scrapflyPhotoCandidates(venue),
    ]);
    const diagnostics = { google: found.reason ? found.reason.replace(/_/g, ' ') : `${g.length} candidates`, ...scraped.diagnostics };
    const seen = new Set();
    const ranked = [...g, ...scraped.candidates]
      .filter((c) => { const k = c.url.split('?')[0]; if (seen.has(k)) return false; seen.add(k); return true; })
      .sort((a, b) => b.score - a.score);

    // Download in rank order until we have the top three usable images; keep source mix.
    const picked = [];
    for (const c of ranked.slice(0, 15)) {
      if (picked.length >= MAX_PHOTOS) break;
      const u = await uploadImage(base44, c.url, `venue-${venue.id}-${Date.now()}-${picked.length}`).catch(() => null);
      if (u) picked.push({ url: u, source: c.source });
    }
    const urls = picked.map((x) => x.url);
    const source = [...new Set(picked.map((x) => x.source))].join(', ');
    console.log('fetchVenuePhoto', venue.name, JSON.stringify({ diagnostics, ranked: ranked.length, picked: picked.map((x) => x.source) }));

    if (!urls.length) {
      const reason = Object.entries(diagnostics).map(([k, v]) => `${k}: ${v}`).join('; ') + (ranked.length ? `; ${ranked.length} candidates failed to download` : '');
      if (assignPlaceholder) {
        Object.assign(patch, { ...toFields(existing), photo_needs_manual: true, photo_fetch_reason: reason });
        await base44.asServiceRole.entities.Venue.update(venueId, patch);
        return Response.json({ success: false, placeholder: true, reason, error: reason });
      }
      if (Object.keys(patch).length) await base44.asServiceRole.entities.Venue.update(venueId, patch);
      return Response.json({ success: false, reason, error: reason });
    }

    const srcOf = (s) => (s === 'google' ? SOURCES.GOOGLE_PLACES : SOURCES.OTHER);
    const photoSource = srcOf(picked[0].source);
    // Claimed venue: automated photos are suggestions only — keep the candidate for review.
    if (isClaimed(venue)) {
      await recordDiscrepancies(base44, venue, [{
        field: 'photo_urls', existing_value: existing[0]?.url || null, existing_source: existing[0]?.source || '',
        proposed_value: urls[0], proposed_source: photoSource, evidence: `Auto-fetched from ${source}`,
        source_url: urls[0], reason: 'Claimed venue — candidate photo saved for review',
      }], 'fetchVenuePhoto');
      if (Object.keys(patch).length) await base44.asServiceRole.entities.Venue.update(venueId, patch);
      return Response.json({ success: false, protected: true, reason: 'claimed venue — candidate photo saved for review', error: 'Claimed venue — candidate photo saved for review' });
    }
    const fresh = picked.map((x) => ({ url: x.url, source: srcOf(x.source) }));
    // Never displace an owner/admin photo from the primary slot: append instead of prepend.
    const hasManualPhoto = existing.some((x) => PROTECTED_SOURCES.has(x.source));
    Object.assign(patch, toFields(hasManualPhoto ? [...existing, ...fresh] : [...fresh, ...existing]));
    patch.photo_needs_manual = false;
    patch.photo_fetch_reason = '';
    await base44.asServiceRole.entities.Venue.update(venueId, patch);
    return Response.json({ success: true, source, added: urls.length, photoUrl: urls[0], diagnostics });
  } catch (error) {
    console.error('fetchVenuePhoto error:', error.message);
    return Response.json({ success: false, reason: 'error', error: error.message }, { status: 500 });
  }
}