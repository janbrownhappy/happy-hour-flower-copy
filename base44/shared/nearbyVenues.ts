// Phase 2 nearby-venue detection. Single source of truth used by the production
// location endpoint and the admin testing tool. Swap the geo implementation here
// (e.g. for an indexed geo query) without changing the client interface.
import { foodTruckTypeIds, isTruckVenue, servingStops, stopSpecial } from './truckStops.ts';

export const DEFAULT_RADIUS_METERS = 50;
export const VENUE_TIMEZONE = 'America/New_York';
export const ARRIVAL_DEFAULTS = {
  departure_radius_meters: 150,
  required_arrival_readings: 2,
  required_departure_readings: 2,
  max_arrival_accuracy_meters: 100,
  arrival_notification_cooldown_hours: 12,
  max_arrival_notifications_per_24h: 3,
  arrival_notifications_enabled: false, // off by default so testing never notifies production users
};
const DAY_KEYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function isValidLat(v) { return typeof v === 'number' && Number.isFinite(v) && v >= -90 && v <= 90; }
export function isValidLng(v) { return typeof v === 'number' && Number.isFinite(v) && v >= -180 && v <= 180; }
export function hasValidCoords(venue) {
  return isValidLat(venue?.lat) && isValidLng(venue?.lng) && !(venue.lat === 0 && venue.lng === 0);
}

export function haversineMeters(lat1, lng1, lat2, lng2) {
  const R = 6371008.8;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

// Reads all Phase 2 location settings from AppSetting (key/value_string).
export async function getLocationSettings(sr) {
  const rows = await sr.entities.AppSetting.filter({ key: { $in: Object.keys(ARRIVAL_DEFAULTS).concat(['nearby_radius_meters', 'nearby_min_accuracy_meters', 'location_logging_enabled', 'location_log_retention_days', 'location_history_retention_hours', 'diagnostic_nearest_venue_radius_meters']) } });
  const get = (k) => rows.find((r) => r.key === k);
  const num = (k, d) => { const n = Number(get(k)?.value_string); return Number.isFinite(n) && n > 0 ? n : d; };
  const logRow = get('location_logging_enabled');
  const enabledRow = get('arrival_notifications_enabled');
  return {
    // Phase 3 arrival settings. Arrival radius IS the Phase 2 detection radius.
    departure_radius_meters: num('departure_radius_meters', ARRIVAL_DEFAULTS.departure_radius_meters),
    required_arrival_readings: num('required_arrival_readings', ARRIVAL_DEFAULTS.required_arrival_readings),
    required_departure_readings: num('required_departure_readings', ARRIVAL_DEFAULTS.required_departure_readings),
    max_arrival_accuracy_meters: num('max_arrival_accuracy_meters', ARRIVAL_DEFAULTS.max_arrival_accuracy_meters),
    arrival_notification_cooldown_hours: num('arrival_notification_cooldown_hours', ARRIVAL_DEFAULTS.arrival_notification_cooldown_hours),
    max_arrival_notifications_per_24h: num('max_arrival_notifications_per_24h', ARRIVAL_DEFAULTS.max_arrival_notifications_per_24h),
    arrival_notifications_enabled: enabledRow ? enabledRow.value_bool === true : false,
    radius_meters: num('nearby_radius_meters', DEFAULT_RADIUS_METERS),
    min_accuracy_meters: num('nearby_min_accuracy_meters', null), // collected only; not enforced in Phase 2
    logging_enabled: logRow ? logRow.value_bool !== false : true,
    log_retention_days: num('location_log_retention_days', 30),
    history_retention_hours: num('location_history_retention_hours', 24), // Phase 4 Despia field-test history
    diagnostic_nearest_venue_radius_meters: num('diagnostic_nearest_venue_radius_meters', 2000), // admin diagnostics only — never used by the Arrival Engine
  };
}

function toMinutes(value) {
  if (!value) return null;
  const m = String(value).trim().toLowerCase().match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/);
  if (!m) return null;
  let h = Number(m[1]);
  if (m[3] === 'pm' && h < 12) h += 12;
  if (m[3] === 'am' && h === 12) h = 0;
  return h * 60 + Number(m[2] || 0);
}

function localNow(now) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: VENUE_TIMEZONE, weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(now);
  const p = (t) => parts.find((x) => x.type === t)?.value;
  return { day: p('weekday'), minutes: Number(p('hour')) * 60 + Number(p('minute')) };
}

