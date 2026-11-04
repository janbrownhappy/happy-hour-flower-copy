// Google Places (New) enrichment pre-pass.
//
// Places is treated as AUTHORITATIVE for contact facts (address, city, zip, phone,
// website, lat/lng, category) and for the amenities Google itself asserts as place
// attributes. The LLM is only asked for what Places cannot answer (happy hour,
// description, socials), so the model reasons over ground truth instead of guessing
// from search snippets.
//
// Legacy maps/api/place endpoints cannot be enabled on current Google Cloud
// projects, so this uses the Places API (New) — same as verifyVenueContacts.

import { secrets } from 'base44:runtime';
import {
  SOURCES, PROTECTED_SOURCES, isClaimed, planAmenityWrites, recordDiscrepancies, applyProtectedUpdates,
} from './enrichmentProtection.ts';

// Secrets live in the runtime secrets store; Deno.env is kept as a fallback.
export function readPlacesKey() {
  try {
    const k = secrets.get('GOOGLE_PLACES_API_KEY');
    if (k) return k;
  } catch (_e) { /* fall through */ }
  try {
    return Deno.env.get('GOOGLE_PLACES_API_KEY');
  } catch (_e) {
    return undefined;
  }
}

const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
const streetNumber = (a) => (String(a || '').match(/\d{1,6}/) || [''])[0];

function nameMatches(ours, theirs) {
  const a = norm(ours);
  const b = norm(theirs);
  if (!a || !b) return false;
  return a === b || a.includes(b) || b.includes(a);
}

// Every Places attribute we trust, mapped to an exact HHF catalog slug.
// Only add a pair here when Google's field means precisely what the slug means —
// a near-miss mapping silently publishes a wrong amenity.
const ATTRIBUTE_SLUGS = [
  ['outdoorSeating', 'outdoor_patio'],
  ['liveMusic', 'live_music'],
  ['servesCocktails', 'cocktails'],
  ['servesBeer', 'beer_draft'],
  ['servesWine', 'wine'],
  ['servesDessert', 'desserts'],
  ['servesVegetarianFood', 'vegetarian'],
  ['goodForWatchingSports', 'sports_watching'],
  ['goodForGroups', 'groups'],
  ['allowsDogs', 'dog_friendly'],
  ['reservable', 'reservations_accepted'],
];

const ACCESSIBILITY_SLUGS = [
  ['wheelchairAccessibleEntrance', 'wheelchair_accessible'],
  ['wheelchairAccessibleRestroom', 'accessible_restrooms'],
  ['wheelchairAccessibleParking', 'accessible_parking'],
];

const PARKING_SLUGS = [
  ['freeParkingLot', 'free_parking'],
  ['freeStreetParking', 'street_parking'],
  ['valetParking', 'valet_parking'],
  ['paidGarageParking', 'garage_nearby'],
];

// Google place types → the HHF category value list in the research skill.
const CATEGORY_BY_TYPE = {
  wine_bar: 'Wine Bar',
  pub: 'Pub',
  night_club: 'Nightclub',
  bar: 'Bar',
  bar_and_grill: 'Bar',
  cafe: 'Cafe/Coffee+Bar',
  coffee_shop: 'Cafe/Coffee+Bar',
  restaurant: 'Restaurant',
  fine_dining_restaurant: 'Restaurant',
  american_restaurant: 'Restaurant',
  seafood_restaurant: 'Restaurant',
  steak_house: 'Restaurant',
  pizza_restaurant: 'Restaurant',
  mexican_restaurant: 'Restaurant',
  italian_restaurant: 'Restaurant',
  sushi_restaurant: 'Restaurant',
};

const PRICE_LEVELS = {
  PRICE_LEVEL_INEXPENSIVE: 1,
  PRICE_LEVEL_MODERATE: 2,
  PRICE_LEVEL_EXPENSIVE: 3,
  PRICE_LEVEL_VERY_EXPENSIVE: 4,
};

const DETAILS_FIELD_MASK = [
  'id', 'displayName', 'formattedAddress', 'addressComponents', 'nationalPhoneNumber',
  'websiteUri', 'location', 'primaryType', 'types', 'regularOpeningHours', 'priceLevel',
  'photos', 'outdoorSeating', 'liveMusic', 'servesCocktails', 'servesBeer', 'servesWine',
  'servesDessert', 'servesVegetarianFood', 'goodForWatchingSports', 'goodForGroups',
  'allowsDogs', 'reservable', 'accessibilityOptions', 'parkingOptions', 'businessStatus',
].join(',');

