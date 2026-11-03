// Parsing + mapping helpers for the enriched venue prospect CSV.
import { VALID_AMENITY_SLUGS } from './amenityCatalog.ts';

// RFC4180-ish CSV parser (handles quoted fields, embedded commas/newlines/quotes).
export function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  const src = String(text || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (inQuotes) {
      if (c === '"') {
        if (src[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(field); field = '';
    } else if (c === '\n') {
      row.push(field); field = '';
      if (row.some((v) => String(v).trim() !== '')) rows.push(row);
      row = [];
    } else field += c;
  }
  row.push(field);
  if (row.some((v) => String(v).trim() !== '')) rows.push(row);

  if (!rows.length) return [];
  const header = rows[0].map((h) => String(h).trim().replace(/^"+|"+$/g, ''));
  return rows.slice(1).map((r) => {
    const obj = {};
    header.forEach((h, idx) => { obj[h] = (r[idx] || '').trim(); });
    return obj;
  });
}

// 'N/A' and blanks both mean "no data".
export function val(v) {
  const s = String(v || '').trim();
  const lower = s.toLowerCase();
  if (!s || lower === 'n/a' || lower === 'na' || lower === 'none' || lower === 'null' || lower === 'undefined' || s === '-') return '';
  return s;
}

export const normName = (s) =>
  String(s || '').toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, ' ').trim();

export function slugify(s) {
  return String(s || '').toLowerCase().replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 70);
}

// CSV taxonomy slugs (hyphenated) → app VenueType slugs (underscored).
const VENUE_TYPE_MAP = {
  'brewery-taproom': ['brewery', 'taproom'],
  'brewery': ['brewery'],
  'brewpub': ['brewery', 'gastropub'],
  'brew-pub': ['brewery', 'gastropub'],
  'taproom': ['taproom'],
  'distillery': ['distillery'],
  'cocktail-bar': ['cocktail_bar'],
  'dive-bar': ['dive_bar'],
  'sports-bar': ['sports_bar'],
  'wine-bar': ['wine_bar'],
  'lounge': ['lounge'],
  'speakeasy': ['speakeasy'],
  'nightclub': ['nightclub'],
  'night-club': ['nightclub'],
  'neighborhood-bar-pub': ['gastropub'],
  'gastropub': ['gastropub'],
  'full-service-casual': ['full_service_casual'],
  'fine-dining': ['fine_dining'],
  'fast-casual': ['fast_casual'],
  'cafe-coffee': ['cafe_coffee'],
  'cafe': ['cafe_coffee'],
  'coffee-shop': ['cafe_coffee'],
  'food-hall': ['food_hall'],
  'food-truck': ['fast_casual'],
  'bakery': ['cafe_coffee'],
  'hotel-bar': ['lounge'],
  'winery-tasting-room': ['wine_bar'],
  'winery': ['wine_bar'],
  'pizzeria': ['full_service_casual'],
  'steakhouse': ['fine_dining'],
  'sushi-bar': ['full_service_casual'],
  'juice-smoothie': ['cafe_coffee'],
  'ice-cream-dessert': ['cafe_coffee'],
  'deli': ['fast_casual'],
};

const CUISINE_MAP = {
  'japanese': 'japanese_sushi',
  'sushi': 'japanese_sushi',
  'japanese-sushi': 'japanese_sushi',
  'spanish': 'spanish_tapas',
  'tapas': 'spanish_tapas',
  'spanish-tapas': 'spanish_tapas',
  'cajun': 'cajun_creole',
  'creole': 'cajun_creole',
  'cajun-creole': 'cajun_creole',
  'tex-mex': 'tex_mex',
  'latin': 'latin_american',
  'latin-american': 'latin_american',
  'middle-eastern': 'middle_eastern',
  'pizza': 'italian',
  'seafood': 'american',
  'steakhouse': 'american',
  'bar-food': 'american',
  'breakfast': 'american',
  'sandwiches': 'american',
  'wings': 'american',
  'burgers': 'american',
  'asian': 'chinese',
  'asian-fusion': 'chinese',
};

export function mapVenueTypeSlugs(raw) {
  const out = [];
  const unmapped = [];
  for (const part of String(raw || '').split(/[,|]/)) {
    const key = val(part).toLowerCase();
    if (!key) continue;
    const mapped = VENUE_TYPE_MAP[key] || (key.includes('-') ? VENUE_TYPE_MAP[key.replace(/-/g, '_')] : null);
    if (mapped) mapped.forEach((s) => { if (!out.includes(s)) out.push(s); });
    else unmapped.push(key);
  }
  return { slugs: out, unmapped };
}

export function mapCuisineSlugs(raw) {
  const out = [];
  const unmapped = [];
  for (const part of String(raw || '').split(/[,|]/)) {
    const key = val(part).toLowerCase();
    if (!key) continue;
    const mapped = CUISINE_MAP[key] || key.replace(/-/g, '_');
    if (!out.includes(mapped)) out.push(mapped);
    if (!CUISINE_MAP[key]) unmapped.push(key);
  }
  return { slugs: out, unmapped };
}

