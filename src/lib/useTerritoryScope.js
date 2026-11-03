import { useMemo } from 'react';

/**
 * Resolves the user's territory scope ({ market_id, state_code }) from their
 * saved profile preferences, with fallbacks for older/partial profiles:
 *   1. explicit market_id saved on the profile
 *   2. the market of the profile's saved area key
 *   3. the market of venues in the profile's ZIP code
 *   4. state code (either state_code, or `state` when it's a 2-letter code)
 */
export default function useTerritoryScope({ locationPrefs, areas, venues }) {
  return useMemo(() => {
    const prefs = locationPrefs || {};

    const areaRec = prefs.area ? (areas || []).find(a => a.area_id === prefs.area) : null;

    let market = prefs.market_id || areaRec?.market_id || '';
    if (!market && prefs.zip_code) {
      const zipVenue = (venues || []).find(
        v => String(v.zip_code || '') === String(prefs.zip_code) && v.market_id
      );
      market = zipVenue?.market_id || '';
    }

    const rawState = prefs.state_code || (String(prefs.state || '').length === 2 ? prefs.state : '');
    let state = rawState || areaRec?.state_code || '';
    if (!state && market) {
      state = (areas || []).find(a => a.market_id === market)?.state_code || '';
    }

    return { market_id: market, state_code: String(state || '').toUpperCase() };
  }, [locationPrefs, areas, venues]);
}