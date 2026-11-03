import { createContext, useContext, useState } from 'react';

// Shared territory selection (State → Market → Area) for all venue-based admin
// pages. Set once at the top of the Admin dashboard, read everywhere.
const AdminLocationContext = createContext(null);

const EMPTY = { state_code: null, market_id: null, area_id: null };

export function AdminLocationProvider({ children }) {
  const [locationFilter, setLocationFilter] = useState({ ...EMPTY });
  return (
    <AdminLocationContext.Provider value={{ locationFilter, setLocationFilter }}>
      {children}
    </AdminLocationContext.Provider>
  );
}

export function useAdminLocation() {
  const ctx = useContext(AdminLocationContext);
  if (!ctx) return { locationFilter: { ...EMPTY }, setLocationFilter: () => {} };
  return ctx;
}

// Returns true if a venue falls within the active territory selection.
// Uses the venue's denormalized state_code / market_id / area (area_id string).
export function venueInTerritory(venue, filter) {
  if (!filter) return true;
  if (filter.area_id) return venue?.area === filter.area_id;
  if (filter.market_id) return venue?.market_id === filter.market_id;
  if (filter.state_code) return venue?.state_code === filter.state_code;
  return true;
}

// Returns true if a consumer Profile falls within the active territory selection,
// using the location_preferences they saved (state_code / market_id / area).
export function profileInTerritory(profile, filter) {
  if (!filter) return true;
  const prefs = profile?.location_preferences || {};
  if (filter.area_id) return prefs.area === filter.area_id;
  if (filter.market_id) return prefs.market_id === filter.market_id;
  if (filter.state_code) return prefs.state_code === filter.state_code;
  return true;
}

// Convenience: is any territory level selected?
export function hasTerritory(filter) {
  return !!(filter && (filter.state_code || filter.market_id || filter.area_id));
}