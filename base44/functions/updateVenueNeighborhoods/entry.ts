import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// ZIP → neighborhood enum mapping
const ZIP_TO_NEIGHBORHOOD = {
  '29601': 'GVL-01 Downtown / Main Street',
  '29602': 'GVL-01 Downtown / Main Street',
  '29603': 'GVL-02 West End',
  '29605': 'GVL-04 Augusta Road Corridor',
  '29609': 'GVL-06 Hampton Station / Sans Souci',
  '29611': 'GVL-03 Village of West Greenville',
  '29617': 'GVL-06 Hampton Station / Sans Souci',
  '29607': 'GVL-05 Haynie-Sirrine / Fluor Field',
  '29662': 'MAU-01 BridgeWay Station',
  '29680': 'SIM-01 Downtown Simpsonville',
  '29681': 'SIM-02 Five Forks',
  '29644': 'FTN-01 Downtown Fountain Inn',
};

// City name fallback for addresses without ZIP
const CITY_TO_NEIGHBORHOOD = {
  'mauldin': 'MAU-01 BridgeWay Station',
  'simpsonville': 'SIM-01 Downtown Simpsonville',
  'fountain inn': 'FTN-01 Downtown Fountain Inn',
  'travelers rest': null, // not in the mapping
};

function getNeighborhoodFromAddress(address) {
  if (!address) return null;
  
  // Try to extract ZIP code
  const zipMatch = address.match(/\b(29\d{3})\b/);
  if (zipMatch) {
    const zip = zipMatch[1];
    if (ZIP_TO_NEIGHBORHOOD[zip]) return ZIP_TO_NEIGHBORHOOD[zip];
  }
  
  // Fallback: city name
  const lower = address.toLowerCase();
  for (const [city, neighborhood] of Object.entries(CITY_TO_NEIGHBORHOOD)) {
    if (lower.includes(city)) return neighborhood;
  }
  
  return null;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    const venues = await base44.asServiceRole.entities.Venue.list();
    
    const results = { updated: [], skipped: [], noMatch: [] };

    for (const venue of venues) {
      const address = venue.address;
      const neighborhood = getNeighborhoodFromAddress(address);
      
      if (!neighborhood) {
        results.noMatch.push({ id: venue.id, name: venue.name, address });
        continue;
      }
      
      if (venue.neighborhood === neighborhood) {
        results.skipped.push({ id: venue.id, name: venue.name, neighborhood });
        continue;
      }
      
      await base44.asServiceRole.entities.Venue.update(venue.id, { neighborhood });
      results.updated.push({ id: venue.id, name: venue.name, address, neighborhood });
    }

    return Response.json({
      success: true,
      total: venues.length,
      updated: results.updated.length,
      skipped: results.skipped.length,
      noMatch: results.noMatch.length,
      details: results,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});