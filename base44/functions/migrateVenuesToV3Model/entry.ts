import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { venueTypeSlugsForCategory, classifyDeal } from '../../shared/filterCatalogSeed.ts';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// Admin-only, batched. Maps each venue's legacy category string onto
// venue_type_ids, and backfills HappyHourItem rows from the venue's existing
// deals / deals_by_day text so the derived deal filters have structured data.
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const offset = Math.max(0, Number(body.offset) || 0);
    const limit = Math.min(50, Math.max(1, Number(body.limit) || 25));

    const svc = base44.asServiceRole;

    const types = await svc.entities.VenueType.list('', 500);
    if (!types.length) {
      return Response.json({ error: 'Run seedFilterCatalogs first — no venue types exist yet.' }, { status: 400 });
    }
    const typeIdBySlug = Object.fromEntries(types.map(t => [t.slug, t.id]));

    const allVenues = await svc.entities.Venue.list('created_date', 2000);
    const batch = allVenues.slice(offset, offset + limit);

    const results = [];
    for (const venue of batch) {
      try {
        // 1. Venue types from the legacy category string
        const slugs = venueTypeSlugsForCategory(venue.category);
        const venueTypeIds = slugs.map(s => typeIdBySlug[s]).filter(Boolean);
        if (venueTypeIds.length) {
          await svc.entities.Venue.update(venue.id, { venue_type_ids: venueTypeIds });
        }

        // 2. Structured happy hour items from the free-text deals
        const existingItems = await svc.entities.HappyHourItem.filter({ venue_id: venue.id });
        const migratedItems = existingItems.filter(i => i.source === 'migration');
        if (migratedItems.length) {
          await svc.entities.HappyHourItem.deleteMany({ venue_id: venue.id, source: 'migration' });
        }

        const rows = [];
        const byDay = venue.deals_by_day && typeof venue.deals_by_day === 'object' ? venue.deals_by_day : {};
        for (const day of DAYS) {
          const dayDeals = Array.isArray(byDay[day]) ? byDay[day] : [];
          for (const deal of dayDeals) {
            if (!deal) continue;
            rows.push({ venue_id: venue.id, ...classifyDeal(deal, day) });
          }
        }
        // Global fallback deals have no specific day
        for (const deal of Array.isArray(venue.deals) ? venue.deals : []) {
          if (!deal) continue;
          rows.push({ venue_id: venue.id, ...classifyDeal(deal, '') });
        }

        if (rows.length) await svc.entities.HappyHourItem.bulkCreate(rows);

        results.push({ venue: venue.name, venue_types: slugs, items: rows.length });
      } catch (err) {
        results.push({ venue: venue.name, error: err.message });
      }
    }

    const processed = offset + batch.length;
    return Response.json({
      success: true,
      total: allVenues.length,
      processed,
      next_offset: processed,
      done: processed >= allVenues.length,
      results,
    });
  } catch (error) {
    console.error('migrateVenuesToV3Model failed', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}