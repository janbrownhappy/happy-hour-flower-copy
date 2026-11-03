// Shared helpers for detecting and merging duplicate Venue records.
// Duplicates = same normalized street address (+ city) AND similar name.

const SUFFIXES = {
  street: 'st', str: 'st', avenue: 'ave', av: 'ave', road: 'rd', boulevard: 'blvd',
  lane: 'ln', drive: 'dr', place: 'pl', court: 'ct', highway: 'hwy', parkway: 'pkwy',
  terrace: 'ter', circle: 'cir', square: 'sq', trail: 'trl', north: 'n', south: 's',
  east: 'e', west: 'w', northeast: 'ne', northwest: 'nw', southeast: 'se', southwest: 'sw',
};

const SUITE_RE = /\b(?:suite|ste|unit|apt|apartment|bldg|building|#)\s*\.?\s*([a-z0-9-]+)\b/gi;

// Returns { street, suite } — the street part with the suite removed, plus the suite token.
export function normalizeAddress(raw) {
  if (!raw) return { street: '', suite: '' };
  // Drop anything after the first comma (city/state/zip tails).
  let s = String(raw).split(',')[0].toLowerCase();
  let suite = '';
  s = s.replace(SUITE_RE, (_m, tok) => { suite = String(tok).toLowerCase(); return ' '; });
  s = s.replace(/[.\-]/g, ' ').replace(/[^a-z0-9\s]/g, ' ');
  const street = s
    .split(/\s+/)
    .filter(Boolean)
    .map((t) => SUFFIXES[t] || t)
    .join(' ')
    .trim();
  return { street, suite };
}

const NAME_STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'of', 'at', 'on', 'in', 'restaurant', 'restaurants', 'bar', 'bars',
  'grill', 'grille', 'kitchen', 'cafe', 'caf', 'sports', 'co', 'company', 'inc', 'llc',
  'tavern', 'pub', 'house', 'eatery', 'lounge', 'taproom', 'brewery', 'brewing', 'bistro',
  'downtown', 'greenville', 'sc',
]);