// Is the venue's happy hour window open at (day, minutes)? Uses existing day_schedules/days/happy_hour_start/end.
function windowOpen(venue, day, minutes) {
  const check = (d, nowMin) => {
    if (Array.isArray(venue.days) && venue.days.length && !venue.days.includes(d) && !venue.day_schedules?.[d]) return false;
    const per = venue.day_schedules?.[d];
    const start = toMinutes(per?.start ?? venue.happy_hour_start);
    let end = toMinutes(per?.end ?? venue.happy_hour_end);
    if (start == null || end == null) return false;
    if (end <= start) end += 1440;
    return nowMin >= start && nowMin < end;
  };
  const prev = DAY_KEYS[(DAY_KEYS.indexOf(day) + 6) % 7];
  return check(day, minutes) || check(prev, minutes + 1440); // past-midnight window from yesterday
}

// Most relevant special for the day: structured item first, then legacy deal text.
function specialForDay(venue, items, day) {
  const item = items.find((i) => i.day === day) || items.find((i) => !i.day);
  if (item) return { id: item.id, summary: item.label || '' };
  const legacy = (venue.deals_by_day?.[day] || [])[0] || (venue.deals || [])[0] || venue.specials?.[0]?.name;
  return legacy ? { id: '', summary: String(legacy) } : null;
}

// Returns { id, summary } of the currently active special, or null.
export function getActiveSpecial(venue, items, now = new Date()) {
  const { day, minutes } = localNow(now);
  return windowOpen(venue, day, minutes) ? specialForDay(venue, items, day) : null;
}

export function hasActiveSpecial(venue, items, now = new Date()) {
  return !!getActiveSpecial(venue, items, now);
}

// Core search. Bounding-box prefilter in the database, exact Haversine server-side.
export async function findNearbyVenues(sr, lat, lng, radiusMeters, now = new Date()) {
  const dLat = radiusMeters / 111320;
  const dLng = radiusMeters / (111320 * Math.max(Math.cos((lat * Math.PI) / 180), 0.01));
  const candidates = await sr.entities.Venue.filter({
    status: 'active',
    lat: { $gte: lat - dLat, $lte: lat + dLat },
    lng: { $gte: lng - dLng, $lte: lng + dLng },
  }, 'name', 500);

  // Food trucks are never evaluated at their static business address — only at a
  // checked-in, currently-serving stop.
  const truckIds = await foodTruckTypeIds(sr);
  const inRange = candidates
    .filter((v) => hasValidCoords(v) && !isTruckVenue(v, truckIds))
    .map((v) => ({ v, d: haversineMeters(lat, lng, v.lat, v.lng), lat: v.lat, lng: v.lng, stop: null }))
    .filter((x) => x.d <= radiusMeters);

  const stops = (await servingStops(sr, now.getTime()))
    .map((s) => ({ s, d: haversineMeters(lat, lng, s.lat, s.lng) }))
    .filter((x) => x.d <= radiusMeters);
  if (stops.length) {
    const trucks = await sr.entities.Venue.filter({ id: { $in: [...new Set(stops.map((x) => x.s.venue_id))] }, status: 'active' });
    const byId = Object.fromEntries(trucks.filter((v) => isTruckVenue(v, truckIds)).map((v) => [v.id, v]));
    for (const { s, d } of stops) if (byId[s.venue_id]) inRange.push({ v: byId[s.venue_id], d, lat: s.lat, lng: s.lng, stop: s });
  }
  if (!inRange.length) return [];

  const items = await sr.entities.HappyHourItem.filter({ venue_id: { $in: [...new Set(inRange.map((x) => x.v.id))] } });
  return inRange
    .map((x) => {
      const own = items.filter((i) => i.venue_id === x.v.id);
      return { ...x, special: x.stop ? stopSpecial(x.stop, own, now.getTime()) : getActiveSpecial(x.v, own, now) };
    })
    .map(({ v, d, special, lat: vLat, lng: vLng, stop }) => ({
      venue_id: v.id,
      venue_name: v.name,
      stop_id: stop?.id || '',
      distance_meters: Math.round(d * 10) / 10,
      has_active_special: !!special,
      active_special_id: special?.id || '',
      active_special_summary: special?.summary || '',
      venue_latitude: vLat,
      venue_longitude: vLng,
    }))
    .sort((a, b) => a.distance_meters - b.distance_meters);
}