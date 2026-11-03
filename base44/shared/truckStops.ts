// Shared food-truck stop logic: timezone conversion and the time-aware serving
// resolver used by the stop-management function and the nearby/arrival engine.
export const DEFAULT_TZ = 'America/New_York';
export const MAX_RECURRENCE_DAYS = 84; // 12 weeks
export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
export const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

function tzOffsetMs(tz, ms) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(new Date(ms));
  const g = (t) => Number(parts.find((p) => p.type === t)?.value);
  const asUtc = Date.UTC(g('year'), g('month') - 1, g('day'), g('hour') % 24, g('minute'), g('second'));
  return asUtc - Math.floor(ms / 1000) * 1000;
}

// Local wall-clock date + time in `tz` → UTC ms (DST-aware).
export function zonedToUtc(date, time, tz = DEFAULT_TZ) {
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  const guess = Date.UTC(y, m - 1, d, hh, mm);
  let ts = guess - tzOffsetMs(tz, guess);
  ts = guess - tzOffsetMs(tz, ts);
  return ts;
}

export function localParts(ms, tz = DEFAULT_TZ) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', weekday: 'short',
  }).formatToParts(new Date(ms));
  const g = (t) => parts.find((p) => p.type === t)?.value;
  return { date: `${g('year')}-${g('month')}-${g('day')}`, time: `${g('hour')}:${g('minute')}`, weekday: g('weekday') };
}

export function addDays(date, n) {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
export const weekdayOf = (date) => new Date(`${date}T12:00:00Z`).getUTCDay();
export const daysBetween = (a, b) => Math.round((Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)) / 86400000);

export function effectiveEnd(stop) {
  const end = Date.parse(stop.end_at);
  if (stop.status === 'finished' && stop.finished_at) return Math.min(end, Date.parse(stop.finished_at));
  return end;
}

// Checked in, inside the serving window, and neither canceled nor finished.
export function isServingNow(stop, now = Date.now()) {
  return !!stop && stop.status === 'scheduled' && !!stop.checked_in_at
    && Date.parse(stop.start_at) <= now && now < Date.parse(stop.end_at);
}

export async function foodTruckTypeIds(sr) {
  const types = await sr.entities.VenueType.filter({ slug: 'food_truck' });
  return new Set(types.map((t) => t.id));
}
export const isTruckVenue = (venue, ids) => (venue?.venue_type_ids || []).some((id) => ids.has(id));

// Checked-in, currently-serving stops — the only truck locations eligible for nearby/arrival.
export async function servingStops(sr, now = Date.now()) {
  const nowIso = new Date(now).toISOString();
  const rows = await sr.entities.FoodTruckStop.filter({ status: 'scheduled', start_at: { $lte: nowIso }, end_at: { $gt: nowIso } }, 'start_at', 500);
  return rows.filter((s) => isServingNow(s, now) && Number.isFinite(s.lat) && Number.isFinite(s.lng));
}

// A stop-linked special is available only when the stop is serving AND the special's own day rule matches.
export function stopSpecial(stop, items, now = Date.now()) {
  if (!isServingNow(stop, now)) return null;
  const day = localParts(now, stop.timezone || DEFAULT_TZ).weekday;
  const ids = new Set(stop.special_ids || []);
  const item = items.find((i) => ids.has(i.id) && (!i.day || i.day === day));
  return item ? { id: item.id, summary: item.label || '' } : null;
}