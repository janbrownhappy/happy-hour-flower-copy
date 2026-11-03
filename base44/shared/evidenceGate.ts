// Phase 2.3 — evidence-quality & location guardrails for AUTOMATED writes.
//
// Research may be broad; automatic writes are conservative. Every automated finding is
// classified and run through hard gates. Anything failing a gate is review-only (or dropped).
//
//   CLASS A  structured verified (Google Places attributes)      — handled in googlePlacesEnrich
//   CLASS B  official venue website, retrieved by Scrapfly        — may auto-save if ALL gates pass
//   CLASS C  general web / third party / search results            — NEVER auto-saves
//
// Pure functions only — no database access here.

import { VALID_AMENITY_SLUGS } from './amenityCatalog.ts';

export const AUTO_SAVE_MIN_CONFIDENCE = 0.8;
export const REVIEW_MIN_CONFIDENCE = 0.6;

export const LOC = {
  CONFIRMED: 'CONFIRMED_LOCATION',
  BRAND_WIDE: 'BRAND_WIDE_CONFIRMED',
  AMBIGUOUS: 'AMBIGUOUS_LOCATION',
  WRONG: 'WRONG_LOCATION',
};

const hostOf = (u) => { try { return new URL(u).hostname.replace(/^www\./, '').toLowerCase(); } catch { return ''; } };
const cleanUrl = (u) => String(u || '').toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/[?#].*$/, '').replace(/\/+$/, '');
const flat = (s) => String(s || '').toLowerCase()
  .replace(/[\u2018\u2019\u201c\u201d]/g, "'").replace(/[\u2013\u2014]/g, '-')
  .replace(/[^a-z0-9$%]+/g, ' ').trim();
const slugify = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '');

// ── Quotes ──────────────────────────────────────────────────────────────────
const NON_QUOTES = /^(yelp|google|google places|google maps|cvent|tripadvisor|facebook|instagram|official website|website|official site|source|n\/?a|none|null|unknown|homepage|home|menu)$/i;

