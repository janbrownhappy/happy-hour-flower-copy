import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { requireAutomationCaller } from '../../shared/automationAuth.ts';

// Called by the "Auto-assign Venue Market" workflow when a venue is created
// without a market. Copies the market used by other SC venues in the same city.
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const denied = await requireAutomationCaller(base44, req);
    if (denied) return denied;
    const sr = base44.asServiceRole;
    const { venue_id } = await req.json();
    const venue = await sr.entities.Venue.get(venue_id).catch(() => null);
    if (!venue) return Response.json({ skipped: 'not found' });
    if (venue.market_id) return Response.json({ skipped: 'already assigned' });
    if (!venue.city) return Response.json({ skipped: 'no city' });

    // Venue has field-level read rules, so aggregate isn't available: tally a sample page.
    const page = await sr.entities.Venue.filter(
      { city: venue.city, state_code: 'SC', market_id: { $exists: true, $ne: '' } },
      { limit: 50, fields: ['market_id', 'market_name'] },
    );
    const tally = {};
    for (const v of page.items || []) {
      if (!v.market_id) continue;
      tally[v.market_id] = tally[v.market_id] || { market_id: v.market_id, market_name: v.market_name, n: 0 };
      tally[v.market_id].n++;
    }
    const top = Object.values(tally).sort((a, b) => b.n - a.n)[0];
    if (!top?.market_id) return Response.json({ skipped: 'no market for city' });

    await sr.entities.Venue.update(venue.id, { market_id: top.market_id, market_name: top.market_name, state_code: venue.state_code || 'SC' });
    return Response.json({ assigned: top.market_name });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}