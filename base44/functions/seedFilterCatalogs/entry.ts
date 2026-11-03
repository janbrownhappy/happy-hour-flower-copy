import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { VENUE_TYPE_SEED, CUISINE_SEED } from '../../shared/filterCatalogSeed.ts';

// Admin-only. Idempotent on slug: existing rows are refreshed, missing rows created.
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const svc = base44.asServiceRole;

    const [existingTypes, existingCuisines] = await Promise.all([
      svc.entities.VenueType.list('', 500),
      svc.entities.Cuisine.list('', 500),
    ]);

    const typeBySlug = Object.fromEntries(existingTypes.map(t => [t.slug, t]));
    const cuisineBySlug = Object.fromEntries(existingCuisines.map(c => [c.slug, c]));

    const newTypes = [];
    const typeUpdates = [];
    for (const row of VENUE_TYPE_SEED) {
      const found = typeBySlug[row.slug];
      if (found) typeUpdates.push({ id: found.id, ...row, is_active: true });
      else newTypes.push({ ...row, is_active: true });
    }

    const newCuisines = [];
    const cuisineUpdates = [];
    for (const row of CUISINE_SEED) {
      const found = cuisineBySlug[row.slug];
      if (found) cuisineUpdates.push({ id: found.id, ...row, is_active: true });
      else newCuisines.push({ ...row, is_active: true });
    }

    if (newTypes.length) await svc.entities.VenueType.bulkCreate(newTypes);
    if (typeUpdates.length) await svc.entities.VenueType.bulkUpdate(typeUpdates);
    if (newCuisines.length) await svc.entities.Cuisine.bulkCreate(newCuisines);
    if (cuisineUpdates.length) await svc.entities.Cuisine.bulkUpdate(cuisineUpdates);

    return Response.json({
      success: true,
      venue_types_created: newTypes.length,
      venue_types_updated: typeUpdates.length,
      cuisines_created: newCuisines.length,
      cuisines_updated: cuisineUpdates.length,
    });
  } catch (error) {
    console.error('seedFilterCatalogs failed', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}