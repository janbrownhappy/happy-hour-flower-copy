// Server-authoritative management of FoodTruckStop records. Every write validates
// the caller's rights on the venue, food-truck classification, location, times,
// special associations, overlap and duplicate submissions.
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { secrets } from 'base44:runtime';
import { geocodeAddress } from '../../shared/truckSchedule.ts';
import { trustedCollaborators } from '../../shared/venueAccess.ts';
import { pushToUsers } from '../../shared/oneSignalPush.ts';
import { ghlSmsToPhones as smsToPhones } from '../../shared/ghlSms.ts';
import {
  DEFAULT_TZ, MAX_RECURRENCE_DAYS, DATE_RE, TIME_RE, zonedToUtc, localParts, addDays, weekdayOf, daysBetween,
  effectiveEnd, foodTruckTypeIds, isTruckVenue,
} from '../../shared/truckStops.ts';

class HttpError extends Error {
  constructor(message, status = 400, extra = {}) { super(message); this.status = status; this.extra = extra; }
}
const fail = (m, s = 400, extra = {}) => { throw new HttpError(m, s, extra); };
const iso = (ms) => new Date(ms).toISOString();
const MAX_LEN_MS = 24 * 3600000;

async function authorize(sr, user, venueId) {
  if (!venueId) fail('venue_id is required');
  const venue = await sr.entities.Venue.get(venueId).catch(() => null);
  if (!venue) fail('Venue not found', 404);
  if (!isTruckVenue(venue, await foodTruckTypeIds(sr))) fail('This venue is not classified as a food truck');
  const adminEmail = secrets.get('ADMIN_EMAIL');
  if (user.role === 'admin' || (adminEmail && user.email === adminEmail)) return venue;
  if (venue.owner_id === user.id || (venue.editor_ids || []).includes(user.id)) return venue;
  const collab = await trustedCollaborators(sr, venue, { user_id: user.id });
  if (collab.length) return venue;
  fail('You are not allowed to manage this truck schedule', 403);
}

// Validates location + specials once; times are built per occurrence.
async function validateBase(sr, venue, s) {
  const location_name = String(s.location_name || '').trim();
  const address = String(s.address || '').trim();
  const lat = Number(s.lat), lng = Number(s.lng);
  if (!location_name) fail('Location name is required');
  if (!address) fail('Street address is required');
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180 || (lat === 0 && lng === 0)) {
    fail('A valid map pin is required — search the address or drop the pin on the map');
  }
  const timezone = s.timezone || DEFAULT_TZ;
  try { new Intl.DateTimeFormat('en-US', { timeZone: timezone }); } catch { fail('Invalid timezone'); }
  const ids = [...new Set((s.special_ids || []).map(String))];
  if (ids.length) {
    const items = await sr.entities.HappyHourItem.filter({ venue_id: venue.id });
    const valid = new Set(items.map((i) => i.id));
    if (ids.some((id) => !valid.has(id))) fail('One or more specials do not belong to this truck');
  }
  if (!TIME_RE.test(s.start_time || '') || !TIME_RE.test(s.end_time || '')) fail('Start and end time are required (HH:MM)');
  return { location_name, address, lat, lng, timezone, instructions: String(s.instructions || '').trim(), special_ids: ids, start_time: s.start_time, end_time: s.end_time };
}

// Builds UTC timestamps for one local date; spanDays > 0 for overnight stops.
function buildTimes(base, date, spanDays) {
  if (!DATE_RE.test(date || '')) fail('A valid date is required');
  const end_date = addDays(date, spanDays);
  const start = zonedToUtc(date, base.start_time, base.timezone);
  const end = zonedToUtc(end_date, base.end_time, base.timezone);
  if (end <= start) fail(spanDays ? 'End must be after start' : 'End time is before start time — set an end date for overnight stops');
  if (end - start > MAX_LEN_MS) fail('A stop can be at most 24 hours long');
  return { local_date: date, end_date, start_at: iso(start), end_at: iso(end) };
}

function spanOf(s) {
  if (!s.end_date || s.end_date === s.date) return 0;
  const n = daysBetween(s.date, s.end_date);
  if (n < 0 || n > 1) fail('Overnight stops may end at most one day after they start');
  return n;
}