export function mapAmenitySlugs(raw) {
  const out = [];
  const dropped = [];
  for (const part of String(raw || '').split(/[,|]/)) {
    const key = val(part).toLowerCase().replace(/-/g, '_');
    if (!key) continue;
    if (VALID_AMENITY_SLUGS.has(key) && !out.includes(key)) out.push(key);
    else if (!VALID_AMENITY_SLUGS.has(key)) dropped.push(key);
  }
  return { slugs: out, dropped };
}

const DAY_KEYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DAY_ALIASES = {
  mon: 'Mon', monday: 'Mon', tue: 'Tue', tues: 'Tue', tuesday: 'Tue', wed: 'Wed', weds: 'Wed',
  wednesday: 'Wed', thu: 'Thu', thur: 'Thu', thurs: 'Thu', thursday: 'Thu', fri: 'Fri',
  friday: 'Fri', sat: 'Sat', saturday: 'Sat', sun: 'Sun', sunday: 'Sun',
};

// 'Tue,Wed,Thu,Fri' | 'Daily' | 'Mon-Fri' | 'Tue-Sat' → ['Tue','Wed',...]
export function parseHappyHourDays(raw) {
  const text = val(raw);
  if (!text) return [];
  if (/daily|every ?day|all week|7 days/i.test(text)) return [...DAY_KEYS];
  const out = [];
  for (const chunk of text.split(/[,;/]|\band\b/i)) {
    const piece = chunk.trim();
    if (!piece) continue;
    const range = piece.match(/^([A-Za-z]+)\s*(?:-|–|—|through|thru|to)\s*([A-Za-z]+)$/);
    if (range) {
      const a = DAY_ALIASES[range[1].toLowerCase()];
      const b = DAY_ALIASES[range[2].toLowerCase()];
      if (a && b) {
        let i = DAY_KEYS.indexOf(a);
        const end = DAY_KEYS.indexOf(b);
        for (let n = 0; n < 7; n++) {
          if (!out.includes(DAY_KEYS[i])) out.push(DAY_KEYS[i]);
          if (i === end) break;
          i = (i + 1) % 7;
        }
        continue;
      }
    }
    const single = DAY_ALIASES[piece.toLowerCase().replace(/[^a-z]/g, '')];
    if (single && !out.includes(single)) out.push(single);
  }
  return DAY_KEYS.filter((d) => out.includes(d));
}

function to12Hour(hhmm) {
  const m = String(hhmm).match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return String(hhmm).trim();
  let h = Number(m[1]);
  const suffix = h >= 12 ? 'PM' : 'AM';
  if (h === 0) h = 12; else if (h > 12) h -= 12;
  return `${h}:${m[2]} ${suffix}`;
}

// '16:00-18:00' → { start: '4:00 PM', end: '6:00 PM' }
export function parseHappyHourTimes(raw) {
  const text = val(raw);
  if (!text) return { start: '', end: '' };
  const first = text.split(/[,;]/)[0].trim();
  const parts = first.split(/\s*(?:-|–|—|to)\s*/);
  if (parts.length < 2) return { start: to12Hour(parts[0] || ''), end: '' };
  return { start: to12Hour(parts[0]), end: to12Hour(parts[1]) };
}

// Free-text happy hour details → individual deal strings.
export function parseDeals(raw) {
  const text = val(raw);
  if (!text) return [];
  return text
    .split(/;|,(?![^()]*\))/)
    .map((d) => d.trim().replace(/^and\s+/i, ''))
    .filter((d) => d.length > 2)
    .slice(0, 12);
}

export function buildVenuePayload(row) {
  const name = val(row.Company);
  const website = val(row.website_corrected) || val(row.website);
  const days = parseHappyHourDays(row.happy_hour_days);
  const { start, end } = parseHappyHourTimes(row.happy_hour_times);
  const deals = parseDeals(row.happy_hour_details);
  const photo = val(row.photo_url);
  const photoOk = photo && /^https?:\/\//i.test(photo) && val(row.photo_verified).toLowerCase() === 'ok';

  const daySchedules = {};
  const dealsByDay = {};
  days.forEach((d) => {
    daySchedules[d] = { start, end };
    if (deals.length) dealsByDay[d] = deals;
  });

  const payload = {
    name,
    address: val(row['Address 1']),
    city: val(row.City),
    state_code: val(row.State).toUpperCase(),
    zip_code: val(row.Zip),
    phone: val(row.Phone),
    website,
    description: val(row.description),
    facebook_url: val(row.facebook),
    instagram_url: val(row.instragram) || val(row.instagram),
    tiktok_url: val(row.tiktok),
    threads_url: val(row.Threads),
    days,
    day_schedules: daySchedules,
    deals,
    deals_by_day: dealsByDay,
    happy_hour_start: start,
    happy_hour_end: end,
    photo_urls: photoOk ? [photo] : [],
    subscription_tier: 'free',
    billing_status: 'active',
    status: val(row.fit_for_hhf).toLowerCase() === 'no' ? 'draft' : 'active',
    verification_status: 'unclaimed',
  };

  // Don't write empty strings over values that may already exist on a record.
  Object.keys(payload).forEach((k) => {
    const v = payload[k];
    if (v === '' || (Array.isArray(v) && !v.length)) delete payload[k];
  });
  payload.name = name;
  payload.subscription_tier = 'free';
  return payload;
}