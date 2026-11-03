import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { stripHtml } from '@/lib/blogUtils';

const esc = (s) =>
  String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

function buildRss(articles, origin) {
  const items = articles
    .map(
      (a) => `  <item>
    <title>${esc(a.title)}</title>
    <link>${origin}/blog/${esc(a.slug)}</link>
    <guid isPermaLink="true">${origin}/blog/${esc(a.slug)}</guid>
    <description>${esc(a.excerpt || stripHtml(a.body_html).slice(0, 300))}</description>
    <pubDate>${new Date(a.published_at || a.created_date).toUTCString()}</pubDate>${
        a.category ? `\n    <category>${esc(a.category)}</category>` : ''
      }
  </item>`
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
<channel>
  <title>Happy Hour Flower Blog</title>
  <link>${origin}/blog</link>
  <description>Local happy hour guides, venue news, and answers to the questions people ask.</description>
  <language>en-us</language>
  <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${items}
</channel>
</rss>`;
}

function buildSitemap(articles, origin) {
  const urls = [
    `  <url>\n    <loc>${origin}/blog</loc>\n    <changefreq>daily</changefreq>\n    <priority>0.9</priority>\n  </url>`,
    ...articles.map(
      (a) => `  <url>
    <loc>${origin}/blog/${esc(a.slug)}</loc>
    <lastmod>${new Date(a.updated_date || a.published_at || a.created_date)
      .toISOString()
      .slice(0, 10)}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>`
    ),
  ].join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;
}

// Renders the RSS feed or the XML sitemap as plain text output for crawlers and feed readers.
export default function BlogFeed({ kind = 'rss' }) {
  const [xml, setXml] = useState('');

  useEffect(() => {
    base44.entities.BlogArticle.filter({ status: 'published' }, '-published_at', 500).then(
      (articles) => {
        const origin = window.location.origin;
        setXml(kind === 'sitemap' ? buildSitemap(articles, origin) : buildRss(articles, origin));
      }
    );
  }, [kind]);

  return (
    <pre className="whitespace-pre-wrap break-words p-4 text-xs font-mono allow-select">{xml}</pre>
  );
}