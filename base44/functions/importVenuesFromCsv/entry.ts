import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import {
  parseCsv, val, normName, slugify, buildVenuePayload,
  mapVenueTypeSlugs, mapCuisineSlugs, mapAmenitySlugs,
} from '../../shared/venueCsvImport.ts';
import { classifyDeal } from '../../shared/filterCatalogSeed.ts';
import { secrets } from 'base44:runtime';

// Admin-only. Upserts venues from an enriched prospect CSV.
// The CSV is authoritative: matching venues are updated, new ones created.
// Everything lands on the free tier. Batched via offset/limit.
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// The entity API rate-limits bursts; back off and retry instead of losing a row.
async function withRetry(fn, attempts = 5) {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (!/rate limit/i.test(err.message || '')) throw err;
      await sleep(1200 * (i + 1));
    }
  }
  throw lastErr;
}

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const adminEmail = secrets.get('ADMIN_EMAIL');
    const isAdmin = user.role === 'admin' || (adminEmail && user.email === adminEmail);
    if (!isAdmin) return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const csvUrl = body.csv_url;
    if (!csvUrl) return Response.json({ error: 'csv_url is required' }, { status: 400 });
    const offset = Math.max(0, Number(body.offset) || 0);
    const limit = Math.min(40, Math.max(1, Number(body.limit) || 25));
    const dryRun = body.dry_run === true;

    const svc = base44.asServiceRole;

    const res = await fetch(csvUrl);
    if (!res.ok) return Response.json({ error: `Could not fetch CSV (${res.status})` }, { status: 400 });
    const rows = parseCsv(await res.text()).filter((r) => val(r.Company));

    const batch = rows.slice(offset, offset + limit);
    if (!batch.length) {
      return Response.json({ success: true, total: rows.length, processed: offset, done: true, results: [] });
    }

    const [types, cuisines, existingVenues] = await Promise.all([
      svc.entities.VenueType.list('', 500),
      svc.entities.Cuisine.list('', 500),
      svc.entities.Venue.list('created_date', 3000),
    ]);
    const typeIdBySlug = Object.fromEntries(types.map((t) => [t.slug, t.id]));
    const cuisineIdBySlug = Object.fromEntries(cuisines.map((c) => [c.slug, c.id]));

    const byNameZip = {};
    const byNameCity = {};
    const usedSlugs = new Set();
    for (const v of existingVenues) {
      const n = normName(v.name);
      if (v.zip_code) byNameZip[`${n}|${String(v.zip_code).trim()}`] = v;
      if (v.city) byNameCity[`${n}|${normName(v.city)}`] = v;
      if (v.slug) usedSlugs.add(v.slug);
    }

    const results = [];
    for (const row of batch) {
      const name = val(row.Company);
      try {
        const payload = buildVenuePayload(row);
        const n = normName(name);
        const zip = val(row.Zip);
        const city = normName(val(row.City));
        const existing = (zip && byNameZip[`${n}|${zip}`]) || (city && byNameCity[`${n}|${city}`]) || null;

        const typeMap = mapVenueTypeSlugs(row.venue_types);
        const cuisineMap = mapCuisineSlugs(row.cuisines);
        const amenityMap = mapAmenitySlugs(row.amenities);

        const venueTypeIds = typeMap.slugs.map((s) => typeIdBySlug[s]).filter(Boolean);
        const cuisineIds = cuisineMap.slugs.map((s) => cuisineIdBySlug[s]).filter(Boolean);
        if (venueTypeIds.length) payload.venue_type_ids = venueTypeIds;
        if (cuisineIds.length) payload.cuisine_ids = cuisineIds;

        if (dryRun) {
          results.push({
            name, action: existing ? 'would_update' : 'would_create',
            venue_types: typeMap.slugs, unmapped_types: typeMap.unmapped,
            cuisines: cuisineMap.slugs, amenities: amenityMap.slugs.length,
            dropped_amenities: amenityMap.dropped, days: payload.days || [],
          });
          continue;
        }

        let venueId;
        if (existing) {
          await withRetry(() => svc.entities.Venue.update(existing.id, payload));
          venueId = existing.id;
        } else {
          let slug = slugify(name) || `venue-${Date.now()}`;
          let candidate = slug;
          let i = 2;
          while (usedSlugs.has(candidate)) { candidate = `${slug}-${i}`; i++; }
          usedSlugs.add(candidate);
          const created = await withRetry(() => svc.entities.Venue.create({ ...payload, slug: candidate }));
          venueId = created.id;
          byNameZip[`${n}|${zip}`] = created;
        }

        // Amenities — CSV is authoritative, so replace the imported set.
        await withRetry(() => svc.entities.VenueAmenity.deleteMany({ venue_id: venueId, source: 'csv_import' }));
        if (amenityMap.slugs.length) {
          const amenityRows = amenityMap.slugs.map((s) => ({
            venue_id: venueId,
            amenity_slug: s,
            source: 'csv_import',
            verified_at: val(row.last_verified) || undefined,
          }));
          await withRetry(() => svc.entities.VenueAmenity.bulkCreate(amenityRows));
        }

        // Structured happy hour items for the v3 deal filters.
        await withRetry(() => svc.entities.HappyHourItem.deleteMany({ venue_id: venueId, source: 'csv_import' }));
        const itemRows = [];
        Object.entries(payload.deals_by_day || {}).forEach(([day, dayDeals]) => {
          (dayDeals || []).forEach((d) => {
            itemRows.push({ venue_id: venueId, ...classifyDeal(d, day), source: 'csv_import' });
          });
        });
        if (itemRows.length) await withRetry(() => svc.entities.HappyHourItem.bulkCreate(itemRows));

        results.push({
          name,
          action: existing ? 'updated' : 'created',
          days: payload.days || [],
          deals: itemRows.length,
          amenities: amenityMap.slugs.length,
          unmapped_types: typeMap.unmapped,
          status: payload.status || 'active',
        });
      } catch (err) {
        results.push({ name, error: err.message });
      }
    }

    const processed = offset + batch.length;
    return Response.json({
      success: true,
      total: rows.length,
      processed,
      next_offset: processed,
      done: processed >= rows.length,
      created: results.filter((r) => r.action === 'created').length,
      updated: results.filter((r) => r.action === 'updated').length,
      errors: results.filter((r) => r.error),
      results,
    });
  } catch (error) {
    console.error('importVenuesFromCsv failed', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}