import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { SOURCES, applyProtectedUpdates, recordDiscrepancies } from '../../shared/enrichmentProtection.ts';

// Older AI contact fill-in: finds a missing phone/website. Only fills genuinely blank
// fields, and every write passes through the shared protection policy — on claimed venues
// (or owner/admin-controlled fields) findings become discrepancies instead of writes.
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    const testNames = ['roots', 'sippin with me', "tina's bar", "pete's pub", 'smith brewery', 'clean sweep'];
    const venues = await base44.asServiceRole.entities.Venue.list();
    const toEnrich = venues.filter(v =>
      v.name &&
      v.status === 'active' &&
      !testNames.some(t => v.name.toLowerCase().includes(t)) &&
      (!v.phone || !v.website)
    );

    const results = { updated: 0, skipped: 0, protected: 0, errors: [] };

    // Process in small batches of 5 to avoid timeouts
    const { batch = 0 } = await req.json().catch(() => ({}));
    const batchSize = 5;
    const start = batch * batchSize;
    const slice = toEnrich.slice(start, start + batchSize);

    for (const venue of slice) {
      try {
        const prompt = `Find the official phone number and official website URL for this bar/restaurant: "${venue.name}" located at "${venue.address || 'Greenville, SC'}". Return ONLY JSON with keys "phone" and "website". Use null if not found. Phone format: (XXX) XXX-XXXX. Website must be full URL starting with https://.`;

        const info = await base44.asServiceRole.integrations.Core.InvokeLLM({
          model: 'gemini_3_flash',
          add_context_from_internet: true,
          prompt,
          response_json_schema: {
            type: 'object',
            properties: {
              phone: { type: 'string' },
              website: { type: 'string' }
            }
          }
        });

        const proposed = {};
        if (info.phone && !venue.phone) proposed.phone = info.phone;
        if (info.website && !venue.website) proposed.website = info.website;

        const plan = applyProtectedUpdates(venue, proposed, SOURCES.GEMINI);
        if (plan.protected.length) {
          results.protected += await recordDiscrepancies(base44, venue, plan.protected, 'enrichVenueContacts');
        }

        if (plan.applied.length) {
          await base44.asServiceRole.entities.Venue.update(venue.id, plan.updates);
          results.updated++;
        } else {
          results.skipped++;
        }
      } catch (err) {
        results.errors.push({ id: venue.id, name: venue.name, error: err.message });
      }
    }

    return Response.json({
      ...results,
      batch,
      batchSize,
      processedRange: `${start}-${start + slice.length}`,
      totalToEnrich: toEnrich.length,
      hasMore: start + batchSize < toEnrich.length,
      nextBatch: start + batchSize < toEnrich.length ? batch + 1 : null
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}