// Rejects any overlap with existing non-canceled stops or within the new batch. Back-to-back is fine.
async function assertNoOverlap(sr, venueId, ranges, excludeIds = new Set()) {
  if (!ranges.length) return;
  const minStart = Math.min(...ranges.map((r) => Date.parse(r.start_at)));
  const maxEnd = Math.max(...ranges.map((r) => Date.parse(r.end_at)));
  const existing = (await sr.entities.FoodTruckStop.filter({ venue_id: venueId, start_at: { $lt: iso(maxEnd) }, end_at: { $gt: iso(minStart) } }, 'start_at', 1000))
    .filter((s) => s.status !== 'canceled' && !excludeIds.has(s.id));
  const conflicts = [];
  ranges.forEach((r, i) => {
    const a = Date.parse(r.start_at), b = Date.parse(r.end_at);
    const hit = existing.some((s) => Date.parse(s.start_at) < b && effectiveEnd(s) > a)
      || ranges.some((o, j) => j !== i && Date.parse(o.start_at) < b && Date.parse(o.end_at) > a);
    if (hit) conflicts.push(r.local_date);
  });
  if (conflicts.length) fail(`This overlaps another stop on ${[...new Set(conflicts)].join(', ')}`, 409, { conflicts });
}

function recurrenceDates(date, rec) {
  if (!rec) return [date];
  const weekdays = new Set((rec.weekdays || []).map(Number));
  if (!weekdays.size) fail('Pick at least one weekday to repeat on');
  if (!DATE_RE.test(rec.until || '')) fail('A recurrence end date is required');
  if (rec.until < date) fail('Recurrence end date must be after the first stop');
  if (daysBetween(date, rec.until) > MAX_RECURRENCE_DAYS) fail('Recurrence can run at most 12 weeks at a time');
  const out = [];
  for (let d = date; d <= rec.until; d = addDays(d, 1)) if (weekdays.has(weekdayOf(d))) out.push(d);
  if (!out.length) fail('No dates match the selected weekdays');
  return out;
}

async function loadStop(sr, user, stopId) {
  const stop = await sr.entities.FoodTruckStop.get(stopId).catch(() => null);
  if (!stop) fail('Stop not found', 404);
  const venue = await authorize(sr, user, stop.venue_id);
  return { stop, venue };
}

// Occurrences affected by a "this and future" action. Past occurrences are always preserved.
async function futureTargets(sr, stop, now, includeExceptions) {
  if (!stop.series_id) return [stop];
  const series = await sr.entities.FoodTruckStop.filter({ series_id: stop.series_id }, 'start_at', 500);
  return series.filter((s) => s.id === stop.id || (s.local_date >= stop.local_date && s.status === 'scheduled'
    && Date.parse(s.start_at) > now && (includeExceptions || !s.is_exception)));
}

const CLEAR_STATUS = { confirmed_at: null, checked_in_at: null };
const changedOperationally = (a, b) => ['local_date', 'end_date', 'start_at', 'end_at', 'lat', 'lng', 'address', 'location_name'].some((k) => String(a[k] ?? '') !== String(b[k] ?? ''));

