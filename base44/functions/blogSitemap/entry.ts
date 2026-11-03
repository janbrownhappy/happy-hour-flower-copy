import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Public XML sitemap of all published blog articles. Always up to date.
const SITE = 'https://happyhourflower.com';

export default async function (req) {
  const base44 = createClientFromRequest(req);
  const res = await base44.asServiceRole.entities.BlogArticle.filter(
    { status: 'published' }, '-published_at', 1000, 0, ['slug', 'updated_date'],
  );
  const items = Array.isArray(res) ? res : (res?.items || []);
  const urls = items
    .filter((a) => a.slug)
    .map((a) => `  <url><loc>${SITE}/blog/${encodeURIComponent(a.slug)}</loc><lastmod>${String(a.updated_date || '').slice(0, 10)}</lastmod><priority>0.7</priority></url>`)
    .join('\n');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600' },
  });
}