export function nameTokens(raw) {
  return new Set(
    String(raw || '')
      .toLowerCase()
      .replace(/['’`]/g, '')
      .replace(/&/g, ' ')
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((t) => t && !NAME_STOPWORDS.has(t))
  );
}

// True when two names look like the same business.
export function namesMatch(a, b) {
  const ta = nameTokens(a);
  const tb = nameTokens(b);
  if (!ta.size || !tb.size) return false;
  const inter = [...ta].filter((t) => tb.has(t));
  if (!inter.length) return false;
  // One name's significant tokens fully contained in the other ("Bohemian Bull" ⊂ "Bohemian Bull Sports Bar")
  const smaller = ta.size <= tb.size ? ta : tb;
  if (inter.length === smaller.size) return true;
  const union = new Set([...ta, ...tb]).size;
  return inter.length / union >= 0.5;
}

const compactName = (raw) => [...nameTokens(raw)].join('');
export const phoneKey = (p) => String(p || '').replace(/\D/g, '').slice(-10);

function bigramDice(a, b) {
  if (a.length < 2 || b.length < 2) return 0;
  const grams = (s) => { const m = new Map(); for (let i = 0; i < s.length - 1; i++) { const g = s.slice(i, i + 2); m.set(g, (m.get(g) || 0) + 1); } return m; };
  const ga = grams(a), gb = grams(b);
  let hit = 0;
  for (const [g, n] of ga) hit += Math.min(n, gb.get(g) || 0);
  return (2 * hit) / (a.length - 1 + b.length - 1);
}

// Looser check used within one address: spacing variants ("Blue Fin"/"Bluefin"),
// and — when both share a phone — close misspellings ("Ottaray"/"Ottary").
export function venuesLookSame(a, b) {
  if (namesMatch(a.name, b.name)) return true;
  const ca = compactName(a.name), cb = compactName(b.name);
  if (ca.length >= 4 && cb.length >= 4 && (ca.includes(cb) || cb.includes(ca))) return true;
  const pa = phoneKey(a.phone);
  return pa.length === 10 && pa === phoneKey(b.phone) && bigramDice(ca, cb) >= 0.6;
}

const SOCIALS = ['facebook_url', 'instagram_url', 'tiktok_url', 'threads_url', 'youtube_url', 'x_url'];

// Higher = more complete. counts = { items, amenities } for this venue.
export function completenessScore(v, counts = {}) {
  let s = 0;
  if (Number(v.rating) > 0) s += 6;
  if (Number(v.review_count) > 0) s += 4;
  s += Math.min((v.photo_urls || []).length, 5) * 3;
  if (v.day_schedules && Object.keys(v.day_schedules).length) s += 8;
  if (v.happy_hour_start) s += 3;
  if ((v.days || []).length) s += 2;
  if ((v.deals || []).length) s += 3;
  if (v.deals_by_day && Object.keys(v.deals_by_day).length) s += 5;
  s += Math.min(counts.items || 0, 12) * 2;
  s += Math.min(counts.amenities || 0, 15);
  if (v.phone) s += 4;
  if (v.website) s += 4;
  if (v.address) s += 2;
  if (v.contacts_verified) s += 5;
  if (v.description && v.description.length > 40) s += 5;
  s += SOCIALS.filter((f) => v[f]).length * 2;
  if ((v.venue_type_ids || []).length) s += 3;
  if ((v.cuisine_ids || []).length) s += 3;
  if (Number(v.lat) && Number(v.lng)) s += 2;
  s += Math.min(Number(v.view_count) || 0, 50) / 10;
  s += Math.min(Number(v.favorite_count) || 0, 50) / 5;
  if (v.owner_id) s += 15;
  if (v.verification_status === 'verified') s += 10;
  if (v.subscription_tier === 'premium') s += 8;
  if (v.subscription_tier === 'platinum') s += 12;
  if (v.full_enrichment_at) s += 2;
  return Math.round(s * 10) / 10;
}

const SCALAR_MERGE_FIELDS = [
  'address', 'city', 'zip_code', 'neighborhood', 'area', 'area_id', 'market_id', 'market_name',
  'state_code', 'state_id', 'category', 'price_level', 'lat', 'lng', 'w3w_address',
  'phone', 'website', 'description', 'happy_hour_start', 'happy_hour_end',
  'reservation_policy', 'brand_id', 'brand_name', 'owner_id', 'full_enrichment_at',
  ...SOCIALS,
];
const ARRAY_MERGE_FIELDS = ['photo_urls', 'deals', 'tags', 'days', 'venue_type_ids', 'cuisine_ids', 'editor_ids'];
const OBJECT_MERGE_FIELDS = ['day_schedules', 'deals_by_day', 'premium_deals_by_day'];
const MAX_MERGE_FIELDS = ['rating', 'review_count', 'view_count', 'favorite_count'];

const isEmpty = (val) => {
  if (val === null || val === undefined || val === '') return true;
  if (Array.isArray(val)) return val.length === 0;
  if (typeof val === 'object') return Object.keys(val).length === 0;
  return false;
};

// Builds the patch to apply to the survivor from its duplicates. Never overwrites
// a non-empty survivor value; arrays are unioned, numbers take the max.
export function buildMergePatch(survivor, duplicates) {
  const patch = {};
  const current = (f) => (f in patch ? patch[f] : survivor[f]);

  for (const dup of duplicates) {
    for (const f of SCALAR_MERGE_FIELDS) {
      if (isEmpty(current(f)) && !isEmpty(dup[f])) patch[f] = dup[f];
    }
    for (const f of ARRAY_MERGE_FIELDS) {
      const merged = [...new Set([...(current(f) || []), ...(dup[f] || [])])];
      if (merged.length > (current(f) || []).length) patch[f] = merged;
    }
    for (const f of OBJECT_MERGE_FIELDS) {
      const base = current(f) || {};
      const add = dup[f] || {};
      let changed = false;
      const merged = { ...base };
      for (const k of Object.keys(add)) {
        if (isEmpty(merged[k]) && !isEmpty(add[k])) { merged[k] = add[k]; changed = true; }
      }
      if (changed) patch[f] = merged;
    }
    for (const f of MAX_MERGE_FIELDS) {
      const a = Number(current(f)) || 0;
      const b = Number(dup[f]) || 0;
      if (b > a) patch[f] = b;
    }
    if (survivor.verification_status !== 'verified' && dup.verification_status === 'verified') {
      patch.verification_status = 'verified';
    }
  }
  return patch;
}

// Groups venues into duplicate clusters. counts: { [venueId]: {items, amenities} }
export function findDuplicateClusters(venues, counts = {}) {
  const byAddress = new Map();
  for (const v of venues) {
    const { street, suite } = normalizeAddress(v.address);
    if (!street) continue;
    // Keyed by street only; city is checked per-pair so a blank city still matches.
    const key = street;
    if (!byAddress.has(key)) byAddress.set(key, []);
    byAddress.get(key).push({ ...v, __suite: suite });
  }

  const clusters = [];
  for (const [key, group] of byAddress) {
    if (group.length < 2) continue;
    // Within one address, split into name-similarity clusters.
    const buckets = [];
    for (const v of group) {
      // A stated suite that differs from another record's stated suite = different business.
      const suiteOk = (m) => !m.__suite || !v.__suite || m.__suite === v.__suite;
      const city = (x) => (x.city || '').toLowerCase().trim();
      const cityOk = (m) => !city(m) || !city(v) || city(m) === city(v);
      const bucket = buckets.find((b) => b.some((m) => suiteOk(m) && cityOk(m) && venuesLookSame(m, v)));
      if (bucket) bucket.push(v);
      else buckets.push([v]);
    }
    for (const bucket of buckets) {
      if (bucket.length < 2) continue;
      const scored = bucket
        .map((v) => ({ venue: v, score: completenessScore(v, counts[v.id] || {}) }))
        .sort((a, b) => {
          if (b.score !== a.score) return b.score - a.score;
          return new Date(a.venue.created_date || 0) - new Date(b.venue.created_date || 0);
        });
      const survivor = scored[0].venue;
      const duplicates = scored.slice(1).map((s) => s.venue);
      clusters.push({
        cluster_id: survivor.id,
        address_key: key,
        matched_address: survivor.address || '',
        city: survivor.city || '',
        survivor: {
          id: survivor.id, name: survivor.name, score: scored[0].score,
          address: survivor.address || '', status: survivor.status,
          items: counts[survivor.id]?.items || 0, amenities: counts[survivor.id]?.amenities || 0,
        },
        duplicates: scored.slice(1).map((s) => ({
          id: s.venue.id, name: s.venue.name, score: s.score,
          address: s.venue.address || '', status: s.venue.status,
          items: counts[s.venue.id]?.items || 0, amenities: counts[s.venue.id]?.amenities || 0,
        })),
        merge_preview: buildMergePatch(survivor, duplicates),
      });
    }
  }
  return clusters.sort((a, b) => b.duplicates.length - a.duplicates.length);
}

// Entities that reference a venue via a venue_id field.
export const VENUE_CHILD_ENTITIES = [
  'HappyHourItem', 'VenueAmenity', 'VenueCollaborator', 'Review', 'Favorite', 'CheckIn',
  'ProximityEvent', 'Beacon', 'VenueNote', 'VenueEvent', 'VenueReservationLink',
  'VenueCompetitor', 'VenueMessageLog', 'VenueCommunicationSettings', 'PassInstance',
  'WalletPass', 'AdCampaign', 'AdImpression', 'OfferStat', 'ListingIssue',
  'VenueFeatureOverride', 'VenueNotification', 'VenueClaimRequest', 'AmenityProposal',
];