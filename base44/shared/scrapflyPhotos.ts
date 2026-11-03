// Scrapfly-backed photo candidate discovery for a venue's website and public social pages.
// Returns ranked image URL candidates only — never writes venue data.

const API = 'https://api.scrapfly.io/scrape';
const SKIP = /logo|icon|favicon|sprite|avatar|badge|emoji|pixel|spacer|placeholder|blank|loader|\.svg(\?|$)|\.gif(\?|$)|data:image|static\.xx\.fbcdn|rsrc\.php|profile_pic|s150x150|p50x50|1x1/i;

const decode = (s) => String(s || '').replace(/\\u0025/g, '%').replace(/\\u0026/g, '&').replace(/\\\//g, '/').replace(/&amp;/g, '&');

async function scrapeHtml(key, url, { renderJs = false, asp = false } = {}) {
  const qs = new URLSearchParams({ key, url, country: 'us' });
  if (renderJs) { qs.set('render_js', 'true'); qs.set('rendering_wait', '3000'); }
  if (asp) qs.set('asp', 'true');
  const res = await fetch(`${API}?${qs}`, { signal: AbortSignal.timeout(renderJs ? 90000 : 30000) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${data?.code || 'HTTP_' + res.status}: ${data?.message || 'Scrapfly request failed'}`.slice(0, 160));
  const r = data.result || {};
  if (r.status_code >= 400) throw new Error(`page returned ${r.status_code}`);
  return { html: r.content || '', finalUrl: r.url || url };
}

function abs(u, base) {
  try { const x = new URL(decode(u).trim(), base); return /^https?:$/.test(x.protocol) ? x.toString() : null; } catch { return null; }
}

// Pull image candidates out of a page with a rough quality score.
function extractImages(html, base, source) {
  const out = [];
  const add = (u, score) => { const a = abs(u, base); if (a && !SKIP.test(a)) out.push({ url: a, score, source }); };
  for (const m of html.matchAll(/<meta[^>]+(?:property|name)=["'](?:og:image(?::secure_url)?|twitter:image)["'][^>]*content=["']([^"']+)["']/gi)) add(m[1], 6);
  for (const m of html.matchAll(/<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name)=["'](?:og:image|twitter:image)["']/gi)) add(m[1], 6);
  // JSON blobs (JSON-LD, Instagram/Facebook embedded data)
  for (const m of html.matchAll(/"(?:display_url|image|contentUrl|thumbnailUrl|uri)"\s*:\s*"(https?:[^"]+?\.(?:jpe?g|png|webp)[^"]*)"/gi)) add(m[1], 5);
  // Social CDN images anywhere in the markup
  for (const m of html.matchAll(/https?:\\?\/\\?\/(?:scontent|instagram)[^"'\s<>)]+?\.(?:jpe?g|webp)[^"'\s<>)]*/gi)) add(m[0], 4);
  // Regular <img> tags (src / data-src / largest srcset entry)
  for (const m of html.matchAll(/<img\b[^>]*>/gi)) {
    const tag = m[0];
    const srcset = (tag.match(/(?:data-)?srcset=["']([^"']+)["']/i) || [])[1];
    const big = srcset ? srcset.split(',').map((s) => s.trim().split(/\s+/)[0]).pop() : null;
    const src = big || (tag.match(/(?:data-src|data-lazy-src|src)=["']([^"']+)["']/i) || [])[1];
    if (!src) continue;
    const w = Number((tag.match(/width=["']?(\d+)/i) || [])[1] || 0);
    if (w && w < 300) continue;
    const alt = (tag.match(/alt=["']([^"']*)["']/i) || [])[1] || '';
    add(src, 3 + (w >= 800 ? 1 : 0) + (/food|drink|bar|patio|interior|dining|cocktail|restaurant/i.test(alt + src) ? 1 : 0));
  }
  // Squarespace / Wix / CSS background images
  for (const m of html.matchAll(/background-image:\s*url\(['"]?([^'")]+)['"]?\)/gi)) add(m[1], 3);
  return out;
}

const PAGE_HINT = /gallery|photos|about|menu|events|private|space/i;

// Returns { candidates: [{url, score, source}], diagnostics: {source: reason} }
export async function scrapflyPhotoCandidates(venue) {
  const key = Deno.env.get('SCRAPFLY_API_KEY');
  const diagnostics = {};
  const candidates = [];
  if (!key) return { candidates, diagnostics: { scrapfly: 'not configured' } };

  // Website: homepage + up to 2 gallery-ish pages
  if (venue.website) {
    const home = /^https?:\/\//i.test(venue.website) ? venue.website : `https://${venue.website}`;
    try {
      let page = await scrapeHtml(key, home);
      let imgs = extractImages(page.html, page.finalUrl, 'website');
      if (imgs.length < 3) { page = await scrapeHtml(key, home, { renderJs: true }); imgs = extractImages(page.html, page.finalUrl, 'website'); }
      const host = new URL(page.finalUrl).hostname;
      const links = [...new Set([...page.html.matchAll(/href=["']([^"'#]+)["']/gi)].map((m) => abs(m[1], page.finalUrl))
        .filter((u) => u && new URL(u).hostname === host && PAGE_HINT.test(new URL(u).pathname)))].slice(0, 2);
      for (const l of links) {
        const p = await scrapeHtml(key, l, { renderJs: true }).catch(() => null);
        if (p) imgs.push(...extractImages(p.html, p.finalUrl, 'website').map((c) => ({ ...c, score: c.score + (/gallery|photos/i.test(l) ? 1 : 0) })));
      }
      candidates.push(...imgs);
      diagnostics.website = imgs.length ? `${imgs.length} candidates` : 'no usable images on site';
    } catch (e) { diagnostics.website = `scrape failed: ${e.message}`; }
  } else diagnostics.website = 'no website';

  // Public social pages — rendered with anti-bot protection
  for (const [source, url] of [['instagram', venue.instagram_url], ['facebook', venue.facebook_url]]) {
    if (!url) { diagnostics[source] = 'no link'; continue; }
    try {
      const target = source === 'facebook' ? url.replace(/\/$/, '') + '/photos' : url;
      const p = await scrapeHtml(key, target, { renderJs: true, asp: true });
      const imgs = extractImages(p.html, p.finalUrl, source).map((c) => ({ ...c, score: c.score - 1 }));
      candidates.push(...imgs);
      diagnostics[source] = imgs.length ? `${imgs.length} candidates` : 'page loaded but no public images (login wall?)';
    } catch (e) { diagnostics[source] = `scrape failed: ${e.message}`; }
  }
  return { candidates, diagnostics };
}