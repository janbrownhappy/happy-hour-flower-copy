// Time-of-day filtering. This is a SEPARATE axis from the day-of-week pills:
// "Tuesday" says which day, a time bucket says when during that day.
// Every value here is DERIVED from the venue's own schedule
// (happy_hour_start / happy_hour_end / day_schedules) — never tagged by hand.

export const TIME_BUCKETS = [
  { id: 'brunch', label: 'Brunch', startMin: 10 * 60, endMin: 14 * 60 },
  { id: 'afternoon', label: 'Afternoon', startMin: 14 * 60, endMin: 16 * 60 },
  { id: 'after_work', label: 'After work', startMin: 16 * 60, endMin: 19 * 60 },
  { id: 'evening', label: 'Evening', startMin: 19 * 60, endMin: 22 * 60 },
  { id: 'late_night', label: 'Late night', startMin: 22 * 60, endMin: 27 * 60 },
];

// Parses "17:00", "5:00 PM", "5pm" → minutes since midnight. Null when unparseable.
export function toMinutes(value) {
  if (!value) return null;
  const raw = String(value).trim().toLowerCase();
  const m = raw.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/);
  if (!m) return null;
  let hour = Number(m[1]);
  const mins = Number(m[2] || 0);
  const suffix = m[3];
  if (suffix === 'pm' && hour < 12) hour += 12;
  if (suffix === 'am' && hour === 12) hour = 0;
  if (!Number.isFinite(hour) || hour > 27) return null;
  return hour * 60 + mins;
}

// Returns { startMin, endMin } for a venue on a given day, or null when unknown.
// An end earlier than the start means the window runs past midnight, so it is
// extended (e.g. 22:00 → 01:00 becomes 1320 → 1500).
export function scheduleForDay(venue, day) {
  const perDay = venue?.day_schedules?.[day];
  const start = toMinutes(perDay?.start ?? perDay?.happy_hour_start ?? venue?.happy_hour_start);
  let end = toMinutes(perDay?.end ?? perDay?.happy_hour_end ?? venue?.happy_hour_end);
  if (start == null || end == null) return null;
  if (end <= start) end += 24 * 60;
  return { startMin: start, endMin: end };
}

// Which buckets a venue's happy hour on `day` overlaps.
export function venueTimeBuckets(venue, day) {
  const window = scheduleForDay(venue, day);
  if (!window) return [];
  return TIME_BUCKETS
    .filter(b => window.startMin < b.endMin && window.endMin > b.startMin)
    .map(b => b.id);
}

// True when the venue's happy hour for `day` covers `nowMin` minutes-since-midnight.
export function isHappeningNow(venue, day, nowMin) {
  const window = scheduleForDay(venue, day);
  if (!window) return false;
  if (nowMin >= window.startMin && nowMin < window.endMin) return true;
  // A window running past midnight also covers the small hours of the same clock day.
  return nowMin + 24 * 60 >= window.startMin && nowMin + 24 * 60 < window.endMin;
}

export const DAY_KEYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function currentDayKey(now = new Date()) {
  return DAY_KEYS[now.getDay()];
}

export function currentMinutes(now = new Date()) {
  return now.getHours() * 60 + now.getMinutes();
}