const MAX_MATCH_KM = 3;
function kmBetween(aLat, aLng, bLat, bLng) {
  const r = (d) => (d * Math.PI) / 180;
  const h = Math.sin(r(bLat - aLat) / 2) ** 2 + Math.cos(r(aLat)) * Math.cos(r(bLat)) * Math.sin(r(bLng - aLng) / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
}

// Phase 2.3 hard gate: a same-name business elsewhere is never a match. The candidate must be
// in the venue's state, close to its coordinates (when known), and otherwise in its city/ZIP.
// place needs addressComponents + location.
export function placeMatchesVenue(venue, place) {
  const comp = (t) => (place?.addressComponents || []).find((c) => (c.types || []).includes(t));
  const state = comp('administrative_area_level_1')?.shortText || '';
  const ourState = String(venue?.state_code || '').toUpperCase();
  if (!state) return { ok: false, reason: 'Candidate has no state' };
  if (ourState && state.toUpperCase() !== ourState) return { ok: false, reason: `STATE_MISMATCH (candidate ${state}, venue ${ourState})` };
  const lat = Number(venue?.lat), lng = Number(venue?.lng);
  const pLat = place?.location?.latitude, pLng = place?.location?.longitude;
  if (Number.isFinite(lat) && Number.isFinite(lng) && lat && lng && typeof pLat === 'number') {
    const km = kmBetween(lat, lng, pLat, pLng);
    if (km > MAX_MATCH_KM) return { ok: false, reason: `COORDINATES_TOO_FAR (${km.toFixed(1)} km)` };
    return { ok: true, reason: `state ${state}, ${km.toFixed(2)} km from venue coordinates` };
  }
  const city = norm(comp('locality')?.longText);
  const zip = comp('postal_code')?.longText || '';
    // Nothing to confirm against (no city, ZIP, address or coordinates — e.g. a food truck
  // imported with only a state): the state check above is the only geo evidence we have,
  // so accept it and mark the match as one that needs review.
  if (!venue?.city && !venue?.zip_code && !venue?.address) {
    return { ok: true, reason: ourState ? `state ${state} (no city/ZIP on file — manual review)` : 'no location on file — manual review' };
  }
  if ((venue?.city && city === norm(venue.city)) || (venue?.zip_code && zip === String(venue.zip_code).trim())) {
    return { ok: true, reason: `state ${state}, city/ZIP match` };
  }
  return { ok: false, reason: 'NO_GEOGRAPHIC_CONFIRMATION (no coordinates, city or ZIP match)' };
}

// Text Search kept to a small field mask — it only has to identify the right place.
// Returns { match, rejected: [{ name, address, reason }] }.
export async function findPlace(apiKey, venue) {
  const { name, address, city, state_code, website } = venue;
  const locationHint = [address, city, state_code].filter(Boolean).join(' ');
  const textQuery = [name, locationHint || website].filter(Boolean).join(' ').trim();
  if (!textQuery) return { match: null, rejected: [] };

  const body: Record<string, unknown> = { textQuery, maxResultCount: 5 };
  if (Number(venue.lat) && Number(venue.lng)) {
    body.locationBias = { circle: { center: { latitude: Number(venue.lat), longitude: Number(venue.lng) }, radius: 5000 } };
  }
  const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.addressComponents,places.location',
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Places search failed: ${data?.error?.message || res.status}`);

  const rejected = [];
  const results = (data.places || []).filter((r) => {
    const geo = placeMatchesVenue(venue, r);
    if (!geo.ok) rejected.push({ name: r.displayName?.text || '', address: r.formattedAddress || '', reason: geo.reason });
    return geo.ok;
  });

  // Address-first: when we hold a street address, the candidate MUST share its street
  // number (and ZIP when known). Names are only a tiebreaker — licensed names rarely
  // match Google's display name, and same-name businesses elsewhere are common.
  const ourNum = streetNumber(address);
  const ourZip = String(venue.zip_code || '').trim().slice(0, 5);
  const named = (r) => nameMatches(name, r.displayName?.text);
  const addrOk = (r) => {
    if (streetNumber(r.formattedAddress) !== ourNum) {
      rejected.push({ name: r.displayName?.text || '', address: r.formattedAddress || '', reason: 'STREET_NUMBER_MISMATCH' });
      return false;
    }
    const zip = (r.addressComponents || []).find((c) => (c.types || []).includes('postal_code'))?.longText || '';
    return !ourZip || !zip || zip === ourZip;
  };
  let match;
  if (ourNum) {
    const onAddress = results.filter(addrOk);
    match = onAddress.find(named) || (onAddress.length === 1 ? onAddress[0] : null);
  } else {
    // No street address to confirm against: only a name match can identify the business.
    // Never fall back to "the only candidate in the state" — that is how a different
    // local business (e.g. a churro cafe vs a churro food truck) gets written onto a venue.
    match = results.find(named) || null;
  }

  return { match: match || null, rejected };
}

// Lower-cost Details tier for bulk imports: identity, address, location and type only.
// Phone, website, hours, price and amenity attributes come from website/AI research instead.
const LITE_DETAILS_FIELD_MASK = 'id,displayName,formattedAddress,addressComponents,location,primaryType,types,photos,businessStatus';

export async function getPlaceDetails(apiKey, placeId, lite = false) {
  const res = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`, {
    headers: { 'X-Goog-Api-Key': apiKey, 'X-Goog-FieldMask': lite ? LITE_DETAILS_FIELD_MASK : DETAILS_FIELD_MASK },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Places details failed: ${data?.error?.message || res.status}`);
  return data;
}

const component = (place, type) =>
  (place.addressComponents || []).find((c) => (c.types || []).includes(type));

export function mapCategoryToHHF(place) {
  const types = [place.primaryType, ...(place.types || [])].filter(Boolean);
  for (const t of types) {
    if (CATEGORY_BY_TYPE[t]) return CATEGORY_BY_TYPE[t];
  }
  return null;
}

// The Venue contact fields Places owns. Only non-empty values are returned, so a
// gap in Google's data never blanks something we already hold.
export function mapPlaceToVenueFields(place) {
  const fields = {};
  const street = place.formattedAddress
    ? place.formattedAddress.split(',')[0].trim()
    : null;
  if (street) fields.address = street;

  const city = component(place, 'locality')?.longText;
  if (city) fields.city = city;

  const zip = component(place, 'postal_code')?.longText;
  if (zip) fields.zip_code = zip;

  if (place.nationalPhoneNumber) fields.phone = place.nationalPhoneNumber;
  if (place.websiteUri) fields.website = place.websiteUri;
  if (typeof place.location?.latitude === 'number') fields.lat = place.location.latitude;
  if (typeof place.location?.longitude === 'number') fields.lng = place.location.longitude;

  const category = mapCategoryToHHF(place);
  if (category) fields.category = category;

  const price = PRICE_LEVELS[place.priceLevel];
  if (price) fields.price_level = price;

  return fields;
}

// Attributes Google asserts about the place, as sourced amenity rows.
export function mapAttributesToAmenities(place) {
  const source = 'Google Places attributes';
  const out = [];
  const add = (slug) => { if (!out.some((a) => a.slug === slug)) out.push({ slug, source, provenance: SOURCES.GOOGLE_PLACES }); };

  for (const [field, slug] of ATTRIBUTE_SLUGS) {
    if (place[field] === true) add(slug);
  }
  for (const [field, slug] of ACCESSIBILITY_SLUGS) {
    if (place.accessibilityOptions?.[field] === true) add(slug);
  }
  for (const [field, slug] of PARKING_SLUGS) {
    if (place.parkingOptions?.[field] === true) add(slug);
  }
  return out;
}

// Business hours are not a Venue field, but they bound when a happy hour can run —
// so they go to the LLM as context rather than into the record.
export function formatOpeningHours(place) {
  const desc = place.regularOpeningHours?.weekdayDescriptions;
  return Array.isArray(desc) && desc.length ? desc : null;
}

// One entry point: resolve the venue on Google and return everything derived from it.
// Any Places failure (quota, network, no match) resolves to matched:false so the
// caller degrades to the LLM-only flow instead of failing the enrichment.
export async function runPlacesPrepass(query, { lite = false } = {}) {
  const apiKey = readPlacesKey();
  if (!apiKey) return { matched: false, reason: 'GOOGLE_PLACES_API_KEY not set' };
  if (!query?.name && !query?.website) return { matched: false, reason: 'No name or website to search' };

  try {
    const { match: candidate, rejected } = await findPlace(apiKey, query);
    if (!candidate?.id) return { matched: false, reason: 'No confident Google Places match', rejected };

    const place = await getPlaceDetails(apiKey, candidate.id, lite);
    const geo = placeMatchesVenue(query, place);
    if (!geo.ok) return { matched: false, reason: geo.reason, rejected };
    return {
      matched: true,
      match_reason: geo.reason,
      matched_address: place.formattedAddress || '',
      rejected,
      place_id: place.id || candidate.id,
      display_name: place.displayName?.text || candidate.displayName?.text || '',
      business_status: place.businessStatus || '',
      fields: mapPlaceToVenueFields(place),
      amenities: mapAttributesToAmenities(place),
      opening_hours: formatOpeningHours(place),
      photo_count: (place.photos || []).length,
      // Reused by the photo fetcher so it doesn't look the place up a second time.
      photos: (place.photos || []).slice(0, 6).map((p) => ({ name: p.name, width: p.widthPx, height: p.heightPx })),
    };
  } catch (err) {
    return { matched: false, reason: err.message };
  }
}

// Apply a matched Places pre-pass to an existing venue through the protection policy.
// Unprotected fields are written (provenance google_places); protected ones become
// discrepancies. Contacts are only stamped verified when nothing conflicted.
export async function applyPlacesToVenue(base44, venue, places, origin, retry = (fn) => fn()) {
  // Phase 2.4 D2: Google's coarse category only fills an empty one — never replaces a more specific existing value.
  const fields = { ...(places.fields || {}) };
  if (venue.category) delete fields.category;
  const plan = applyProtectedUpdates(venue, fields, SOURCES.GOOGLE_PLACES);
  const verified = plan.protected.length === 0;
  let current = venue;
  if (plan.applied.length || verified) {
    const patch = { ...plan.updates };
    if (verified) {
      patch.contacts_verified = true;
      patch.contacts_verified_at = new Date().toISOString();
      patch.contacts_verified_source = 'google_places';
    }
    current = await retry(() => base44.asServiceRole.entities.Venue.update(venue.id, patch));
  }
  const discrepancies = await recordDiscrepancies(base44, venue, plan.protected, origin);
  await upsertPlacesAmenities(base44, current, places.amenities || []);
  return { venue: current, applied: plan.applied, protected: plan.protected, discrepancies };
}

// Add/refresh only the Places-sourced amenity rows for a venue, leaving
// LLM-researched rows untouched. Idempotent — a re-run updates instead of duplicating.
// Owner/admin rows are never touched; a claimed venue gets discrepancies, not writes.
export async function upsertPlacesAmenities(base44, venue, amenities) {
  const venueId = venue?.id;
  if (!venueId || !amenities?.length) return { created: 0, updated: 0 };

  const existing = await base44.asServiceRole.entities.VenueAmenity.filter({ venue_id: venueId });
  const bySlug = new Map(existing.map((a) => [a.amenity_slug, a]));
  const verified_at = new Date().toISOString();

  if (isClaimed(venue)) {
    const plan = planAmenityWrites(venue, existing, amenities, SOURCES.GOOGLE_PLACES);
    await recordDiscrepancies(base44, venue, plan.discrepancies, 'googlePlaces');
    return { created: 0, updated: 0, protected: plan.discrepancies.length };
  }

  const toCreate = [];
  let updated = 0;
  for (const a of amenities) {
    const prior = bySlug.get(a.slug);
    if (prior && PROTECTED_SOURCES.has(prior.provenance)) continue;
    if (prior) {
      await base44.asServiceRole.entities.VenueAmenity.update(prior.id, { source: a.source, provenance: SOURCES.GOOGLE_PLACES, verified_at });
      updated++;
    } else {
      toCreate.push({ venue_id: venueId, amenity_slug: a.slug, source: a.source, provenance: SOURCES.GOOGLE_PLACES, verified_at });
    }
  }
  if (toCreate.length) {
    await base44.asServiceRole.entities.VenueAmenity.bulkCreate(toCreate);
  }
  return { created: toCreate.length, updated };
}