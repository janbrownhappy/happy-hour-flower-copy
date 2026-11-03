import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

import { secrets } from 'base44:runtime';

const WEBHOOK_TOKEN = secrets.get('SEOBUDDY_WEBHOOK_TOKEN') || '';
const SITE_URL = 'https://happyhourflower.base44.app';

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function hmacHex(secret, rawBody) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(rawBody));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
}

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

// True for loopback, private, link-local, CGNAT, metadata and other non-public addresses.
function isPrivateIp(ip) {
  const v = ip.toLowerCase().replace(/^\[|\]$/g, '');
  if (v.includes(':')) {
    if (v === '::' || v === '::1') return true;
    if (v.startsWith('::ffff:')) return isPrivateIp(v.slice(7));
    return /^(fc|fd|fe8|fe9|fea|feb)/.test(v);
  }
  const p = v.split('.').map(Number);
  if (p.length !== 4 || p.some(n => !Number.isInteger(n) || n < 0 || n > 255)) return true;
  const [a, b] = p;
  return a === 0 || a === 10 || a === 127 || a >= 224 ||
    (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 198 && (b === 18 || b === 19));
}

// Only public https hosts whose every resolved address is public may be fetched.
async function isSafeImageUrl(raw) {
  let u;
  try { u = new URL(String(raw)); } catch { return false; }
  if (u.protocol !== 'https:' || u.username || u.password || (u.port && u.port !== '443')) return false;
  const host = u.hostname.toLowerCase();
  if (!host.includes('.') || host === 'localhost' || /\.(local|internal|localhost)$/.test(host)) return false;
  if (/^[\d.]+$/.test(host) || host.includes(':') || host.startsWith('[')) return false; // no raw IPs
  const addrs = [];
  for (const type of ['A', 'AAAA']) {
    try { addrs.push(...await Deno.resolveDns(host, type)); } catch { /* no records of this type */ }
  }
  return addrs.length > 0 && addrs.every(a => !isPrivateIp(a));
}

// Download a remote image and re-host it in Base44 public storage (no hotlinking).
async function rehostImage(base44, url) {
  if (!url) return '';
  try {
    if (!(await isSafeImageUrl(url))) return '';
    // No redirects: a redirect could point back at an internal address.
    const res = await fetch(url, { redirect: 'manual' });
    if (!res.ok) return '';
    if (!(res.headers.get('content-type') || '').toLowerCase().startsWith('image/')) return '';
    if (Number(res.headers.get('content-length') || 0) > MAX_IMAGE_BYTES) return '';
    const blob = await res.blob();
    if (blob.size > MAX_IMAGE_BYTES) return '';
    const name = (new URL(url).pathname.split('/').pop() || 'image') || 'image';
    const file = new File([blob], name, { type: blob.type || 'image/jpeg' });
    const uploaded = await base44.asServiceRole.integrations.Core.UploadPublicFile({ file });
    return uploaded?.file_url || '';
  } catch (_e) {
    return '';
  }
}

export default async function (req) {
  try {
    if (req.method !== 'POST') {
      return Response.json({ error: 'Method not allowed' }, { status: 405 });
    }

    const auth = req.headers.get('authorization') || '';
    const provided = auth.replace(/^Bearer\s+/i, '').trim();
    if (!WEBHOOK_TOKEN || !provided || !timingSafeEqual(provided, WEBHOOK_TOKEN)) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rawBody = await req.text();

    // Optional HMAC-SHA256 verification over the raw body bytes
    const signature = req.headers.get('x-seobuddy-signature');
    if (signature) {
      const expected = await hmacHex(WEBHOOK_TOKEN, rawBody);
      if (!timingSafeEqual(signature.trim().toLowerCase(), expected)) {
        return Response.json({ error: 'Invalid signature' }, { status: 401 });
      }
    }

    const body = JSON.parse(rawBody || '{}');
    const event = body.event || req.headers.get('x-seobuddy-event') || '';

    if (event === 'test') {
      return Response.json({ url: `${SITE_URL}/test` });
    }

    const articleId = Number(body.id);
    if (!Number.isFinite(articleId)) {
      return Response.json({ error: 'Missing article id' }, { status: 400 });
    }

    const base44 = createClientFromRequest(req);
    const slug = body.slug || `seobuddy-${articleId}`;

    const [heroUrl, infographicUrl] = await Promise.all([
      rehostImage(base44, body.heroImageUrl),
      rehostImage(base44, body.infographicImageUrl),
    ]);

    const keywords = Array.isArray(body.keywords)
      ? body.keywords
      : String(body.metaKeywords || '').split(',').map(k => k.trim()).filter(Boolean);

    const record = {
      seobuddy_id: articleId,
      title: body.title || `Article ${articleId}`,
      slug,
      excerpt: body.metaDescription || '',
      body_html: body.content_html || '',
      featured_image_url: heroUrl,
      hero_image_alt: body.heroImageAlt || '',
      infographic_image_url: infographicUrl,
      faq_schema: Array.isArray(body.faqSchema) ? body.faqSchema : [],
      language_code: body.languageCode || 'en',
      source_article_id: Number.isFinite(Number(body.sourceArticleId)) ? Number(body.sourceArticleId) : undefined,
      status: 'published',
      published_at: body.publishedAt || new Date().toISOString(),
      seo_title: body.title || '',
      seo_description: body.metaDescription || '',
      seo_keywords: keywords,
      author: 'Jan Brown',
      source_url: body.published_url || '',
      external_last_modified: body.updatedAt || '',
      last_synced_at: new Date().toISOString(),
    };
    // Don't wipe an already-stored image when a delivery omits/fails the download
    if (!heroUrl) delete record.featured_image_url;
    if (!infographicUrl) delete record.infographic_image_url;

    const existing = await base44.asServiceRole.entities.BlogArticle.filter({ seobuddy_id: articleId });
    if (existing.length > 0) {
      await base44.asServiceRole.entities.BlogArticle.update(existing[0].id, record);
    } else {
      await base44.asServiceRole.entities.BlogArticle.create(record);
    }

    return Response.json({ url: body.published_url || `${SITE_URL}/blog/${slug}` });
  } catch (error) {
    console.error('seobuddyWebhook failed:', error?.message);
    return Response.json({ error: error?.message || 'Internal error' }, { status: 500 });
  }
}