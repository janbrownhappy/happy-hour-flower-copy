// Single client-side resolver for food-truck stop location and availability.
// Used by maps, lists, cards, distances, profiles and specials. Serving status is
// always computed from timestamps so it expires on time even if no job runs.
export const DEFAULT_TZ = 'America/New_York';
export const FOOD_TRUCK_SLUG = 'food_truck';
const ms = (s) => Date.parse(s);

function tzOffsetMs(tz, t) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }).formatToParts(new Date(t));
  const g = (k) => Number(parts.find((p) => p.type === k)?.value);
  return Date.UTC(g('year'), g('month') - 1, g('day'), g('hour') % 24, g('minute'), g('second')) - Math.floor(t / 1000) * 1000;
}
export function zonedToUtc(date, time, tz = DEFAULT_TZ) {
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  const guess = Date.UTC(y, m - 1, d, hh, mm);
  return guess - tzOffsetMs(tz, guess - tzOffsetMs(tz, guess));
}
export function localDate(t = Date.now(), tz = DEFAULT_TZ) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(t));
}
export function addDays(date, n) {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
export const weekdayOf = (date) => new Date(`${date}T12:00:00Z`).getUTCDay();

export function effectiveEnd(stop) {
  const end = ms(stop.end_at);
  return stop.status === 'finished' && stop.finished_at ? Math.min(end, ms(stop.finished_at)) : end;
}

// canceled | sold_out | finished | past | serving | scheduled_now | upcoming
export function stopPhase(stop, now = Date.now()) {
  if (!stop) return null;
  if (stop.status === 'canceled') return 'canceled';
  if (stop.status === 'finished' && now >= effectiveEnd(stop)) return stop.finish_reason === 'sold_out' ? 'sold_out' : 'finished';
  if (now >= ms(stop.end_at)) return 'past';
  if (now >= ms(stop.start_at)) return stop.checked_in_at ? 'serving' : 'scheduled_now';
  return 'upcoming';
}

// Interval for a discovery mode: now | today | tonight | tomorrow | date (opts.date) | weekday (opts.weekday 'Mon'..)
const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export function intervalFor(mode, now = Date.now(), opts = {}) {
  const today = localDate(now);
  const day = (d) => ({ from: zonedToUtc(d, '00:00'), to: zonedToUtc(addDays(d, 1), '00:00') });
  if (mode === 'now') return { from: now, to: now + 1 };
  if (mode === 'tonight') return { from: Math.max(now, zonedToUtc(today, '17:00')), to: day(today).to };
  if (mode === 'tomorrow') return day(addDays(today, 1));
  if (mode === 'date' && opts.date) { const b = day(opts.date); return { from: Math.max(b.from, now), to: b.to }; }
  if (mode === 'weekday' && opts.weekday) {
    let d = today;
    while (WD[weekdayOf(d)] !== opts.weekday) d = addDays(d, 1);
    const b = day(d);
    return { from: Math.max(b.from, now), to: b.to };
  }
  return { from: now, to: day(today).to }; // today: rest of the local day
}

// Applicable (non-canceled, overlapping) stops and the selected one for an interval.
export function resolveTruckStop(stops = [], interval, now = Date.now()) {
  const applicable = stops
    .filter((s) => s.status !== 'canceled' && ms(s.start_at) < interval.to && effectiveEnd(s) > interval.from)
    .sort((a, b) => ms(a.start_at) - ms(b.start_at));
  const stop = applicable.find((s) => stopPhase(s, now) === 'serving')
    || applicable.find((s) => stopPhase(s, now) === 'scheduled_now')
    || applicable.find((s) => effectiveEnd(s) > now) || null;
  return { stop, stops: applicable };
}

// Trucks get coordinates ONLY from the selected stop — never from their business address.
export function applyTruckStops(venues, truckTypeIds, stopsByVenue, interval, now) {
  if (!truckTypeIds?.size) return venues;
  return venues.map((v) => {
    if (!(v.venue_type_ids || []).some((id) => truckTypeIds.has(id))) return v;
    const { stop, stops } = resolveTruckStop(stopsByVenue[v.id] || [], interval, now);
    return { ...v, _truck: true, _stop: stop, _stops: stops, lat: stop ? stop.lat : null, lng: stop ? stop.lng : null };
  });
}

export function formatStopTime(stop) {
  const tz = stop.timezone || DEFAULT_TZ;
  const day = new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'short', month: 'short', day: 'numeric' }).format(new Date(stop.start_at));
  const t = (x) => new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: 'numeric', minute: '2-digit' }).format(new Date(x));
  return { day, hours: `${t(stop.start_at)} – ${t(stop.end_at)}` };
}

export function stopLabel(stop, now = Date.now()) {
  const phase = stopPhase(stop, now);
  if (!stop) return { text: 'No upcoming location posted', tone: 'muted' };
  if (phase === 'serving') return { text: 'Serving now — owner confirmed', tone: 'live' };
  if (phase === 'scheduled_now') return { text: 'Scheduled here now — arrival unconfirmed', tone: 'warn' };
  if (phase === 'canceled') return { text: 'This stop was canceled', tone: 'bad' };
  if (phase === 'sold_out') return { text: 'Sold out', tone: 'bad' };
  if (phase === 'finished') return { text: 'Finished for the day', tone: 'muted' };
  if (phase === 'past') return { text: 'Past stop', tone: 'muted' };
  const f = formatStopTime(stop);
  return { text: `Next stop: ${f.day}, ${f.hours}`, tone: 'info' };
}

// Stop-specific specials: available only while the stop serves AND the special's day rule matches.
export function stopSpecials(stop, items = [], now = Date.now()) {
  const ids = new Set(stop?.special_ids || []);
  const wd = new Intl.DateTimeFormat('en-US', { timeZone: stop?.timezone || DEFAULT_TZ, weekday: 'short' }).format(new Date(stop ? stop.start_at : now));
  return items.filter((i) => ids.has(i.id) && (!i.day || i.day === wd));
}

export const directionsUrl = (stop) => `https://www.google.com/maps/dir/?api=1&destination=${stop.lat},${stop.lng}`;