// Scrapfly official-website research — DATA ACQUISITION ONLY.
//
// Fetches the venue's own website (homepage + up to MAX_PAGES-1 relevant internal pages)
// through the Scrapfly Web Scraping API and returns plain-text evidence for the existing
// Gemini analysis. It never classifies amenities and never writes venue data — every
// write still goes through enrichmentProtection.ts.
//
// The API key is read server-side only and is never logged or returned.

export const MAX_PAGES = 10;
const API = 'https://api.scrapfly.io/scrape';
const MAX_TEXT_PER_PAGE = 7000;
const MAX_TOTAL_TEXT = 45000;
const TIME_BUDGET_MS = 50000;
const MIN_USEFUL_TEXT = 400;
const PAGE_CONCURRENCY = 2;

const KEYWORDS = [
  'menu', 'menus', 'food', 'drink', 'drinks', 'cocktail', 'cocktails', 'beer', 'wine',
  'happy-hour', 'happyhour', 'happy hour', 'specials', 'special', 'deals', 'events', 'calendar',
  'music', 'entertainment', 'trivia', 'karaoke', 'brunch', 'about', 'contact', 'hours',
  'location', 'locations', 'reservations', 'reserve', 'patio', 'outdoor', 'rooftop',
  'private-events', 'private events', 'faq',
];
// Pages that very likely hold happy-hour / amenity facts get an extra boost.
const STRONG = ['happy', 'special', 'menu', 'drink', 'event', 'patio', 'faq', 'brunch'];
const SKIP_PATH = /\.(jpe?g|png|gif|webp|svg|mp4|mov|zip|ics)(\?|$)|\/(cart|checkout|account|login|wp-admin|feed|tag|author)\b|order|gift-?card|careers|jobs|privacy|terms/i;