async function handle(base44, user, body) {
  const sr = base44.asServiceRole;
  const db = sr.entities.FoodTruckStop;
  const now = Date.now();
  const who = { updated_by_user_id: user.id };

  switch (body.action) {
    case 'geocode': {
      const q = String(body.query || '').trim();
      if (!q) fail('Enter an address to search');
      const hit = await geocodeAddress(Deno.env.get('GOOGLE_PLACES_API_KEY'), q);
      return { result: hit };
    }
    case 'create': {
      const venue = await authorize(sr, user, body.venue_id);
      if (body.request_id) {
        const dup = await db.filter({ venue_id: venue.id, request_id: String(body.request_id) });
        if (dup.length) return { stops: dup, duplicate: true };
      }
      const s = body.stop || {};
      const base = await validateBase(sr, venue, s);
      const span = spanOf(s);
      const dates = recurrenceDates(s.date, body.recurrence);
      const rows = dates.map((d) => ({ ...base, ...buildTimes(base, d, span) }));
      if (Date.parse(rows[rows.length - 1].end_at) <= now) fail('This stop is already in the past');
      const live = rows.filter((r) => Date.parse(r.end_at) > now);
      await assertNoOverlap(sr, venue.id, live);
      const series_id = body.recurrence ? crypto.randomUUID() : undefined;
      const created = await db.bulkCreate(live.map((r) => ({
        ...r, venue_id: venue.id, status: 'scheduled', series_id, request_id: body.request_id ? String(body.request_id) : undefined,
        created_by_user_id: user.id, ...who,
      })));
      return { stops: created };
    }
    case 'update': {
      const { stop, venue } = await loadStop(sr, user, body.stop_id);
      if (stop.status !== 'scheduled') fail('Canceled or finished stops cannot be edited');
      if (Date.parse(stop.end_at) <= now) fail('Past stops are kept as history and cannot be edited');
      const s = body.stop || {};
      const base = await validateBase(sr, venue, s);
      const span = spanOf(s);
      const scope = body.scope === 'future' && stop.series_id ? 'future' : 'this';
      const targets = scope === 'future' ? await futureTargets(sr, stop, now, false) : [stop];
      // Series-wide edits keep each occurrence on its own date; single edits may move the date.
      const plans = targets.map((t) => {
        const date = scope === 'future' && t.id !== stop.id ? t.local_date : (t.id === stop.id ? s.date : t.local_date);
        const next = { ...base, ...buildTimes(base, date, span) };
        if (scope === 'this' && t.series_id) next.is_exception = true;
        return { t, next: changedOperationally(t, next) ? { ...next, ...CLEAR_STATUS } : next };
      });
      await assertNoOverlap(sr, venue.id, plans.map((p) => p.next), new Set(targets.map((t) => t.id)));
      for (const p of plans) await db.update(p.t.id, { ...p.next, ...who });
      return { updated: plans.length, cleared_status: plans.some((p) => p.next.confirmed_at === null) };
    }
    case 'cancel': {
      const { stop } = await loadStop(sr, user, body.stop_id);
      if (stop.status !== 'scheduled') fail('This stop is already canceled or finished');
      const targets = body.scope === 'future' ? await futureTargets(sr, stop, now, true) : [stop];
      for (const t of targets) await db.update(t.id, { status: 'canceled', checked_in_at: null, ...who });
      return { canceled: targets.length };
    }
    case 'confirm': {
      const { stop } = await loadStop(sr, user, body.stop_id);
      if (stop.status !== 'scheduled' || Date.parse(stop.end_at) <= now) fail('Only upcoming or current stops can be confirmed');
      await db.update(stop.id, { confirmed_at: iso(now), ...who });
      return { ok: true };
    }
    case 'checkin': {
      const { stop, venue } = await loadStop(sr, user, body.stop_id);
      if (stop.status !== 'scheduled') fail('This stop is canceled or finished');
      if (Date.parse(stop.end_at) <= now) fail('This stop has already ended');
      const patch = { checked_in_at: iso(now), confirmed_at: stop.confirmed_at || iso(now), ...who };
      if (Date.parse(stop.start_at) > now) {
        if (!body.start_now) fail('This stop has not started yet', 409, { code: 'EARLY', start_at: stop.start_at });
        const startMs = Math.floor(now / 60000) * 60000;
        const lp = localParts(startMs, stop.timezone || DEFAULT_TZ);
        Object.assign(patch, { start_at: iso(startMs), start_time: lp.time, local_date: lp.date, is_exception: !!stop.series_id });
        await assertNoOverlap(sr, venue.id, [{ start_at: patch.start_at, end_at: stop.end_at, local_date: lp.date }], new Set([stop.id]));
      }
      await db.update(stop.id, patch);
      // Only notify fans on the first check-in for this stop.
      let notified = 0;
      let texted = 0;
      if (!stop.checked_in_at) {
        const favs = await sr.entities.Favorite.filter({ venue_id: venue.id }, '-created_date', 5000);
        notified = await pushToUsers(
          favs.map((f) => f.user_id || f.created_by_id),
          `${venue.name} is here!`,
          `Now serving at ${stop.location_name}. Come grab a bite!`,
          { venue_id: venue.id, deep_link: `https://happyhourflower.app/venue/${venue.id}` },
        ).catch(() => 0);
        const fanIds = [...new Set(favs.map((f) => f.user_id || f.created_by_id).filter(Boolean))];
        if (fanIds.length) {
          const profiles = await sr.entities.Profile.filter({ created_by_id: { $in: fanIds }, notif_sms: true });
          texted = await smsToPhones(
            profiles.map((p) => p.phone),
            `${venue.name} is here! Now serving at ${stop.location_name}. https://happyhourflower.app/venue/${venue.id} Reply STOP to opt out.`,
          ).catch(() => 0);
        }
      }
      return { ok: true, notified, texted };
    }
    case 'finish': {
      const { stop } = await loadStop(sr, user, body.stop_id);
      if (stop.status !== 'scheduled') fail('This stop is canceled or already finished');
      if (Date.parse(stop.start_at) > now) fail('This stop has not started — cancel it instead');
      if (Date.parse(stop.end_at) <= now) fail('This stop has already ended');
      const reason = body.reason === 'sold_out' ? 'sold_out' : 'finished_early';
      await db.update(stop.id, { status: 'finished', finished_at: iso(now), finish_reason: reason, checked_in_at: stop.checked_in_at, ...who });
      return { ok: true };
    }
    case 'copy_week': {
      const venue = await authorize(sr, user, body.venue_id);
      const tz = DEFAULT_TZ;
      const today = localParts(now, tz).date;
      const monday = addDays(today, -((weekdayOf(today) + 6) % 7));
      const from = addDays(monday, -7), to = addDays(monday, -1);
      const [source, items] = await Promise.all([
        db.filter({ venue_id: venue.id, local_date: { $gte: from, $lte: to } }, 'start_at', 200),
        sr.entities.HappyHourItem.filter({ venue_id: venue.id }),
      ]);
      const validItems = new Set(items.map((i) => i.id));
      const plans = source.filter((s) => s.status !== 'canceled').map((s) => {
        const base = { location_name: s.location_name, address: s.address, lat: s.lat, lng: s.lng, timezone: s.timezone || tz, instructions: s.instructions || '', start_time: s.start_time, end_time: s.end_time, special_ids: (s.special_ids || []).filter((id) => validItems.has(id)) };
        return { ...base, ...buildTimes(base, addDays(s.local_date, 7), s.end_date ? daysBetween(s.local_date, s.end_date) : 0) };
      });
      const existing = plans.length ? (await db.filter({ venue_id: venue.id, local_date: { $gte: addDays(from, 6), $lte: addDays(to, 8) } }, 'start_at', 300)).filter((s) => s.status !== 'canceled') : [];
      const preview = plans.map((p, i) => {
        const a = Date.parse(p.start_at), b = Date.parse(p.end_at);
        const conflict = existing.some((s) => Date.parse(s.start_at) < b && effectiveEnd(s) > a) || plans.some((o, j) => j < i && Date.parse(o.start_at) < b && Date.parse(o.end_at) > a);
        return { ...p, conflict, past: b <= now };
      });
      if (!body.commit) return { source_week: { from, to }, preview };
      if (body.request_id) {
        const dup = await db.filter({ venue_id: venue.id, request_id: String(body.request_id) });
        if (dup.length) return { stops: dup, duplicate: true };
      }
      const ok = preview.filter((p) => !p.conflict && !p.past).map(({ conflict, past, ...p }) => ({
        ...p, venue_id: venue.id, status: 'scheduled', request_id: body.request_id ? String(body.request_id) : undefined, created_by_user_id: user.id, ...who,
      }));
      const created = ok.length ? await db.bulkCreate(ok) : [];
      return { stops: created, skipped: preview.length - ok.length };
    }
    default:
      fail('Unknown action');
  }
}

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user) return Response.json({ error: 'Please sign in' }, { status: 401 });
    const body = await req.json().catch(() => ({}));
    return Response.json(await handle(base44, user, body));
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;
    return Response.json({ error: error.message, ...(error.extra || {}) }, { status });
  }
}