import { useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { PUBLIC_PAGES } from '@/lib/webMcpPages';

// Registers read-only WebMCP tools for in-browser AI agents. No-op when unsupported.
const text = (data) => ({ content: [{ type: 'text', text: JSON.stringify(data) }] });

const loadArticles = async (limit) => {
  const rows = await base44.entities.BlogArticle.filter({ status: 'published' }, '-published_at', limit);
  return rows.map((a) => ({
    title: a.title, url: `${window.location.origin}/blog/${a.slug}`,
    excerpt: a.excerpt || '', category: a.category || '', published_at: a.published_at || '',
  }));
};

const TOOLS = [
  {
    name: 'search_site',
    description: 'Search Happy Hour Flower public pages and published blog articles by keyword. Returns matching titles, URLs and summaries.',
    inputSchema: { type: 'object', properties: { query: { type: 'string', description: 'Keywords to search for' } }, required: ['query'] },
    annotations: { readOnlyHint: true },
    execute: async ({ query }) => {
      const q = String(query || '').toLowerCase();
      const pages = PUBLIC_PAGES.filter((p) => `${p.title} ${p.summary}`.toLowerCase().includes(q))
        .map((p) => ({ ...p, url: window.location.origin + p.path }));
      const articles = (await loadArticles(200)).filter((a) => `${a.title} ${a.excerpt} ${a.category}`.toLowerCase().includes(q));
      return text({ pages, articles: articles.slice(0, 20) });
    },
  },
  {
    name: 'get_page',
    description: 'Get the title, full URL and summary of a Happy Hour Flower public page by its path (e.g. "/site/pricing").',
    inputSchema: { type: 'object', properties: { path: { type: 'string', description: 'Page path starting with /' } }, required: ['path'] },
    annotations: { readOnlyHint: true },
    execute: async ({ path }) => {
      const page = PUBLIC_PAGES.find((p) => p.path === path);
      return text(page ? { ...page, url: window.location.origin + page.path } : { error: 'Page not found', available: PUBLIC_PAGES.map((p) => p.path) });
    },
  },
  {
    name: 'list_blog_articles',
    description: 'List the most recent published Happy Hour Flower blog articles with titles, URLs and excerpts.',
    inputSchema: { type: 'object', properties: { limit: { type: 'number', description: 'How many articles to return, 1-50 (default 10)' } } },
    annotations: { readOnlyHint: true },
    execute: async ({ limit } = {}) => text({ articles: await loadArticles(Math.min(Math.max(Number(limit) || 10, 1), 50)) }),
  },
];

export default function WebMcpTools() {
  useEffect(() => {
    const mc = document.modelContext || navigator.modelContext;
    if (!mc || typeof mc.registerTool !== 'function') return;
    const controller = new AbortController();
    TOOLS.forEach((tool) => {
      try { mc.registerTool(tool, { signal: controller.signal }); } catch (e) { /* tool already registered */ }
    });
    return () => controller.abort();
  }, []);
  return null;
}