// A quote must be real page text: not a URL, domain, site name, or a fragment too short to assert anything.
export function quoteShapeProblem(quote) {
  const q = String(quote || '').trim().replace(/^["'\u201c]+|["'\u201d]+$/g, '').trim();
  if (!q) return 'empty';
  if (/^https?:\/\//i.test(q) || /^[\w.-]+\.(com|net|org|biz|io|co|us)(\/\S*)?$/i.test(q)) return 'url_or_domain';
  if (NON_QUOTES.test(q)) return 'site_name';
  if (/^(menu|page|website|listing|site|posts?) (lists|features|shows|mentions|says|includes|indicates)\b/i.test(q)) return 'ai_paraphrase';
  const words = flat(q).split(' ').filter(Boolean);
  if (words.length < 2) return 'too_short';
  return '';
}

// ── Evidence context (Phase 2.3.1) ──────────────────────────────────────────
// Labels, buttons, headings and the business name are not evidence on their own. Concise
// evidence is fine when it actually asserts something ("Dogs are welcome on all of our patios.").
const CTA = /^(view|see|reserve|book|order|explore|click|download|shop|join|call|get|browse|check out|learn|discover|visit|make|find|sign up|start|buy|read)\b/i;
const ASSERTS = /\b(is|are|was|were|be|offer(s|ed|ing)?|serv(e|es|ed|ing)|welcome[ds]?|feature[sd]?|featuring|ha(s|ve)|take[sn]?|accept(s|ed)?|enjoy|host(s|ed|ing)?|include[sd]?|including|available|brew(s|ed|ing)?|made|pour(s|ed|ing)?|play(s|ing)?|open|allow(s|ed)?|provid(e|es|ed|ing)|no|not|don't|do not|only|every|daily|nightly|weekly|with|from|our|we|you)\b/i;
const NAV_ONLY = /^(home|about( us)?|menus?|food|drinks?|events?|contact( us)?|locations?|gallery|hours|specials|private events|catering|gift cards|careers|order online|reservations?)$/i;

function nameWords(venue) {
  return new Set(flat(venue?.name).split(' ').filter((w) => w.length > 1));
}

export function evidenceContext(slug, quote, page, venue) {
  const q = String(quote || '').trim().replace(/^["'\u201c]+|["'\u201d]+$/g, '').trim();
  const words = flat(q).split(' ').filter(Boolean);
  const url = cleanUrl(page?.url);
  const type = /menu|food|drink|cocktail|wine|beer|brunch|lunch|dinner/.test(url) ? 'MENU_CONTENT'
    : /event|calendar|music|trivia/.test(url) ? 'EVENT_CONTENT'
    : /locations?|contact|visit|find-us/.test(url) ? 'LOCATION_CONTENT'
    : 'CONTENT_TEXT';
  const nw = nameWords(venue);
  const rest = words.filter((w) => !nw.has(w) && !['the', 'and', 'of', 'at'].includes(w));
  if (rest.length === 0) return { type: 'BUSINESS_NAME_ONLY', problem: 'BUSINESS_NAME_ONLY' };
  // Strip the venue name: if the amenity only matches through the name, it's name-only evidence.
  const unnamed = words.filter((w) => !nw.has(w)).join(' ');
  if (slug && semanticProblem(slug, unnamed) && !semanticProblem(slug, q)) return { type: 'BUSINESS_NAME_ONLY', problem: 'BUSINESS_NAME_ONLY' };
  if (NAV_ONLY.test(flat(q))) return { type: 'NAVIGATION_LABEL', problem: 'NAVIGATION_ONLY' };
  if (CTA.test(q) && words.length <= 6) return { type: 'BUTTON_TEXT', problem: 'BUTTON_ONLY' };
  if (/:\s*$/.test(q) || (words.length <= 5 && q === q.toUpperCase() && /[A-Z]/.test(q))) return { type: 'PAGE_HEADING_ONLY', problem: 'HEADING_ONLY' };
  if (words.length <= 4 && !ASSERTS.test(q)) return { type: 'PAGE_HEADING_ONLY', problem: 'INSUFFICIENT_CONTEXT' };
  // Menu pages: a priced/described menu item is real content.
  if (type === 'MENU_CONTENT' && words.length <= 4 && !/\$|\d/.test(q) && !ASSERTS.test(q)) return { type, problem: 'INSUFFICIENT_CONTEXT' };
  return { type, problem: '' };
}

// ── Venue identity (Phase 2.3.1) ────────────────────────────────────────────
const GENERIC_NAME = /^(the )?(taphouse|tap house|tavern|pub|bar|grill|bistro|cafe|café|kitchen|lounge|brewery|taproom|cantina|saloon|diner|restaurant)$/i;

// IDENTITY_NEEDS_REVIEW: demote every automated write in a gate result to review.
export function demoteForIdentity(log, reason = 'IDENTITY_NEEDS_REVIEW') {
  for (const e of log || []) {
    if (e.decision === 'auto_saved' || e.action === 'written' || e.action === 'partial_write_rest_review') {
      e.decision = 'review'; if (e.action) e.action = 'review'; e.reason = reason;
    }
  }
}
export function venueIdentity(venue, places, siteResearch) {
  const siteOk = siteResearch?.diag?.status === 'OFFICIAL_WEBSITE_CONFIRMED';
  const reasons = [];
  // An admin-confirmed identity is authoritative over automated matching.
  if (venue?.field_provenance?.identity === 'hhf_admin') return { status: 'IDENTITY_CONFIRMED', reasons: ['confirmed by HHF admin'] };
  if (GENERIC_NAME.test(String(venue?.name || '').trim())) reasons.push('generic venue name');
  if (!venue?.website) reasons.push('no website on file');
  if (!venue?.state_code) reasons.push('state missing');
  if (!places?.matched) reasons.push('no Google match');
  if (siteResearch?.diag?.status === 'OFFICIAL_WEBSITE_UNCERTAIN') reasons.push('website could not be tied to this venue');
  if (places?.matched && siteOk) return { status: 'IDENTITY_CONFIRMED', reasons };
  if ((places?.matched && venue?.website) || siteOk) return { status: 'IDENTITY_PROBABLE', reasons };
  return { status: 'IDENTITY_NEEDS_REVIEW', reasons };
}

// Is the quote actually present in the retrieved page text? Ellipses split it into parts that
// must each be found. Returns the page the quote was found on, or null.
export function findQuoteInPages(quote, pages, preferredUrl) {
  const parts = String(quote || '').split(/\.\.\.|\u2026/).map(flat).filter((p) => p.split(' ').length >= 3);
  if (!parts.length) return null;
  const ordered = [...(pages || [])].sort((a, b) => (cleanUrl(b.url) === cleanUrl(preferredUrl)) - (cleanUrl(a.url) === cleanUrl(preferredUrl)));
  for (const p of ordered) {
    const hay = flat(`${p.title || ''} ${p.text || ''}`);
    if (parts.every((part) => hay.includes(part))) return p;
  }
  return null;
}

// ── Source class ────────────────────────────────────────────────────────────
export function sourceClass(item, siteResearch) {
  const d = siteResearch?.diag;
  if (item?.provenance === 'google_places') return 'A';
  const official = d?.status === 'OFFICIAL_WEBSITE_CONFIRMED' ? hostOf(d.official_website) : '';
  const host = hostOf(item?.source_url);
  if (official && host && (host === official || host.endsWith(`.${official}`))) return 'B';
  return 'C';
}

// ── Location ────────────────────────────────────────────────────────────────
const STATES = {
  AL: 'alabama', AK: 'alaska', AZ: 'arizona', AR: 'arkansas', CA: 'california', CO: 'colorado', CT: 'connecticut',
  DE: 'delaware', FL: 'florida', GA: 'georgia', HI: 'hawaii', ID: 'idaho', IL: 'illinois', IN: 'indiana', IA: 'iowa',
  KS: 'kansas', KY: 'kentucky', LA: 'louisiana', ME: 'maine', MD: 'maryland', MA: 'massachusetts', MI: 'michigan',
  MN: 'minnesota', MS: 'mississippi', MO: 'missouri', MT: 'montana', NE: 'nebraska', NV: 'nevada', NH: 'new hampshire',
  NJ: 'new jersey', NM: 'new mexico', NY: 'new york', NC: 'north carolina', ND: 'north dakota', OH: 'ohio', OK: 'oklahoma',
  OR: 'oregon', PA: 'pennsylvania', RI: 'rhode island', SC: 'south carolina', SD: 'south dakota', TN: 'tennessee',
  TX: 'texas', UT: 'utah', VT: 'vermont', VA: 'virginia', WA: 'washington', WV: 'west virginia', WI: 'wisconsin', WY: 'wyoming',
};
const CITY_STATE = /\b([A-Z][a-z]+(?:[ -][A-Z][a-z]+){0,2}),\s*(A[LKZR]|C[AOT]|DE|FL|GA|HI|I[ADLN]|K[SY]|LA|M[ADEINOST]|N[CDEHJMVY]|O[HKR]|PA|RI|S[CD]|T[NX]|UT|V[AT]|W[AIVY])\b/g;

// Distinct "City, ST" mentions on a page — 2+ means the page covers several locations.
function citiesOnPage(text) {
  const out = new Set();
  for (const m of String(text || '').matchAll(CITY_STATE)) out.add(`${slugify(m[1])}|${m[2]}`);
  return out;
}

// Does this page's URL/title point at another city or state?
function pointsElsewhere(page, venue) {
  const hay = `${cleanUrl(page?.url)} ${String(page?.title || '').toLowerCase()}`.replace(/[-_/]+/g, ' ');
  const ourState = STATES[String(venue?.state_code || '').toUpperCase()] || '';
  for (const name of Object.values(STATES)) {
    if (name !== ourState && new RegExp(`\\b${name}\\b`).test(hay)) return `page is about ${name}`;
  }
  const loc = cleanUrl(page?.url).match(/\/locations?\/([^/]+)/);
  const city = slugify(venue?.city);
  if (loc && city && !slugify(loc[1]).includes(city)) return `location page "${loc[1]}"`;
  return '';
}

// applicability: what the model said ('this_location' | 'all_locations' | 'other_location' | 'unclear').
export function locationStatus(venue, page, quote, siteResearch, applicability) {
  if (applicability === 'other_location') return { status: LOC.WRONG, why: 'research says another location' };
  if (!page) return { status: LOC.AMBIGUOUS, why: 'no retrieved page' };
  const elsewhere = pointsElsewhere(page, venue);
  if (elsewhere) return { status: LOC.WRONG, why: elsewhere };
  const structure = siteResearch?.diag?.location_structure;
  if (structure === 'SINGLE_LOCATION_CONFIRMED') return { status: LOC.CONFIRMED, why: 'single-location official site' };
  const city = slugify(venue?.city);
  if (structure === 'LOCATION_STRUCTURE_UNCERTAIN') {
    if (city && slugify(`${page.url} ${page.title}`).includes(city)) return { status: LOC.CONFIRMED, why: 'location-specific page for this city' };
    return { status: LOC.AMBIGUOUS, why: 'location structure uncertain' };
  }
  const cities = citiesOnPage(page.text);
  const otherCities = [...cities].filter((c) => !c.startsWith(`${city}|`));
  const ourCityListed = [...cities].some((c) => c.startsWith(`${city}|`));
  if (otherCities.length && !ourCityListed && !siteResearch?.diag?.multi_location) {
    return { status: LOC.WRONG, why: `page only names ${otherCities.map((c) => c.split('|')[0]).join(', ')}` };
  }
  const multi = siteResearch?.diag?.multi_location || otherCities.length > 0;
  if (!multi) return { status: LOC.CONFIRMED, why: 'single-location official site' };
  const urlTitle = slugify(`${page.url} ${page.title}`);
  if (city && urlTitle.includes(city)) return { status: LOC.CONFIRMED, why: 'location-specific page for this city' };
  if (applicability === 'all_locations' && /\b(all|every|each)( of)?( our)? (\w+ )?locations?\b/i.test(String(quote || ''))) {
    return { status: LOC.BRAND_WIDE, why: 'source states it applies to all locations' };
  }
  return { status: LOC.AMBIGUOUS, why: `multi-location site; page not specific to ${venue?.city || 'this venue'}` };
}

const locationOk = (s) => s === LOC.CONFIRMED || s === LOC.BRAND_WIDE;

// ── Semantics ───────────────────────────────────────────────────────────────
// The quote must support the MEANING of the slug, not merely related words.
const MEANING = {
  live_music: /\blive (music|band|bands|entertainment|acoustic|performances?)\b|\bbands?\b.*\b(play|perform|live)|\bmusicians?\b|\bsinger[- ]songwriter/,
  live_music_venue: /\blive (music|band|bands|entertainment|performances?)\b|\bconcerts?\b|\bmusicians?\b/,
  brewery: /\bbrew(ery|eries|ed|ing|house|pub|s)?\b|\bbrewed (on[- ]site|in[- ]house|here)/,
  non_alcoholic_options: /\bnon[- ]?alcoholic\b|\bmocktails?\b|\bzero[- ]proof\b|\balcohol[- ]free\b|\bspirit[- ]free\b|\bna (beer|beverages|options)\b/,
  mocktail_menu: /\bmocktails?\b|\bzero[- ]proof\b|\bspirit[- ]free\b/,
  walk_in_only: /\bwalk[- ]?ins? only\b|\b(do not|don't|dont|does not|doesn't) (take|accept) reservations\b|\bno reservations\b/,
  walk_ins_welcome: /\bwalk[- ]?ins? (are )?(always )?welcome\b/,
  first_come_first_served: /\bfirst[- ]come,? first[- ]serv/,
  reservations_available: /\breserv(e|ation|ations)\b|\bopentable\b|\bresy\b|\bbook (a|your) table\b/,
  reservations_accepted: /\breserv(e|ation|ations)\b|\bopentable\b|\bresy\b|\bbook (a|your) table\b/,
  happy_hour_menu: /\bhappy hour\b/,
  beer_draft: /\bdraft\b|\bdraught\b|\bon tap\b|\btaps\b/,
  dog_friendly: /\bdogs?\b|\bpups?\b|\bpets?\b|\bcanine/,
  outdoor_patio: /\bpatio\b|\boutdoor\b|\boutside\b|\bcourtyard\b|\bterrace\b|\bdeck\b|\bbeer garden\b/,
  covered_patio: /\bcovered (patio|porch|deck|outdoor)/,
  rooftop: /\broof ?top\b|\bon the roof\b/,
  martinis: /\bmartinis?\b|\btini\b/,
  board_games: /\bboard games?\b|\bchess\b|\bcard games?\b/,
  cornhole_yard_games: /\bcornhole\b|\byard games?\b/,
  private_room: /\bprivate (room|dining|event space|space|area)\b|\bsemi[- ]private\b/,
  small_plates: /\bsmall plates?\b|\btapas\b|\bshareables?\b|\bsnacks?\b|\bstarters?\b|\bappetizers?\b/,
  full_kitchen: /\bkitchen\b|\bfull menu\b|\bentr[eé]es?\b|\bdinner\b.*\blunch\b|\blunch\b.*\bdinner\b/,
  bar_seating: /\b(seat(ed|s)?|seating)\b.*\bbar\b|\bbar (seating|top|stools?)\b/,
  dance_floor: /\bdanc(e|ing)\b/,
  lounge: /\blounge\b/,
  lounge_seating: /\blounge\b|\bcouch(es)?\b|\bsofas?\b/,
  taproom: /\btap ?room\b/,
  wine_bar: /\bwine bar\b/,
  cocktail_bar: /\bcocktail bar\b|\bcocktail lounge\b/,
  hotel_bar: /\bhotel bar\b|\blobby bar\b/,
  free_wifi: /\bwi[- ]?fi\b/,
  gluten_free: /\bgluten[- ]free\b|\(gf\)|\bgf\b/,
  restaurant: /\brestaurant\b|\bdining\b|\bentr[eé]es?\b|\bbistro\b/,
  valet_parking: /\bvalet\b/,
};

export function semanticProblem(slug, quote) {
  const q = flat(quote).replace(/ s\b/g, 's');
  const raw = String(quote || '').toLowerCase();
  const rule = MEANING[slug];
  if (rule) return rule.test(raw) || rule.test(q) ? '' : `quote does not establish "${slug}"`;
  const words = slug.split('_').filter((w) => w.length > 3).map((w) => w.replace(/s$/, ''));
  if (!words.length) return '';
  return words.some((w) => q.includes(w)) ? '' : `quote does not mention "${slug.replace(/_/g, ' ')}"`;
}

// ── Conflicts ───────────────────────────────────────────────────────────────
const CONFLICTS = [
  ['walk_in_only', 'reservations_accepted'], ['walk_in_only', 'reservations_available'],
  ['walk_in_only', 'reservations_required'], ['walk_in_only', 'walk_ins_welcome'],
  ['first_come_first_served', 'reservations_required'],
].filter(([a, b]) => VALID_AMENITY_SLUGS.has(a) && VALID_AMENITY_SLUGS.has(b));

function conflictWith(slug, others) {
  for (const [a, b] of CONFLICTS) {
    if (slug === a && others.has(b)) return b;
    if (slug === b && others.has(a)) return a;
  }
  return '';
}

// ── Amenity gate ────────────────────────────────────────────────────────────
// items: sanitized amenity findings [{slug, source, source_url, evidence, confidence, provenance, location_applicability}]
// existingSlugs: Set of slugs on the record. Returns { autoSave, review, log }.
export function gateAmenityFindings(venue, items, siteResearch, existingSlugs) {
  const pages = siteResearch?.evidence || [];
  const log = [];
  const passing = [];
  for (const a of items || []) {
    const cls = sourceClass(a, siteResearch);
    const entry = {
      kind: 'amenity', slug: a.slug, source_class: cls, confidence: a.confidence ?? null,
      source_url: a.source_url || '', evidence: a.evidence || '', page_title: '', location_status: '', location_why: '',
      decision: 'blocked', reason: '',
    };
    log.push(entry);
    if (cls === 'C') { entry.reason = 'THIRD_PARTY_SOURCE'; continue; }
    const shape = quoteShapeProblem(a.evidence);
    if (shape) { entry.reason = `INVALID_QUOTE (${shape})`; continue; }
    const page = findQuoteInPages(a.evidence, pages, a.source_url);
    if (!page) { entry.reason = 'INVALID_QUOTE (not found in retrieved page text)'; continue; }
    entry.page_title = page.title || '';
    entry.source_url = page.url;
    const loc = locationStatus(venue, page, a.evidence, siteResearch, a.location_applicability);
    entry.location_status = loc.status;
    entry.location_why = loc.why;
    if (!locationOk(loc.status)) { entry.reason = loc.status === LOC.WRONG ? 'WRONG_LOCATION' : 'AMBIGUOUS_LOCATION'; continue; }
    const sem = semanticProblem(a.slug, a.evidence);
    if (sem) { entry.reason = `SEMANTIC_MISMATCH (${sem})`; continue; }
    const ctx = evidenceContext(a.slug, a.evidence, page, venue);
    entry.evidence_type = ctx.type;
    if (ctx.problem) { entry.reason = ctx.problem; continue; }
    if (isTestimonial(a.evidence, page)) { entry.evidence_type = 'TESTIMONIAL_OR_REVIEW_CONTENT'; entry.reason = 'TESTIMONIAL_OR_REVIEW_CONTENT'; continue; }
    if ((a.confidence ?? 0) < AUTO_SAVE_MIN_CONFIDENCE) { entry.reason = 'LOW_CONFIDENCE'; continue; }
    passing.push({ a, entry });
  }
  // Conflicts against the record and against the other passing findings.
  const passingSlugs = new Set(passing.map((p) => p.a.slug));
  const autoSave = [];
  for (const p of passing) {
    const others = new Set([...existingSlugs, ...[...passingSlugs].filter((s) => s !== p.a.slug)]);
    const c = conflictWith(p.a.slug, others);
    if (c) { p.entry.reason = `SOURCE_CONFLICT (conflicts with ${c})`; continue; }
    p.entry.decision = 'auto_saved';
    p.entry.reason = 'ALL_GATES_PASSED';
    autoSave.push({ ...p.a, source_url: p.entry.source_url });
  }
  const review = log.filter((e) => e.decision !== 'auto_saved' && (e.confidence ?? 0) >= REVIEW_MIN_CONFIDENCE);
  review.forEach((e) => { e.decision = 'review'; });
  return { autoSave, review, log };
}

// ── Non-happy-hour venue fields (description, socials, contacts) ────────────
// Local only when the link sits in location content AND the handle itself names this venue's city.
const GLOBAL_CONTEXTS = new Set(['GLOBAL_HEADER', 'GLOBAL_FOOTER', 'BRAND_NAVIGATION']);
export function socialLocationCheck(venue, key, url, sc) {
  const handle = slugify(String(url || '').replace(/^https?:\/\/[^/]+\//i, ''));
  const city = slugify(venue?.city);
  const handleLocal = !!city && handle.includes(city);
  const context = sc?.context || 'UNKNOWN';
  const localContext = context === 'LOCATION_CONTENT' || context === 'LOCATION_CONTACT_SECTION';
  // Handle is just the brand (e.g. "crowneplaza" for "Crowne Plaza Hotel") → corporate wherever it appears.
  const brand = slugify(venue?.brand_name || venue?.name);
  const firstSeg = slugify(String(url || '').replace(/^https?:\/\/[^/]+\/(@|channel\/|c\/|user\/)?/i, '').split('/')[0]);
  if (!handleLocal && firstSeg.length >= 4 && (brand.includes(firstSeg) || firstSeg.includes(brand))) {
    return { account: 'CORPORATE', context, reason: 'BRAND_LEVEL_SOCIAL' };
  }
  if (localContext && handleLocal) return { account: 'LOCAL', context, reason: 'location page link + handle names this city' };
  if (!handleLocal && (GLOBAL_CONTEXTS.has(context) || context === 'UNKNOWN' || context === 'OTHER')) {
    return { account: 'CORPORATE', context, reason: 'BRAND_LEVEL_SOCIAL' };
  }
  return { account: 'UNCERTAIN', context, reason: 'SOCIAL_LOCATION_UNCERTAIN' };
}

// Testimonials / embedded reviews are customer opinion, not venue statements — review only.
// Attribution markers immediately before the quote (review widgets, testimonial sliders).
const TESTIMONIAL_NEAR = /\b(testimonials?|review by|(five|four|5|4) star review|what (our )?(guests|customers|people|clients|fans) (are )?say(ing)?|yelp review|tripadvisor|google review|customer review)\b/;
const REVIEWER_VOICE = /\b(i|i m|i ve|my|highly recommend|will (definitely )?be back|must try|five stars|5 stars|we loved|loved it)\b/;
export function isTestimonial(quote, page) {
  const q = flat(quote);
  if (REVIEWER_VOICE.test(q)) return true;
  const hay = flat(`${page?.text || ''}`);
  const i = hay.indexOf(q.slice(0, 60));
  if (i < 0) return false;
  return TESTIMONIAL_NEAR.test(hay.slice(Math.max(0, i - 150), i));
}

const CONTACT_KEYS = new Set(['address', 'city', 'zip_code', 'phone', 'website', 'category']);
// values: { key: value }, fields: research.fields ({ value, source, source_url, evidence }).
// Returns { allowed: {key: value}, log }.
export function gateFieldFindings(venue, values, fields, siteResearch) {
  const allowed = {};
  const log = [];
  for (const [key, value] of Object.entries(values || {})) {
    const f = fields?.[key] || {};
    const linked = /linked from site/i.test(f.source || '');
    const cls = linked ? 'B' : sourceClass({ source_url: f.source_url }, siteResearch);
    const entry = { kind: 'field', field: key, value, source_class: cls, source_url: f.source_url || '', evidence: f.evidence || f.source || '', decision: 'review', reason: '' };
    log.push(entry);
    if (cls !== 'B') { entry.reason = 'THIRD_PARTY_SOURCE'; continue; }
    const existing = venue?.[key];
    // Existing social links are never overwritten.
    if (/_url$/.test(key) && existing != null && existing !== '') { entry.reason = 'REGRESSION_PROTECTION (existing value kept)'; continue; }
    // Phase 2.4 D1 / 2.4.1: on multi-location or uncertain sites a social link auto-fills only when
    // affirmatively location-specific; header/footer/brand-nav links are brand-level by default.
    if (/_url$/.test(key) && siteResearch?.diag?.location_structure !== 'SINGLE_LOCATION_CONFIRMED') {
      const s = socialLocationCheck(venue, key, value, linked ? siteResearch?.diag?.social_context?.[key] : null);
      entry.page_context = s.context;
      entry.account_class = s.account;
      if (s.account !== 'LOCAL') { entry.reason = s.reason; continue; }
    }
    // Descriptions are editorial: an existing one is never auto-replaced.
    if (key === 'description' && existing) { entry.reason = 'DESCRIPTION_PROTECTED (existing kept; proposal sent to review)'; continue; }
    // Social links and contacts only fill gaps; a differing existing value goes to review.
    if ((/_url$/.test(key) || CONTACT_KEYS.has(key)) && existing != null && existing !== '') {
      entry.reason = 'REGRESSION_PROTECTION (existing value kept)'; continue;
    }
    if (!linked) {
      const page = (siteResearch?.evidence || []).find((p) => cleanUrl(p.url) === cleanUrl(f.source_url))
        || (CONTACT_KEYS.has(key) ? findQuoteInPages(f.evidence, siteResearch?.evidence, f.source_url) : null);
      if (CONTACT_KEYS.has(key) && (quoteShapeProblem(f.evidence) || !findQuoteInPages(f.evidence, siteResearch?.evidence, f.source_url))) {
        entry.reason = 'INVALID_QUOTE'; continue;
      }
      if (!page) { entry.reason = 'INSUFFICIENT_EVIDENCE (page not retrieved)'; continue; }
      const loc = locationStatus(venue, page, f.evidence, siteResearch, '');
      entry.location_status = loc.status;
      if (!locationOk(loc.status)) { entry.reason = loc.status === LOC.WRONG ? 'WRONG_LOCATION' : 'AMBIGUOUS_LOCATION'; continue; }
    }
    entry.decision = 'auto_saved';
    entry.reason = 'ALL_GATES_PASSED';
    allowed[key] = value;
  }
  return { allowed, log };
}

// ── Happy hour ──────────────────────────────────────────────────────────────
const SPECIFIC_DEAL = /\$|\d+\s*%|\bhalf\b|\bbogo\b|\bfree\b|\boff\b|\b\d+(\.\d\d)?\b(?!\s*(am|pm|:))/i;
export function isGenericDeal(d) {
  const s = String(d || '').trim();
  if (!s) return true;
  if (/^happy hour\b/i.test(s) && !/\$/.test(s)) return true;
  return !SPECIFIC_DEAL.test(s.replace(/\d{1,2}(:\d\d)?\s*(am|pm)/gi, ''));
}

// Same price and mostly the same words ("$7 house sake (hot/cold)" vs "$7 House sake plain (Hot/cold)").
function sameDeal(a, b) {
  const price = (s) => (String(s).match(/\$\s*\d+(\.\d+)?|\d+\s*%/) || [''])[0].replace(/\s/g, '');
  if (price(a) !== price(b)) return false;
  const ta = new Set(flat(a).split(' ').filter((w) => w.length > 2));
  const tb = new Set(flat(b).split(' ').filter((w) => w.length > 2));
  const inter = [...ta].filter((w) => tb.has(w)).length;
  return inter / Math.max(1, Math.min(ta.size, tb.size)) >= 0.75;
}

// ── Phase 2.4.1: canonical days ─────────────────────────────────────────────
export const CANONICAL_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DAY_MAP = {
  mon: 'Mon', monday: 'Mon', tue: 'Tue', tues: 'Tue', tuesday: 'Tue', wed: 'Wed', weds: 'Wed', wednesday: 'Wed',
  thu: 'Thu', thur: 'Thu', thurs: 'Thu', thursday: 'Thu', fri: 'Fri', friday: 'Fri',
  sat: 'Sat', saturday: 'Sat', sun: 'Sun', sunday: 'Sun',
};
export function canonicalDay(d) {
  return DAY_MAP[String(d ?? '').trim().toLowerCase().replace(/\.$/, '')] || null;
}
// Representation only: maps each value, de-duplicates equivalents, keeps order; unknowns returned separately.
export function normalizeDays(list) {
  const days = [];
  const invalid = [];
  for (const d of Array.isArray(list) ? list : []) {
    const c = canonicalDay(d);
    if (!c) invalid.push(d);
    else if (!days.includes(c)) days.push(c);
  }
  return { days, invalid };
}

// ── Phase 2.4.1: same-deal detection ────────────────────────────────────────
const VALUE_RE = /\$\s*\d+(?:\.\d+)?|\d+\s*%|\bhalf[- ]?(?:price|priced|off)\b|\bbogo\b|\bbuy one,? get one\b/gi;
const DEAL_FILLER = new Set(['off', 'price', 'priced', 'only', 'all', 'our', 'the', 'and', 'each', 'per', 'select', 'any', 'for', 'happy', 'hour']);
const dealValue = (s) => (String(s).match(VALUE_RE) || []).map((v) => v.toLowerCase().replace(/\s/g, '')).sort().join('|');
export function dealKey(s) {
  return [...new Set(flat(String(s).replace(VALUE_RE, ' ')).replace(/\d+/g, ' ').split(' ')
    .filter((w) => w.length > 2 && !DEAL_FILLER.has(w)).map((w) => w.replace(/s$/, '')))].sort().join(' ');
}
// Strong matches only: identical item wording (after removing prices/filler).
export function classifyDeal(existingList, d) {
  const key = dealKey(d);
  const val = dealValue(d);
  let same = null;
  let conflict = null;
  for (const e of existingList || []) {
    if (key && dealKey(e) === key) {
      if (dealValue(e) === val) same = same || { kind: flat(e) === flat(d) ? 'SAME_DEAL_SAME_VALUE' : 'NEAR_DUPLICATE', existing: e };
      else if (dealValue(e) && val) conflict = conflict || e;
    } else if (!same && sameDeal(e, d)) same = { kind: 'NEAR_DUPLICATE', existing: e };
  }
  // A conflicting older value still on record is a conflict even if the current value is already there too.
  if (conflict) return { kind: 'SAME_DEAL_CONFLICTING_VALUE', existing: conflict, matched: same?.existing || null };
  return same || { kind: 'NEW_DISTINCT_DEAL' };
}

const toMinutes = (t) => {
  const m = String(t || '').trim().match(/^(\d{1,2})(?::(\d\d))?\s*(am|pm)$/i);
  if (!m) return null;
  let h = Number(m[1]) % 12;
  if (/pm/i.test(m[3])) h += 12;
  return h * 60 + Number(m[2] || 0);
};
// Long or early windows are not wrong — they just need a human before replacing anything.
export function unusualWindow(start, end) {
  const s = toMinutes(start);
  const e = toMinutes(end);
  if (s == null || e == null) return '';
  const len = e > s ? e - s : null;
  if (len != null && len > 300) return `window is ${Math.round(len / 60)}h`;
  if (s < 14 * 60) return `starts at ${start}`;
  return '';
}

// ── Phase 2.5: recent activity + 180-day source freshness ───────────────────
export const FRESHNESS_DAYS = 180;
// Google's live business status is the independent operating signal. A website loading is not.
export function activityStatus(places) {
  if (!places?.matched) return { status: 'RECENT_ACTIVITY_UNCONFIRMED', evidence: `no confirmed Google match (${places?.reason || 'n/a'})` };
  const s = places.business_status;
  if (s === 'CLOSED_PERMANENTLY') return { status: 'CONFIRMED_CLOSED', evidence: `Google businessStatus CLOSED_PERMANENTLY (${places.display_name}, ${places.matched_address})` };
  if (s === 'CLOSED_TEMPORARILY') return { status: 'POSSIBLY_CLOSED', evidence: `Google businessStatus CLOSED_TEMPORARILY (${places.display_name})` };
  if (s === 'OPERATIONAL') return { status: 'ACTIVE_RECENTLY_CONFIRMED', evidence: `Google businessStatus OPERATIONAL (${places.display_name}, ${places.matched_address})` };
  return { status: 'RECENT_ACTIVITY_UNCONFIRMED', evidence: 'Google match has no business status' };
}

// The source date must appear verbatim in the retrieved page text — never the retrieval date,
// a copyright/footer year, or a model guess. Returns { source_date, source_age_days, freshness_status, date_type }.
export function sourceFreshness(dateText, page, now = Date.now()) {
  const d = String(dateText || '').trim();
  if (!d || !page) return { source_date: '', source_age_days: null, freshness_status: 'UNDATED', date_type: '' };
  const hay = flat(page.text);
  if (!hay.includes(flat(d)) || /^(©|copyright)?\s*\d{4}$/i.test(d.replace(/\s/g, ''))) {
    return { source_date: d, source_age_days: null, freshness_status: 'DATE_UNCERTAIN', date_type: 'not_found_on_page_or_year_only' };
  }
  const t = Date.parse(d);
  if (!Number.isFinite(t)) return { source_date: d, source_age_days: null, freshness_status: 'DATE_UNCERTAIN', date_type: 'unparseable' };
  const age = Math.floor((now - t) / 86400000);
  return { source_date: d, source_age_days: age, freshness_status: age >= -31 && age <= FRESHNESS_DAYS ? 'CURRENT_0_180_DAYS' : 'STALE_OVER_180_DAYS', date_type: 'on_page_date' };
}

// proposed: { happy_hour_start, happy_hour_end, days, deals } (only keys the research returned)
// hh: { source_url, evidence, location_applicability }. Returns { updates, log }.
export function gateHappyHour(venue, proposed, hh, siteResearch) {
  const log = [];
  const keys = Object.keys(proposed || {});
  if (!keys.length) return { updates: {}, log };
  const base = {
    kind: 'happy_hour', source_url: hh?.source_url || '', evidence: hh?.evidence || '',
    existing: { start: venue.happy_hour_start || '', end: venue.happy_hour_end || '', days: venue.days || [], deals: venue.deals || [] },
    proposed,
  };
  const block = (reason, extra = {}) => { log.push({ ...base, ...extra, source_class: extra.source_class || 'C', action: 'blocked', reason }); return { updates: {}, log }; };
  const cls = sourceClass({ source_url: hh?.source_url }, siteResearch);
  if (cls !== 'B') return block('HAPPY_HOUR_NON_OFFICIAL_SOURCE', { source_class: cls });
  const shape = quoteShapeProblem(hh?.evidence);
  if (shape) return block(`INVALID_QUOTE (${shape})`, { source_class: cls });
  const page = findQuoteInPages(hh.evidence, siteResearch?.evidence || [], hh.source_url);
  if (!page) return block('INVALID_QUOTE (not found in retrieved page text)', { source_class: cls });
  const loc = locationStatus(venue, page, hh.evidence, siteResearch, hh.location_applicability);
  if (!locationOk(loc.status)) return block(loc.status === LOC.WRONG ? 'WRONG_LOCATION' : 'AMBIGUOUS_LOCATION', { source_class: cls, location_status: loc.status, location_why: loc.why });

  // Phase 2.5: time-sensitive facts need an on-page date within 180 days.
  const fresh = sourceFreshness(hh?.source_date, page);
  if (fresh.freshness_status !== 'CURRENT_0_180_DAYS') {
    return block(fresh.freshness_status === 'STALE_OVER_180_DAYS' ? 'STALE_SOURCE_REVIEW' : 'UNDATED_TIME_SENSITIVE_REVIEW', { source_class: cls, location_status: loc.status, ...fresh });
  }
  const ctx = { ...base, source_class: cls, source_url: page.url, location_status: loc.status, ...fresh };
  const updates = {};
  const notes = [];

  // Deals: drop generic text, merge with existing — never shrink a richer list. Same promotion
  // with a different value is a HAPPY_HOUR_DEAL_CONFLICT for review, never a second deal.
  if (proposed.deals) {
    const existing = venue.deals || [];
    const specific = proposed.deals.filter((d) => !isGenericDeal(d));
    const added = [];
    for (const d of specific) {
      const c = classifyDeal(existing, d);
      if (c.kind === 'NEW_DISTINCT_DEAL') added.push(d);
      else if (c.kind === 'SAME_DEAL_CONFLICTING_VALUE') {
        log.push({
          ...ctx, field: `happy_hour_deal_conflict:${dealKey(d)}`, action: 'conflict', reason: 'HAPPY_HOUR_DEAL_CONFLICT',
          existing_deal: c.existing, proposed_deal: d, existing_source: venue.field_provenance?.deals || '',
          recommended_action: cls === 'B' ? 'REPLACE_EXISTING_WITH_CURRENT_OFFICIAL' : 'VERIFY_MANUALLY',
        });
      }
    }
    if (added.length) { updates.deals = [...existing, ...added]; notes.push(existing.length ? `merged ${added.length} new deal(s)` : `added ${added.length} deal(s)`); }
    else notes.push(specific.length ? 'deals already on record (or in conflict review) — retained existing' : 'proposed deals were generic — retained existing');
  }
  // Days: compare in canonical form (Monday == Mon); never drop days already on record.
  if (proposed.days) {
    const existing = normalizeDays(venue.days).days;
    const prop = normalizeDays(proposed.days);
    if (prop.invalid.length) notes.push(`HAPPY_HOUR_DAY_REVIEW: unrecognized proposed day(s) ${prop.invalid.join(',')}`);
    const missing = existing.filter((d) => !prop.days.includes(d));
    const added = prop.days.filter((d) => !existing.includes(d));
    if (existing.length && missing.length) notes.push(`REGRESSION_PROTECTION: proposed days drop ${missing.join(',')} — retained existing`);
    else if (added.length) { updates.days = CANONICAL_DAYS.filter((d) => prop.days.includes(d)); notes.push(existing.length ? 'extended days' : 'added days'); }
  }
  // Times: unusual windows go to review instead of replacing anything.
  if (proposed.happy_hour_start || proposed.happy_hour_end) {
    const start = proposed.happy_hour_start || venue.happy_hour_start;
    const end = proposed.happy_hour_end || venue.happy_hour_end;
    const odd = unusualWindow(start, end);
    if (odd) notes.push(`UNUSUAL_HAPPY_HOUR_WINDOW (${odd}) — sent to review`);
    else {
      if (proposed.happy_hour_start && proposed.happy_hour_start !== venue.happy_hour_start) updates.happy_hour_start = proposed.happy_hour_start;
      if (proposed.happy_hour_end && proposed.happy_hour_end !== venue.happy_hour_end) updates.happy_hour_end = proposed.happy_hour_end;
      if (updates.happy_hour_start || updates.happy_hour_end) notes.push(venue.happy_hour_start ? 'updated times' : 'added times');
    }
  }
  const odd = notes.some((n) => /UNUSUAL|REGRESSION/.test(n));
  log.push({ ...ctx, action: Object.keys(updates).length ? (odd ? 'partial_write_rest_review' : 'written') : (odd ? 'review' : 'retained_existing'), reason: notes.join('; ') || 'no change', written: updates });
  return { updates, log };
}