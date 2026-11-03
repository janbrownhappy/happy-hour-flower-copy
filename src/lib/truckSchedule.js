// Food-truck schedule resolution shared by Explore, the map, cards and the
// owner editor.
//
// A truck's public location comes from its `truck_schedule` — date-specific
// appearances, one per day, so a truck that moves daily resolves to wherever it
// is right now. Only CONFIRMED appearances (owner has signed off on the
// date/time) are ever shown; a truck with nothing confirmed for today is hidden
// from the map and "near me" entirely, while its home-base address still shows
// on its own detail page.

export const FOOD_TRUCK_SLUG = 'food_truck';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function dayLabel(isoDate) {
  if (!isoDate) return '';
  const d = new Date(`${isoDate}T12:00:00`);
  return Number.isNaN(d.getTime()) ? '' : DAY_LABELS[d.getDay()];
}

export function formatApparanceDate(isoDate) {
  if (!isoDate) return '';
  const d = new Date(`${isoDate}T12:00:00`);
  if (Number.isNaN(d.getTime())) return isoDate;
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

/** Ids of the VenueType records that mean "food truck". */
export function foodTruckTypeIds(venueTypes = []) {
  return new Set(venueTypes.filter((t) => t.slug === FOOD_TRUCK_SLUG).map((t) => t.id));
}

export function isFoodTruck(venue, truckTypeIds) {
  if (!venue) return false;
  if (truckTypeIds?.size) {
    return (venue.venue_type_ids || []).some((id) => truckTypeIds.has(id));
  }
  // No catalog loaded — a venue carrying truck appearances is still a truck.
  return Array.isArray(venue.truck_schedule) && venue.truck_schedule.length > 0;
}

/** An appearance is publicly usable only with a confirmed date AND time. */
export function isUsableAppearance(a) {
  return !!(a && a.confirmed === true && a.date && a.start_time && a.end_time);
}

export function sortedAppearances(venue) {
  return [...(venue?.truck_schedule || [])].sort((a, b) =>
    String(a?.date || '').localeCompare(String(b?.date || ''))
  );
}

/** Today's confirmed appearance, or null. */
export function todaysAppearance(venue) {
  const today = todayIso();
  return sortedAppearances(venue).find((a) => a.date === today && isUsableAppearance(a)) || null;
}

/** Today's confirmed appearance, else the next confirmed one coming up. */
export function activeAppearance(venue) {
  const today = todayIso();
  const usable = sortedAppearances(venue).filter(isUsableAppearance);
  return usable.find((a) => a.date === today) || usable.find((a) => a.date > today) || null;
}

export function upcomingAppearances(venue, limit = 7) {
  const today = todayIso();
  return sortedAppearances(venue)
    .filter((a) => a?.date && a.date >= today)
    .slice(0, limit);
}

/**
 * Where to put this venue on a map / measure distance from.
 * Trucks resolve to today's confirmed stop; no confirmed stop today => null,
 * which callers treat as "don't show it".
 */
export function venueMapPoint(venue, truckTypeIds) {
  if (isFoodTruck(venue, truckTypeIds)) {
    const stop = todaysAppearance(venue);
    if (!stop || !Number.isFinite(Number(stop.lat)) || !Number.isFinite(Number(stop.lng))) return null;
    return { lat: Number(stop.lat), lng: Number(stop.lng), appearance: stop };
  }
  const lat = Number(venue?.lat);
  const lng = Number(venue?.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || (lat === 0 && lng === 0)) return null;
  return { lat, lng, appearance: null };
}