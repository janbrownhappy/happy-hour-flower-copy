// Build a Google Calendar "add event" template URL (no OAuth — opens user's own calendar prefilled).
// Times like "4:00 PM" / "16:00" / "4 PM" are parsed loosely.

const DAY_TO_INDEX = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
const DAY_TO_RRULE = { Sun: 'SU', Mon: 'MO', Tue: 'TU', Wed: 'WE', Thu: 'TH', Fri: 'FR', Sat: 'SA' };

// Parse a human time string into { h, m } in 24h. Returns null if unparseable.
function parseTime(str) {
  if (!str) return null;
  const m = String(str).trim().match(/^(\d{1,2})(?::(\d{2}))?\s*([ap]\.?m\.?)?$/i);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const min = m[2] ? parseInt(m[2], 10) : 0;
  const ampm = m[3]?.toLowerCase().replace(/\./g, '');
  if (ampm === 'pm' && h < 12) h += 12;
  if (ampm === 'am' && h === 12) h = 0;
  if (h > 23 || min > 59) return null;
  return { h, m: min };
}

// Find the next date (>= today) matching the given weekday short name (e.g. "Fri").
function nextDateForDay(dayName) {
  const target = DAY_TO_INDEX[dayName];
  const now = new Date();
  const diff = (target - now.getDay() + 7) % 7;
  const d = new Date(now);
  d.setDate(now.getDate() + diff);
  return d;
}

// Format a Date + {h,m} into Google's local datetime format: YYYYMMDDTHHMMSS
function fmt(date, time) {
  const y = date.getFullYear();
  const mo = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const hh = String(time.h).padStart(2, '0');
  const mm = String(time.m).padStart(2, '0');
  return `${y}${mo}${d}T${hh}${mm}00`;
}

/**
 * Build a Google Calendar add-event URL for a venue's happy hour on a given day.
 * @param {Object} opts
 * @param {string} opts.venueName
 * @param {string} opts.day - short weekday name, e.g. "Fri"
 * @param {string} opts.start - start time string
 * @param {string} opts.end - end time string
 * @param {string[]} [opts.deals] - deal lines for the description
 * @param {string} [opts.address]
 * @param {string[]} [opts.recurringDays] - if provided, event repeats weekly on these days
 * @returns {string|null} the URL, or null if times can't be parsed
 */
export function buildGoogleCalendarUrl({ venueName, day, start, end, deals = [], address = '', recurringDays = [] }) {
  const startT = parseTime(start);
  const endT = parseTime(end);
  if (!startT || !day || !(day in DAY_TO_INDEX)) return null;

  const date = nextDateForDay(day);
  const startStr = fmt(date, startT);
  // Default end = start + 1h if end missing/invalid
  const effectiveEnd = endT || { h: (startT.h + 1) % 24, m: startT.m };
  const endStr = fmt(date, effectiveEnd);

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: `Happy Hour at ${venueName}`,
    dates: `${startStr}/${endStr}`,
  });

  const descParts = [`Happy hour at ${venueName}.`];
  if (deals.length) descParts.push('\nDeals:\n' + deals.map(d => `• ${d}`).join('\n'));
  params.set('details', descParts.join('\n'));
  if (address) params.set('location', address);

  // Weekly recurrence on the venue's happy-hour days
  const rruleDays = recurringDays.map(d => DAY_TO_RRULE[d]).filter(Boolean);
  if (rruleDays.length) {
    params.set('recur', `RRULE:FREQ=WEEKLY;BYDAY=${rruleDays.join(',')}`);
  }

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

// Resolve the start/end Date objects and description shared by all calendar formats.
function resolveEvent({ venueName, day, start, end, deals = [], address = '' }) {
  const startT = parseTime(start);
  if (!startT || !day || !(day in DAY_TO_INDEX)) return null;

  const date = nextDateForDay(day);
  const effectiveEnd = parseTime(end) || { h: (startT.h + 1) % 24, m: startT.m };

  const startDate = new Date(date);
  startDate.setHours(startT.h, startT.m, 0, 0);
  const endDate = new Date(date);
  endDate.setHours(effectiveEnd.h, effectiveEnd.m, 0, 0);
  // Handle end time past midnight (e.g. 11 PM – 1 AM)
  if (endDate <= startDate) endDate.setDate(endDate.getDate() + 1);

  const descParts = [`Happy hour at ${venueName}.`];
  if (deals.length) descParts.push('\nDeals:\n' + deals.map(d => `• ${d}`).join('\n'));

  return {
    title: `Happy Hour at ${venueName}`,
    description: descParts.join('\n'),
    location: address,
    startDate,
    endDate,
  };
}

// Format a Date into UTC iCal stamp: YYYYMMDDTHHMMSSZ
function fmtUTC(date) {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

/**
 * Build an Outlook / Microsoft 365 "compose event" deep link.
 * @param {boolean} [opts.office365] - use the office.com host (M365) instead of live.com (personal Outlook)
 */
export function buildOutlookCalendarUrl({ venueName, day, start, end, deals = [], address = '', office365 = false }) {
  const ev = resolveEvent({ venueName, day, start, end, deals, address });
  if (!ev) return null;

  const params = new URLSearchParams({
    path: '/calendar/action/compose',
    rru: 'addevent',
    subject: ev.title,
    body: ev.description,
    location: ev.location || '',
    startdt: ev.startDate.toISOString(),
    enddt: ev.endDate.toISOString(),
  });

  const host = office365 ? 'https://outlook.office.com' : 'https://outlook.live.com';
  return `${host}/calendar/0/deeplink/compose?${params.toString()}`;
}

/**
 * Build a downloadable ICS data URL (works with Apple Calendar / iOS, and any
 * calendar app that imports .ics). Supports weekly recurrence.
 */
export function buildIcsDataUrl({ venueName, day, start, end, deals = [], address = '', recurringDays = [] }) {
  const ev = resolveEvent({ venueName, day, start, end, deals, address });
  if (!ev) return null;

  const esc = (s) => String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//HappyHourFlower//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${Date.now()}@happyhourflower`,
    `DTSTAMP:${fmtUTC(new Date())}`,
    `DTSTART:${fmtUTC(ev.startDate)}`,
    `DTEND:${fmtUTC(ev.endDate)}`,
    `SUMMARY:${esc(ev.title)}`,
    `DESCRIPTION:${esc(ev.description)}`,
  ];
  if (ev.location) lines.push(`LOCATION:${esc(ev.location)}`);

  const rruleDays = recurringDays.map(d => DAY_TO_RRULE[d]).filter(Boolean);
  if (rruleDays.length) lines.push(`RRULE:FREQ=WEEKLY;BYDAY=${rruleDays.join(',')}`);

  lines.push('END:VEVENT', 'END:VCALENDAR');

  return `data:text/calendar;charset=utf-8,${encodeURIComponent(lines.join('\r\n'))}`;
}