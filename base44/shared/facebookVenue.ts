// Facebook venue import helpers: detect a Facebook page link and read whatever
// the public page exposes (Open Graph tags) without logging in.

export function isFacebookUrl(url: string) {
  try { return /(^|\.)(facebook|fb)\.com$/i.test(new URL(url).hostname); } catch { return false; }
}

// Normalized page key used for duplicate matching: the numeric page id when present, else the page path.
export function facebookPagePath(url: string) {
  const u = new URL(url);
  const id = u.searchParams.get('id') || u.pathname.match(/(\d{8,})\/?$/)?.[1];
  if (id) return id;
  return u.pathname.replace(/\/+$/, '').toLowerCase();
}

// True when the link itself names the page (e.g. /hendrixgreenville), so it can be researched without reading it.
export function facebookUrlHasName(url: string) {
  return /[a-z]{3,}/i.test(new URL(url).pathname.replace(/\/(profile\.php|people|p|pages)\b/gi, ''));
}

const decode = (s: string) => s
  .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
  .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
  .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>');

const AGENTS = [
  'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
  'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
];

async function directHtml(url: string, ua: string) {
  const res = await fetch(url, { headers: { 'User-Agent': ua, 'Accept-Language': 'en-US' }, redirect: 'follow', signal: AbortSignal.timeout(12000) }).catch(() => null);
  return res?.ok ? { html: await res.text(), finalUrl: res.url } : null;
}

// Scrapfly (anti-bot proxy) — used when Facebook shows the server a login wall.
async function scrapflyHtml(url: string) {
  const key = Deno.env.get('SCRAPFLY_API_KEY');
  if (!key) return null;
  const qs = new URLSearchParams({ key, url, country: 'us', asp: 'true' });
  const res = await fetch(`https://api.scrapfly.io/scrape?${qs}`, { signal: AbortSignal.timeout(45000) }).catch(() => null);
  const data = await res?.json().catch(() => null);
  return data?.result?.content ? { html: data.result.content, finalUrl: data.result.url || url } : null;
}

function parse(page: { html: string; finalUrl: string } | null) {
  if (!page) return null;
  const { html } = page;
  const meta = (p: string) => {
    const m = html.match(new RegExp(`<meta[^>]+property=["']og:${p}["'][^>]*content=["']([^"']*)["']`, 'i'))
      || html.match(new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*property=["']og:${p}["']`, 'i'));
    return m ? decode(m[1]).trim() : '';
  };
  const raw = meta('title');
  if (!raw || /^(facebook|log in|log into)/i.test(raw)) return null;
  // Titles look like "Mo Mo's Sushi & More | Taylors SC" — split off the location hint.
  const [title, location = ''] = raw.split(/\s+\|\s+/);
  return { ok: true, title, location, description: meta('description'), page_url: page.finalUrl };
}

// Returns { ok, title, location, description } from the public page, or { ok: false, reason }.
export async function fetchFacebookPublicInfo(url: string) {
  for (const ua of AGENTS) {
    const info = parse(await directHtml(url, ua));
    if (info) return info;
  }
  const info = parse(await scrapflyHtml(url));
  if (info) return info;
  return { ok: false, reason: 'Facebook requires login to view this page' };
}