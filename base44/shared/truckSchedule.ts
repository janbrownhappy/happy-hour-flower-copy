// Shared food-truck schedule logic used by the 864FoodTrucks ingest webhook and
// the weekly owner-confirmation email.
//
// A truck's location is date-specific: one appearance per calendar date, so a
// truck that moves every day simply has one entry per day. Ingested appearances
// arrive UNCONFIRMED — the owner confirms (or corrects) them before consumers
// ever see the truck on the map.

export const FEED_SOURCE = '864foodtrucks';
export const OWNER_SOURCE = 'owner';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const normName = (s) =>
  String(s || '')
    .toLowerCase()
    .replace(/\b(food ?truck|truck|llc|the)\b/g, '')
    .replace(/[^a-z0-9]/g, '');

export const normPhone = (s) => String(s || '').replace(/\D/g, '').slice(-10);

export const normHost = (s) => {
  const m = String(s || '').toLowerCase().match(/^(?:https?:\/\/)?(?:www\.)?([^/?#]+)/);
  return m ? m[1] : '';
};

// Accepts "2026-09-25", "9/25/2026", "Sept 25 2026" — returns YYYY-MM-DD or ''.
export function toIsoDate(raw) {
  const s = String(raw || '').trim();
  if (!s) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const parsed = new Date(`${s} 12:00:00 UTC`);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toISOString().slice(0, 10);
}

// Midday UTC parse keeps the weekday stable regardless of server timezone.
export function dayLabel(isoDate) {
  if (!isoDate) return '';
  const d = new Date(`${isoDate}T12:00:00Z`);
  return Number.isNaN(d.getTime()) ? '' : DAY_LABELS[d.getUTCDay()];
}

export function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function addDaysIso(isoDate, days) {
  const d = new Date(`${isoDate}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// Appearances from today through `days` ahead, soonest first.
export function upcomingAppearances(venue, days = 7) {
  const from = todayIso();
  const to = addDaysIso(from, days);
  return (venue?.truck_schedule || [])
    .filter((a) => a?.date && a.date >= from && a.date <= to)
    .sort((a, b) => String(a.date).localeCompare(String(b.date)));
}

// Geocode a parking spot to coordinates via Places (New) Text Search.
// Returns null on any failure — a missing pin must never fail the whole ingest.
export async function geocodeAddress(apiKey, query) {
  if (!apiKey || !query) return null;
  try {
    const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'places.location,places.formattedAddress',
      },
      body: JSON.stringify({ textQuery: query, maxResultCount: 1 }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const place = (data.places || [])[0];
    if (typeof place?.location?.latitude !== 'number') return null;
    return {
      lat: place.location.latitude,
      lng: place.location.longitude,
      formatted: place.formattedAddress || '',
    };
  } catch {
    return null;
  }
}

// Index existing venues so each feed row can be matched without a query per row.
export function buildVenueIndex(venues) {
  const byName = new Map();
  const byPhone = new Map();
  const byHost = new Map();
  for (const v of venues) {
    const n = normName(v.name);
    if (n && !byName.has(n)) byName.set(n, v);
    const p = normPhone(v.phone);
    if (p.length === 10 && !byPhone.has(p)) byPhone.set(p, v);
    const h = normHost(v.website);
    if (h && !byHost.has(h)) byHost.set(h, v);
  }
  return { byName, byPhone, byHost };
}

export function matchVenue(index, row) {
  const phone = normPhone(row.phone);
  if (phone.length === 10 && index.byPhone.has(phone)) return index.byPhone.get(phone);
  const name = normName(row.truck_name || row.name);
  if (name && index.byName.has(name)) return index.byName.get(name);
  const host = normHost(row.website);
  if (host && index.byHost.has(host)) return index.byHost.get(host);
  return null;
}

// Feed rows replace same-date feed entries but never overwrite an appearance the
// owner entered or already confirmed — owner-managed data always wins.
export function mergeAppearances(existing, incoming) {
  const incomingDates = new Set(incoming.map((a) => a.date));
  const kept = (existing || []).filter((a) => {
    if (!a?.date) return false;
    if (!incomingDates.has(a.date)) return true;
    return a.source === OWNER_SOURCE || a.confirmed === true;
  });
  const keptDates = new Set(kept.map((a) => a.date));
  const added = incoming.filter((a) => !keptDates.has(a.date));
  return {
    schedule: [...kept, ...added].sort((a, b) => String(a.date).localeCompare(String(b.date))),
    added: added.length,
    preserved: incoming.length - added.length,
  };
}

// One feed row → one appearance object (coords filled in by the caller).
export function buildAppearance(row, coords) {
  const date = toIsoDate(row.date);
  return {
    date,
    day: dayLabel(date),
    location_name: String(row.location_name || row.venue || '').trim(),
    address: coords?.formatted || String(row.address || '').trim(),
    lat: coords?.lat ?? null,
    lng: coords?.lng ?? null,
    start_time: String(row.start_time || '').trim(),
    end_time: String(row.end_time || '').trim(),
    source: FEED_SOURCE,
    confirmed: false,
  };
}