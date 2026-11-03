import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { secrets } from 'base44:runtime';
import { requireAutomationCaller } from '../../shared/automationAuth.ts';

// One-way, read-only sync: WordPress -> Base44. Never writes to WordPress.
const WP = 'https://blog.happyhourflower.com/wp-json/wp/v2';
const PER_PAGE = 100;

const NAMED = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: '\u00a0', hellip: '…', ndash: '–',
  mdash: '—', lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”', laquo: '«', raquo: '»', copy: '©', reg: '®', trade: '™',
};
const HTML_SPECIAL = ['&', '<', '>', '"'];

// Decodes HTML entities. keepMarkup=true leaves &, <, >, " encoded so body HTML stays valid.
function decode(s, keepMarkup = false) {
  return String(s || '').replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
    let ch;
    if (e[0] === '#') {
      const n = e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      ch = Number.isFinite(n) && n > 0 ? String.fromCodePoint(n) : null;
    } else ch = NAMED[e.toLowerCase()] ?? null;
    if (ch === null || (keepMarkup && HTML_SPECIAL.includes(ch))) return m;
    return ch;
  });
}

// Security sanitization only — removes executable/embedded content, keeps formatting.
function sanitizeHtml(html) {
  return String(html || '')
    .replace(/<(script|style|iframe|object|embed|form|noscript|svg)\b[\s\S]*?<\/\1\s*>/gi, '')
    .replace(/<\/?(script|style|iframe|object|embed|link|meta|base|form|input|button)\b[^>]*>/gi, '')
    .replace(/\s+on[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/\s(href|src)\s*=\s*(["'])\s*(javascript|vbscript|data):[^"']*\2/gi, ' $1="#"')
    // Editor-only markup with no effect in the app's design — keeps large posts under the field size limit.
    .replace(/\sdata-[a-z0-9-]+=("[^"]*"|'[^']*')/gi, '')
    .replace(/\sstyle="(?:\s*(?:margin-left:\s*0px|text-align:\s*left)\s*;?)+\s*"/gi, '')
    .replace(/\sclass="wp-block-(?:paragraph|heading|list-item)"/gi, '')
    .replace(/\n{2,}/g, '\n');
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const plain = (html) => decode(String(html || '').replace(/<[^>]+>/g, ' ')).replace(/\s*\[…\]\s*$/, '').replace(/\s+/g, ' ').trim();
const gmt = (s) => (s ? new Date(s.endsWith('Z') ? s : `${s}Z`).toISOString() : '');

async function fetchJson(url) {
  let res;
  for (let attempt = 0; attempt < 3; attempt++) {
    res = await fetch(url, { signal: AbortSignal.timeout(25000), headers: { Accept: 'application/json' } });
    if (res.status !== 429 && res.status < 500) break;
    await sleep(3000 * (attempt + 1));
  }
  if (!res.ok) throw new Error(`WordPress ${res.status} for ${url}`);
  return { data: await res.json(), totalPages: Number(res.headers.get('x-wp-totalpages') || 1) };
}

async function importImage(base44, url) {
  let res;
  for (let attempt = 0; attempt < 3; attempt++) {
    res = await fetch(url, { signal: AbortSignal.timeout(25000) });
    if (res.status !== 429) break;
    await sleep(2000 * (attempt + 1)); // WordPress host rate-limits bursts of image downloads
  }
  if (!res.ok) throw new Error(`image ${res.status}`);
  const blob = await res.blob();
  const name = url.split('/').pop()?.split('?')[0] || 'wp-image.jpg';
  const { file_url } = await base44.asServiceRole.integrations.Core.UploadPublicFile({
    file: new File([blob], name, { type: blob.type || 'image/jpeg' }),
  });
  return file_url;
}

function mapPost(p) {
  const terms = (p._embedded?.['wp:term'] || []).flat();
  const cats = terms.filter((t) => t.taxonomy === 'category').map((t) => decode(t.name));
  return {
    title: plain(p.title?.rendered),
    slug: p.slug,
    body_html: sanitizeHtml(decode(p.content?.rendered, true)),
    excerpt: plain(p.excerpt?.rendered),
    published_at: gmt(p.date_gmt),
    wordpress_published_at: gmt(p.date_gmt),
    wordpress_modified_at: gmt(p.modified_gmt),
    wordpress_url: p.link,
    source_url: p.link,
    author: decode(p._embedded?.author?.[0]?.name || ''),
    category: cats.find((c) => c !== 'Uncategorized') || cats[0] || '',
    tags: terms.filter((t) => t.taxonomy === 'post_tag').map((t) => decode(t.name)),
  };
}

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const denied = await requireAutomationCaller(base44, req);
    if (denied) return denied;

    const body = await req.json().catch(() => ({}));
    const limit = Number(body?.limit) > 0 ? Number(body.limit) : 0; // test mode: import only N posts
    const now = new Date().toISOString();
    console.log(`[wp-sync] start ${now}${limit ? ` (limit ${limit})` : ''}`);

    const db = base44.asServiceRole.entities.BlogArticle;
    const all = await db.list('-created_date', 5000);
    const byWpId = {};
    const otherSlugs = new Set();
    for (const a of all) {
      if (a.source === 'wordpress' && a.external_post_id) byWpId[a.external_post_id] = a;
      else if (a.slug) otherSlugs.add(a.slug);
    }

    const s = { checked: 0, created: 0, updated: 0, unchanged: 0, skipped: 0, flagged: 0, errors: 0 };
    const errors = [];
    const seen = new Set();
    const unchangedIds = [];
    let complete = true;

    outer: for (let page = 1; ; page++) {
      let res;
      try {
        res = await fetchJson(`${WP}/posts?status=publish&per_page=${PER_PAGE}&page=${page}&_embed=1&orderby=id&order=asc`);
      } catch (e) {
        complete = false; s.errors++; errors.push(`Page ${page}: ${e.message}`);
        break;
      }
      if (!Array.isArray(res.data)) { complete = false; s.errors++; errors.push(`Page ${page}: malformed response`); break; }

      for (const p of res.data) {
        if (limit && s.checked >= limit) { complete = false; break outer; }
        s.checked++;
        const wpId = String(p?.id || '');
        if (!wpId || !p.slug) { s.skipped++; continue; }
        seen.add(wpId);
        const existing = byWpId[wpId];
        try {
          const fields = mapPost(p);
          if (!fields.title) { s.skipped++; continue; }
          if (otherSlugs.has(fields.slug)) fields.slug = `${fields.slug}-wp`; // never collide with local articles

          const changed = !existing || !existing.wordpress_modified_at ||
            new Date(fields.wordpress_modified_at) > new Date(existing.wordpress_modified_at) ||
            ['flagged', 'error'].includes(existing.wordpress_sync_status) ||
            (Number(p.featured_media) || 0) !== (existing.wordpress_featured_media_id ?? -1); // retry missing images
          if (!changed) { s.unchanged++; unchangedIds.push(existing.id); continue; }

          // Featured image: only re-download when the WordPress media id changes.
          const mediaId = Number(p.featured_media) || 0;
          if (!existing || existing.wordpress_featured_media_id !== mediaId) {
            const media = p._embedded?.['wp:featuredmedia']?.[0];
            if (mediaId && media?.source_url) {
              try {
                await sleep(400);
                fields.featured_image_url = await importImage(base44, media.source_url);
                fields.hero_image_alt = decode(media.alt_text || '') || fields.title;
                fields.wordpress_featured_media_id = mediaId;
              } catch (e) {
                errors.push(`Post ${wpId} image: ${e.message}`); // keep previous image, retry next run
              }
            } else if (!mediaId) {
              fields.featured_image_url = '';
              fields.wordpress_featured_media_id = 0;
            }
          }

          const meta = { wordpress_last_synced_at: now, wordpress_sync_note: '' };
          if (existing) {
            await db.update(existing.id, { ...fields, ...meta, wordpress_sync_status: 'updated' });
            s.updated++;
          } else {
            const rec = await db.create({
              ...fields, ...meta, source: 'wordpress', external_post_id: wpId,
              status: 'published', wordpress_sync_status: 'synced',
            });
            byWpId[wpId] = rec;
            s.created++;
          }
        } catch (e) {
          s.errors++; errors.push(`Post ${wpId}: ${e.message}`);
          if (existing) await db.update(existing.id, { wordpress_sync_status: 'error', wordpress_sync_note: String(e.message).slice(0, 300) }).catch(() => {});
        }
      }
      if (page >= res.totalPages || res.data.length === 0) break;
    }

    // Bump "last synced" on unchanged posts in bulk.
    for (let i = 0; i < unchangedIds.length; i += 500) {
      const ids = unchangedIds.slice(i, i + 500);
      await db.bulkUpdate(ids.map((id) => ({ id, wordpress_last_synced_at: now, wordpress_sync_status: 'synced' })));
    }

    // Posts no longer in the published feed: never deleted, only flagged — and only after a complete pass.
    if (complete) {
      for (const [wpId, a] of Object.entries(byWpId)) {
        if (seen.has(wpId) || a.wordpress_sync_status === 'flagged') continue;
        await db.update(a.id, {
          wordpress_sync_status: 'flagged', wordpress_last_synced_at: now,
          wordpress_sync_note: 'No longer in the published WordPress feed (draft, private, trashed or deleted). Review manually.',
        });
        s.flagged++;
      }
    }

    const message = `WordPress sync complete: ${s.created} added, ${s.updated} updated, ${s.unchanged} unchanged, ${s.flagged} flagged, ${s.errors} errors.`;
    console.log(`[wp-sync] end ${new Date().toISOString()} ${message}`, errors);
    return Response.json({ success: true, message, ...s, complete, errors });
  } catch (error) {
    console.error('[wp-sync] failed', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}