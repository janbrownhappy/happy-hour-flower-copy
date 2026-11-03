// Resolves a CSV row's city/state text into the app's
// LocationState → LocationMarket → LocationArea hierarchy.
// Matching is case-insensitive, whitespace-trimmed, and fuzzy on city names so
// "Greenville" matches a market named "Greenville / Upstate".

const norm = (s) => (s || '').trim().toLowerCase();

// Split a market/area label like "Mauldin / Simpsonville / Fountain Inn" into
// its individual place names so a single city can match one of the segments.
const segments = (label) =>
  norm(label)
    .split(/[/,&]|\s+-\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

const cityMatches = (city, label) => {
  const c = norm(city);
  if (!c) return false;
  const segs = segments(label);
  if (segs.includes(c)) return true;
  // Allow partial containment either direction ("Downtown Greenville" ↔ "Greenville")
  return segs.some((s) => s.includes(c) || c.includes(s));
};

export function buildLocationIndex({ states = [], markets = [], areas = [] }) {
  const stateByKey = {};
  for (const s of states) {
    if (s.code) stateByKey[norm(s.code)] = s;
    if (s.name) stateByKey[norm(s.name)] = s;
  }

  const marketsByState = {};
  for (const m of markets) {
    const key = norm(m.state_code);
    if (!marketsByState[key]) marketsByState[key] = [];
    marketsByState[key].push(m);
  }

  const areasByMarket = {};
  for (const a of areas) {
    const key = a.market_id || '';
    if (!areasByMarket[key]) areasByMarket[key] = [];
    areasByMarket[key].push(a);
  }

  return { stateByKey, marketsByState, areasByMarket, markets, areas };
}

// Returns { state, market, area } — any of which may be null.
export function resolveVenueLocation(row, index) {
  const { stateByKey, marketsByState, areasByMarket, markets, areas } = index;
  const city = row.city || '';
  let state = stateByKey[norm(row.state_code)] || null;

  // No usable state column — infer it from a nationwide city match instead.
  if (!state && city) {
    const area = areas.find((a) => cityMatches(city, a.area_name));
    const market = area
      ? markets.find((m) => m.market_id === area.market_id)
      : markets.find((m) => cityMatches(city, m.market_name));
    const inferred = market ? stateByKey[norm(market.state_code)] : null;
    if (market) {
      return {
        state: inferred || null,
        market,
        area: area || (areasByMarket[market.market_id] || [])[0] || null,
      };
    }
    return { state: null, market: null, area: null };
  }

  if (!state) return { state: null, market: null, area: null };

  const stateMarkets = marketsByState[norm(state.code)] || [];
  // Prefer a market whose areas contain the city, then the market name itself.
  let market =
    stateMarkets.find((m) =>
      (areasByMarket[m.market_id] || []).some((a) => cityMatches(city, a.area_name))
    ) ||
    stateMarkets.find((m) => cityMatches(city, m.market_name)) ||
    null;

  if (!market) return { state, market: null, area: null };

  const marketAreas = areasByMarket[market.market_id] || [];
  const area =
    marketAreas.find((a) => cityMatches(city, a.area_name)) || marketAreas[0] || null;

  return { state, market, area };
}