const SOCIAL_HOSTS = ['facebook.com', 'instagram.com', 'tiktok.com', 'threads.net', 'youtube.com', 'x.com', 'twitter.com', 'yelp.com'];
const SOCIAL_PATTERNS = {
  instagram_url: /^https?:\/\/(www\.)?instagram\.com\/(?!p\/|reel|explore|share|accounts)[A-Za-z0-9_.]+\/?$/i,
  facebook_url: /^https?:\/\/(www\.|m\.)?facebook\.com\/(?!sharer|share|dialog|plugins|tr\b)[A-Za-z0-9_.\-/]+$/i,
  tiktok_url: /^https?:\/\/(www\.)?tiktok\.com\/@[A-Za-z0-9_.]+\/?$/i,
  threads_url: /^https?:\/\/(www\.)?threads\.net\/@[A-Za-z0-9_.]+\/?$/i,
  youtube_url: /^https?:\/\/(www\.)?youtube\.com\/(@|c\/|channel\/|user\/)[A-Za-z0-9_.\-]+\/?$/i,
  x_url: /^https?:\/\/(www\.)?(x|twitter)\.com\/(?!intent|share|home)[A-Za-z0-9_]+\/?$/i,
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const hostOf = (u) => { try { return new URL(u).hostname.replace(/^www\./, '').toLowerCase(); } catch { return ''; } };
const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
const digits = (s) => String(s || '').replace(/\D/g, '').slice(-10);

function decode(s) {
  return s.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#39;|&apos;|&rsquo;|&#8217;/g, "'")
    .replace(/&quot;|&ldquo;|&rdquo;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#\d+;/g, ' ');
}

export function htmlToText(html) {
  return decode(String(html || '')
    .replace(/<(script|style|noscript|svg|iframe)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<\/(p|div|li|h\d|tr|section|article|br)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' '))
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n+/g, '\n')
    .trim();
}

const titleOf = (html) => decode(((String(html).match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || '').trim()).slice(0, 150);

function extractLinks(html, baseUrl) {
  const out = [];
  const re = /<a\s[^>]*href\s*=\s*["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = re.exec(String(html)))) {
    try {
      const url = new URL(decode(m[1].trim()), baseUrl);
      if (!/^https?:$/.test(url.protocol)) continue;
      url.hash = '';
      out.push({ url: url.toString(), text: htmlToText(m[2]).slice(0, 80), index: m.index });
    } catch { /* malformed href */ }
  }
  return out;
}

function scoreLink(link) {
  const hay = `${link.url} ${link.text}`.toLowerCase();
  let score = 0;
  for (const k of KEYWORDS) if (hay.includes(k)) score += 1;
  for (const k of STRONG) if (hay.includes(k)) score += 2;
  return score;
}

// ── Scrapfly call with small, bounded retries for temporary failures only ──
async function scrapeOnce(key, url, renderJs) {
  const qs = new URLSearchParams({ key, url, country: 'us' });
  if (renderJs) { qs.set('render_js', 'true'); qs.set('rendering_wait', '2000'); }
  const res = await fetch(`${API}?${qs.toString()}`, { signal: AbortSignal.timeout(renderJs ? 60000 : 30000) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(`${data?.code || 'HTTP_' + res.status}: ${data?.message || 'Scrapfly request failed'}`.slice(0, 200));
    err.retryable = TRANSIENT_STATUS.has(res.status);
    throw err;
  }
  const r = data.result || {};
  if (r.status_code >= 400) {
    const err = new Error(`Upstream returned ${r.status_code}`);
    err.retryable = TRANSIENT_STATUS.has(r.status_code);
    throw err;
  }
  return { content: r.content || '', contentType: String(r.response_headers?.['content-type'] || r.content_type || ''), finalUrl: r.url || url };
}

// Only transient failures are retried (max 2 retries after the first request). 404s, bad
// URLs, DNS failures and other permanent errors fail immediately.
const TRANSIENT_STATUS = new Set([429, 500, 502, 503, 504]);
const isTransientNetwork = (err) =>
  err?.name === 'TimeoutError' || err?.name === 'AbortError' || /timed? ?out|connection (reset|refused|closed)|ECONNRESET/i.test(err?.message || '');

async function scrape(key, url, renderJs, diag) {
  for (let i = 0; i < 3; i++) {
    try {
      diag.requests++;
      if (i > 0) diag.retries = (diag.retries || 0) + 1;
      return await scrapeOnce(key, url, renderJs);
    } catch (err) {
      const transient = err.retryable === true || (err.retryable === undefined && isTransientNetwork(err));
      if (!transient || i === 2) {
        diag[transient ? 'transient_failures' : 'permanent_failures'] = (diag[transient ? 'transient_failures' : 'permanent_failures'] || 0) + 1;
        throw err;
      }
      // Throttling gets a longer pause than other transient errors.
      diag.throttled = (diag.throttled || 0) + (/429|THROTTL|CONCURRENCY/i.test(err.message) ? 1 : 0);
      await sleep((/429|THROTTL|CONCURRENCY/i.test(err.message) ? 4000 : 1500) * Math.pow(2, i));
    }
  }
}

// Normal retrieval first; browser rendering only when the plain HTML has no usable text.
async function fetchPage(key, url, diag) {
  let r = await scrape(key, url, false, diag);
  if (/pdf/i.test(r.contentType) || /\.pdf(\?|$)/i.test(url)) return { pdf: true, url };
  let text = htmlToText(r.content);
  let rendered = false;
  if (text.length < MIN_USEFUL_TEXT) {
    r = await scrape(key, url, true, diag);
    text = htmlToText(r.content);
    rendered = true;
    diag.rendered_count++;
  }
  return { url: r.finalUrl || url, html: r.content, text, title: titleOf(r.content), rendered };
}

// Does this site actually belong to the venue?
function validateWebsite(venue, places, homeUrl, text) {
  const t = text.toLowerCase();
  const tDigits = text.replace(/\D/g, '');
  const name = norm(venue?.name).replace(/^the/, '');
  const nameTokens = String(venue?.name || '').toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 2 && !['the', 'and', 'bar', 'grill', 'restaurant', 'kitchen'].includes(w));
  const tokenHits = nameTokens.filter((w) => t.includes(w)).length;
  const phones = [venue?.phone, places?.fields?.phone].map(digits).filter((d) => d.length === 10);
  const streetNum = (String(venue?.address || places?.fields?.address || '').match(/\d{1,6}/) || [''])[0];
  const streetWord = (String(venue?.address || places?.fields?.address || '').match(/\d+\s+([A-Za-z]{3,})/) || [])[1];
  const city = String(venue?.city || places?.fields?.city || '').toLowerCase();

  const signals = {
    google_website_match: !!places?.fields?.website && hostOf(places.fields.website) === hostOf(homeUrl),
    name_match: (name && norm(t).includes(name)) || (nameTokens.length > 0 && tokenHits >= Math.ceil(nameTokens.length / 2)),
    phone_match: phones.some((p) => tDigits.includes(p)),
    address_match: !!(streetNum && streetWord && t.includes(streetNum) && t.includes(streetWord.toLowerCase())),
    city_match: !!city && t.includes(city),
  };
  const confident = signals.google_website_match
    || (signals.name_match && (signals.phone_match || signals.address_match))
    || (signals.name_match && signals.city_match && !venue?.phone && !venue?.address);
  return { confident, signals };
}

// Phase 2.4.1: where on the page a link sits. Header/footer/nav links are site-wide (brand) chrome.
function linkContext(html, idx, isLocationPage) {
  const before = String(html).slice(0, idx).toLowerCase();
  const inside = (tag) => before.lastIndexOf(`<${tag}`) > before.lastIndexOf(`</${tag}>`);
  if (inside('footer')) return 'GLOBAL_FOOTER';
  if (inside('header')) return 'GLOBAL_HEADER';
  if (inside('nav')) return 'BRAND_NAVIGATION';
  const tail = before.slice(-1500);
  if (/(class|id)=["'][^"']*footer/.test(tail)) return 'GLOBAL_FOOTER';
  if (/(class|id)=["'][^"']*(header|navbar|menu-bar)/.test(tail)) return 'GLOBAL_HEADER';
  if (!isLocationPage) return 'OTHER';
  return /(class|id)=["'][^"']*(contact|address|location-info|hours)/.test(tail) ? 'LOCATION_CONTACT_SECTION' : 'LOCATION_CONTENT';
}

function collectSocial(html, baseUrl, into, diag, city) {
  const isLocationPage = !!city && norm(baseUrl).includes(city);
  for (const l of extractLinks(html, baseUrl)) {
    const u = l.url.split('?')[0];
    for (const [field, re] of Object.entries(SOCIAL_PATTERNS)) {
      if (!re.test(u)) continue;
      const url = u.replace(/\/$/, '');
      const context = linkContext(html, l.index, isLocationPage);
      if (diag) {
        diag.social_candidates = diag.social_candidates || [];
        if (!diag.social_candidates.some((c) => c.url === url && c.page === baseUrl)) diag.social_candidates.push({ field, url, page: baseUrl, context });
        diag.social_context = diag.social_context || {};
      }
      const prior = diag?.social_context?.[field]?.context;
      const upgrade = prior && !/^LOCATION/.test(prior) && /^LOCATION/.test(context);
      if (!into[field] || upgrade) { into[field] = url; if (diag) diag.social_context[field] = { context, page: baseUrl }; }
    }
  }
}

function newDiag() {
  return {
    attempted: false, status: '', official_website: '', validation: null, pages: [], skipped: [],
    pdf_links: [], social_links: {}, errors: [], rendered_count: 0, requests: 0, multi_location: false,
    phone_on_site: false, researched_at: new Date().toISOString(), duration_ms: 0,
  };
}

// Main entry. venue: { name, address, city, phone, website }. places: runPlacesPrepass result.
// Never throws — any failure resolves to a diagnostic status so enrichment continues.
export async function researchOfficialWebsite(venue, places, { maxPages = MAX_PAGES } = {}) {
  const started = Date.now();
  const diag = newDiag();
  const evidence = [];
  const done = (status) => { diag.status = status; diag.duration_ms = Date.now() - started; return { diag, evidence }; };

  const key = Deno.env.get('SCRAPFLY_API_KEY');
  if (!key) return done('NOT_CONFIGURED');
  const candidate = String(venue?.website || places?.fields?.website || '').trim();
  if (!candidate) return done('NO_WEBSITE');
  let homeUrl;
  try { homeUrl = new URL(/^https?:\/\//i.test(candidate) ? candidate : `https://${candidate}`).toString(); } catch { return done('INVALID_URL'); }
  if (SOCIAL_HOSTS.some((h) => hostOf(homeUrl).endsWith(h))) return done('WEBSITE_IS_SOCIAL_PROFILE');

  diag.attempted = true;
  diag.official_website = homeUrl;
  const limit = Math.min(Math.max(1, maxPages), MAX_PAGES);
  const fetched = new Set();
  let total = 0;

  let home;
  try {
    home = await fetchPage(key, homeUrl, diag);
    fetched.add(homeUrl);
  } catch (err) {
    diag.errors.push({ url: homeUrl, error: err.message });
    // A blocked scrape is not evidence against an admin-confirmed website.
    if (/\b403\b/.test(err.message) && venue?.field_provenance?.website === 'hhf_admin') {
      return done('OFFICIAL_WEBSITE_CONFIRMED_SCRAPE_BLOCKED');
    }
    return done('SCRAPE_FAILED');
  }
  if (home.pdf) return done('SCRAPE_FAILED');

  const validation = validateWebsite(venue, places, home.url, home.text);
  diag.validation = validation;
  diag.pages.push({ url: home.url, title: home.title, chars: home.text.length, rendered: home.rendered });
  if (!validation.confident) return done('OFFICIAL_WEBSITE_UNCERTAIN');

  const addEvidence = (p) => {
    const slice = p.text.slice(0, MAX_TEXT_PER_PAGE);
    total += slice.length;
    evidence.push({ url: p.url, title: p.title, text: slice });
  };
  addEvidence(home);
  collectSocial(home.html, home.url, diag.social_links, diag, norm(venue?.city));

  // Rank same-site links; dedupe; PDFs recorded for review, not fetched.
  const homeHost = hostOf(home.url);
  const links = extractLinks(home.html, home.url);
  // Strong multi-location signals only: a locations directory, a location picker, or
  // several location-specific URLs. A singular "/location" contact page is NOT one.
  const locUrls = new Set(links.map((l) => (l.url.match(/\/locations\/([^/?#]+)/i) || [])[1]).filter(Boolean));
  diag.multi_location = locUrls.size >= 2 || links.some((l) =>
    /\/locations\/?(\?|#|$)/i.test(l.url) || /\b(our|all|view|find a|choose a?|select a?) locations?\b/i.test(l.text));
  diag.location_signals = { location_urls: [...locUrls].slice(0, 5), multi_link: diag.multi_location };
  const citySlug = norm(venue?.city);
  const seen = new Set([home.url.replace(/\/$/, ''), homeUrl.replace(/\/$/, '')]);
  const ranked = [];
  for (const l of links) {
    const clean = l.url.replace(/\/$/, '');
    if (hostOf(l.url) !== homeHost || seen.has(clean)) continue;
    seen.add(clean);
    if (SKIP_PATH.test(l.url)) { diag.skipped.push(l.url); continue; }
    let score = scoreLink(l);
    if (score === 0) { diag.skipped.push(l.url); continue; }
    if (diag.multi_location && citySlug && norm(l.url + l.text).includes(citySlug)) score += 5;
    if (/\.pdf(\?|$)/i.test(l.url)) { diag.pdf_links.push(l.url); continue; }
    ranked.push({ ...l, score });
  }
  ranked.sort((a, b) => b.score - a.score);
  const queue = ranked.slice(0, limit - 1);
  diag.skipped.push(...ranked.slice(limit - 1).map((l) => l.url));

  // Fetch 2 pages at a time with a short pause between batches (throttling control);
  // stop on page limit, text budget or time budget.
  for (let i = 0; i < queue.length; i += PAGE_CONCURRENCY) {
    if (i > 0) await sleep(400);
    if (total >= MAX_TOTAL_TEXT || Date.now() - started > TIME_BUDGET_MS) {
      diag.skipped.push(...queue.slice(i).map((l) => l.url));
      break;
    }
    const batch = queue.slice(i, i + PAGE_CONCURRENCY).filter((l) => !fetched.has(l.url));
    batch.forEach((l) => fetched.add(l.url));
    const results = await Promise.allSettled(batch.map((l) => fetchPage(key, l.url, diag)));
    results.forEach((r, j) => {
      const url = batch[j].url;
      if (r.status === 'rejected') { diag.errors.push({ url, error: r.reason?.message || 'failed' }); return; }
      if (r.value.pdf) { diag.pdf_links.push(url); return; }
      diag.pages.push({ url: r.value.url, title: r.value.title, chars: r.value.text.length, rendered: r.value.rendered });
      if (r.value.text.length >= 100) addEvidence(r.value);
      collectSocial(r.value.html, r.value.url, diag.social_links, diag, norm(venue?.city));
    });
  }

  const allDigits = evidence.map((e) => e.text).join(' ').replace(/\D/g, '');
  const ourPhone = digits(venue?.phone);
  diag.phone_on_site = ourPhone.length === 10 && allDigits.includes(ourPhone);
  Object.assign(diag, classifyLocationStructure(venue, evidence, diag.multi_location));
  return done(evidence.length ? 'OFFICIAL_WEBSITE_CONFIRMED' : 'NO_USEFUL_CONTENT');
}

// SINGLE_LOCATION_CONFIRMED: no multi-location signal and every street address / phone on the
// site is one consistent location. MULTI_LOCATION_CONFIRMED: directory/picker/several
// location URLs, or several operating street addresses. Otherwise LOCATION_STRUCTURE_UNCERTAIN.
const STREET = /\b(\d{2,6})\s+(?:[NSEW]\.?\s+)?([A-Z][A-Za-z]+)(?:\s+[A-Z][A-Za-z]+)?\s+(?:St|Street|Rd|Road|Ave|Avenue|Blvd|Boulevard|Dr|Drive|Hwy|Highway|Pkwy|Parkway|Way|Ln|Lane|Ct|Pl|Place|Pike|Cir)\b/g;
const PHONE = /\(?\b(\d{3})\)?[\s.-]?(\d{3})[\s.-](\d{4})\b/g;
export function classifyLocationStructure(venue, evidence, multiSignal) {
  const streets = new Set();
  const phones = new Set();
  for (const p of evidence || []) {
    for (const m of p.text.matchAll(STREET)) streets.add(`${m[1]} ${m[2].toLowerCase()}`);
    for (const m of p.text.matchAll(PHONE)) phones.add(`${m[1]}${m[2]}${m[3]}`);
  }
  const ourNum = (String(venue?.address || '').match(/\d{1,6}/) || [''])[0];
  const others = [...streets].filter((s) => !ourNum || !s.startsWith(`${ourNum} `));
  const evidenceSummary = { street_addresses: [...streets].slice(0, 6), phones: [...phones].slice(0, 6) };
  if (multiSignal) return { location_structure: 'MULTI_LOCATION_CONFIRMED', location_evidence: { ...evidenceSummary, reason: 'locations directory/picker or several location URLs' } };
  if (others.length >= 2) return { location_structure: 'MULTI_LOCATION_CONFIRMED', location_evidence: { ...evidenceSummary, reason: `${others.length + (streets.size - others.length)} distinct street addresses` } };
  if (streets.size <= 1 && phones.size <= 2 && (streets.size === 1 || phones.size >= 1)) {
    return { location_structure: 'SINGLE_LOCATION_CONFIRMED', location_evidence: { ...evidenceSummary, reason: 'one consistent address/phone, no locations directory' } };
  }
  return { location_structure: 'LOCATION_STRUCTURE_UNCERTAIN', location_evidence: { ...evidenceSummary, reason: streets.size ? 'addresses inconsistent but no multi-location signal' : 'no address or phone found on retrieved pages' } };
}

// Lightweight check used by contact verification before clearing data: homepage plus one
// contact-type page at most (≤2 pages, normal retrieval first).
export async function confirmContactsOnWebsite(venue) {
  const { diag } = await researchOfficialWebsite(venue, null, { maxPages: 2 });
  const confirmed = diag.status === 'OFFICIAL_WEBSITE_CONFIRMED';
  return {
    website_confirmed: confirmed,
    phone_confirmed: confirmed && diag.phone_on_site,
    diag,
  };
}

// Prompt block handed to the existing Gemini analysis.
export function renderEvidenceForPrompt(research, venue) {
  const d = research?.diag;
  if (!d || d.status !== 'OFFICIAL_WEBSITE_CONFIRMED') {
    return `=== OFFICIAL WEBSITE RESEARCH: ${d?.status || 'NOT_RUN'} ===
No validated official-website content is available for this run; rely on your normal research.`;
  }
  const pages = research.evidence.map((e) => `--- PAGE: ${e.title || '(untitled)'} | ${e.url} ---\n${e.text}`).join('\n\n');
  const socials = Object.entries(d.social_links);
  return `=== OFFICIAL WEBSITE CONTENT (retrieved directly from the venue's own site — highest-priority external evidence) ===
Official website: ${d.official_website}
${d.multi_location ? `WARNING: this site covers MULTIPLE LOCATIONS. Only use statements that apply to THIS venue (${venue?.address || ''}, ${venue?.city || ''}) or clearly apply to every location. If applicability is unclear, use confidence below 0.5.\n` : ''}${socials.length ? `Social profiles linked from the official website: ${socials.map(([k, v]) => `${k}=${v}`).join(', ')}\n` : ''}${d.pdf_links.length ? `PDF menus linked (not read): ${d.pdf_links.slice(0, 5).join(', ')}\n` : ''}
OFFICIAL WEBSITE EVIDENCE RULES:
- For any amenity or field supported by the pages below, set source_type "official_website", source_url to the exact page URL, evidence to text COPIED EXACTLY from that page (max 200 chars, at least a phrase — never a URL, site name, page title, or your own paraphrase), and source to "Official Website". Evidence is machine-checked against the page; a paraphrase is rejected.
- location_applicability: "this_location" only when the page is specific to ${venue?.city || 'this venue'} / this address; "all_locations" only when the text explicitly says every location; "other_location" when it is about another city/location; else "unclear".
- Map by MEANING, not related words: karaoke is not live music; a distillery is not a brewery; one non-alcoholic product is not a non-alcoholic program; "first come, first served" is first_come_first_served — it is not walk_ins_welcome, and only explicit "no reservations"/"walk-in only" text supports walk_in_only. Never tag two contradictory amenities from one phrase.
- confidence (0-1) reflects the evidence strength: explicit direct statement 0.85-1.0; indirect/implied 0.5-0.7; vague marketing language below 0.5. Do not invent precision.
- ABSENCE IS NOT EVIDENCE: never list an amenity in contradicted_amenities just because these pages don't mention it. Only an explicit statement (e.g. "no dogs allowed") counts.
- Map website wording onto EXISTING catalog slugs (e.g. "bring your pup to the patio" → dog_friendly + outdoor_patio; "catch the game on our big screens" → the existing sports-watching slug). Only truly uncovered concepts go to proposed_amenities.
- Happy hour: extract days, start/end times and deals only from explicit text on these pages, into the existing fields, and fill happy_hour_source_url, happy_hour_evidence (exact copied text) and happy_hour_location. Third-party happy-hour info is not usable for saving.

${pages}`;
}

// Fill social-link suggestions the analysis left empty with links the official site itself
// publishes. Destination social pages are never fetched.
export function applySocialLinks(fields, research) {
  const out = { ...(fields || {}) };
  for (const [key, url] of Object.entries(research?.diag?.social_links || {})) {
    const v = out[key]?.value;
    if (v == null || v === '') out[key] = { value: url, source: 'Official Website (linked from site)', source_url: research.diag.official_website };
  }
  return out;
}

// Diagnostics safe to return/store: no page bodies, no key.
export function publicDiagnostics(research) {
  const d = research?.diag || newDiag();
  return { ...d, evidence_pages: (research?.evidence || []).length };
}

// Persist one diagnostics row per run. Never throws.
export async function logWebsiteResearch(base44, venue, research, origin) {
  try {
    const d = publicDiagnostics(research);
    await base44.asServiceRole.entities.WebsiteResearchLog.create({
      venue_id: venue?.id || '',
      venue_name: venue?.name || '',
      origin,
      status: d.status,
      attempted: d.attempted,
      official_website: d.official_website,
      pages_fetched: d.pages.length,
      urls_fetched: d.pages.map((p) => p.url),
      pages_skipped: d.skipped.length,
      pdf_links: d.pdf_links,
      rendered_count: d.rendered_count,
      requests: d.requests,
      errors: [
        ...d.errors.map((e) => `${e.url}: ${e.error}`).slice(0, 20),
        ...(d.retries || d.permanent_failures || d.transient_failures
          ? [`[stats] retries=${d.retries || 0} throttled=${d.throttled || 0} permanent_failures=${d.permanent_failures || 0} transient_failures=${d.transient_failures || 0}`]
          : []),
      ],
      evidence_pages: d.evidence_pages,
      multi_location: d.multi_location,
      social_links: d.social_links,
      validation: d.validation || {},
      duration_ms: d.duration_ms,
      researched_at: d.researched_at,
    });
  } catch (err) {
    console.error('logWebsiteResearch failed:', err.message);
  }
}