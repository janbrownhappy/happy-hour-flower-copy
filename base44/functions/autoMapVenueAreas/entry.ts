import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Admin-triggered one-time migration: map each venue's legacy `neighborhood`
// value to a new LocationArea, then set area_id / area / market_id /
// market_name / state_code on matching venues.
//
// All legacy venues belong to the SC "Greenville / Upstate" market (their codes
// use GVL/SIM/MAU/FTN prefixes). The old neighborhoods were more granular than
// the new areas, so we map each legacy value to its new area_id explicitly.
// This avoids cross-state false matches (many markets have a "Downtown X").

const LEGACY_TO_AREA_ID = {
  'GVL-01 Downtown / Main Street': 'sc_greenville_upstate__downtown_greenville',
  'GVL-02 West End': 'sc_greenville_upstate__downtown_greenville',
  'GVL-03 Village of West Greenville': 'sc_greenville_upstate__west_greenville',
  'GVL-04 Augusta Road Corridor': 'sc_greenville_upstate__augusta_road',
  'GVL-05 Haynie-Sirrine / Fluor Field': 'sc_greenville_upstate__downtown_greenville',
  'GVL-06 Hampton Station / Sans Souci': 'sc_greenville_upstate__west_greenville',
  'MAU-01 BridgeWay Station': 'sc_greenville_upstate__mauldin_simpsonville_fountain_inn',
  'MAU-02 Mauldin Main / E. Butler Rd': 'sc_greenville_upstate__mauldin_simpsonville_fountain_inn',
  'SIM-01 Downtown Simpsonville': 'sc_greenville_upstate__mauldin_simpsonville_fountain_inn',
  'SIM-02 Five Forks': 'sc_greenville_upstate__mauldin_simpsonville_fountain_inn',
  'SIM-03 Fairview Road': 'sc_greenville_upstate__mauldin_simpsonville_fountain_inn',
  'FTN-01 Downtown Fountain Inn': 'sc_greenville_upstate__mauldin_simpsonville_fountain_inn',
};

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const dryRun = req.method === 'GET';

    const areas = await base44.asServiceRole.entities.LocationArea.list('', 500);
    const areaByKey = {};
    for (const a of areas) areaByKey[a.area_id] = a;

    const venues = await base44.asServiceRole.entities.Venue.list('', 2000);

    const results = { total: venues.length, mapped: 0, unmatched: 0, alreadyMapped: 0, details: [] };
    const updates = [];

    for (const v of venues) {
      if (v.area_id) { results.alreadyMapped++; continue; }
      const legacy = v.neighborhood || v.area || '';
      if (!legacy) { results.unmatched++; continue; }

      const targetKey = LEGACY_TO_AREA_ID[legacy];
      const area = targetKey ? areaByKey[targetKey] : null;

      if (area) {
        results.mapped++;
        results.details.push({ venue: v.name, from: legacy, to: area.area_name });
        if (!dryRun) {
          updates.push({
            id: v.id,
            area_id: area.id,
            area: area.area_id,
            market_id: area.market_id,
            market_name: area.market_name,
            state_code: area.state_code,
          });
        }
      } else {
        results.unmatched++;
        results.details.push({ venue: v.name, from: legacy, to: null });
      }
    }

    if (!dryRun && updates.length) {
      for (let i = 0; i < updates.length; i += 500) {
        await base44.asServiceRole.entities.Venue.bulkUpdate(updates.slice(i, i + 500));
      }
    }

    return Response.json({ dryRun, ...results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}