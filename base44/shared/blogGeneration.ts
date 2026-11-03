// Shared helpers for AI blog topic suggestion + article generation.
import { sanitizeArticleHtml } from './blogFactCheck.ts';

export async function assertAdmin(base44, adminEmail = '') {
  const user = await base44.auth.me().catch(() => null);
  if (!user) return { ok: false, response: Response.json({ error: 'Unauthorized' }, { status: 401 }) };
  const isOwnerEmail =
    adminEmail && user.email && user.email.toLowerCase() === adminEmail.toLowerCase();
  if (user.role !== 'admin' && !isOwnerEmail) {
    return { ok: false, response: Response.json({ error: 'Forbidden' }, { status: 403 }) };
  }
  return { ok: true, user };
}

// Small snapshot of the app's venues + markets so the LLM is grounded in the real local scene.
export async function loadMarketContext(base44) {
  const [venues, markets] = await Promise.all([
    base44.asServiceRole.entities.Venue.filter({ status: 'active' }, '-view_count', 40),
    base44.asServiceRole.entities.LocationMarket.filter({ is_active: true }, 'display_order', 25),
  ]);

  const marketNames = [...new Set(markets.map((m) => m.market_name).filter(Boolean))];
  const cities = [...new Set(venues.map((v) => v.city).filter(Boolean))].slice(0, 15);
  const categories = [...new Set(venues.map((v) => v.category).filter(Boolean))].slice(0, 15);
  // Contact details are only exposed to the writer when they have been verified against an
  // authoritative source. Unverified records contribute a name and category only.
  const verifiedVenues = venues.map((v) =>
    v.contacts_verified
      ? v
      : { ...v, address: null, phone: null, website: null }
  );

  const venueLines = verifiedVenues.slice(0, 25).map((v) => {
    const facts = [
      v.category && `category: ${v.category}`,
      v.city && `city: ${v.city}`,
      v.address && `address: ${v.address}`,
      v.phone && `phone: ${v.phone}`,
      v.website && `website: ${v.website}`,
    ].filter(Boolean);
    return `${v.name} — ${facts.join(' | ')}${v.address ? '' : ' | NO VERIFIED ADDRESS, PHONE OR WEBSITE — do not state any'}`;
  });

  return { marketNames, cities, categories, venueLines, venues: verifiedVenues };
}

export function contextBlock(ctx) {
  return [
    `Markets we cover: ${ctx.marketNames.join(', ') || 'Greenville / Upstate South Carolina'}.`,
    `Cities with listed venues: ${ctx.cities.join(', ') || 'Greenville'}.`,
    `Venue categories: ${ctx.categories.join(', ') || 'bars, restaurants'}.`,
    '',
    'VERIFIED VENUE RECORDS (the only source of truth for venue names, addresses, phone numbers and websites):',
    ctx.venueLines.map((l) => `- ${l}`).join('\n'),
  ].join('\n');
}

export function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80);
}

const ARTICLE_SCHEMA = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    slug: { type: 'string' },
    excerpt: { type: 'string' },
    body_html: { type: 'string' },
    category: { type: 'string' },
    tags: { type: 'array', items: { type: 'string' } },
    seo_title: { type: 'string' },
    seo_description: { type: 'string' },
    seo_keywords: { type: 'array', items: { type: 'string' } },
  },
  required: ['title', 'excerpt', 'body_html'],
};

const BRAND_CTA_HTML =
  '<h2>Find these happy hours on Happy Hour Flower</h2>' +
  '<p>The <strong>Happy Hour Flower</strong> app tracks live happy hour times, daily deals, and new venues near you — ' +
  'browse the full local guide at <a href="https://happyhourflower.com">happyhourflower.com</a>.</p>';

// Guarantees every generated article mentions the app and the website, even if the model skips it.
export function withBrandMention(html) {
  const body = String(html || '');
  const hasApp = /happy hour flower/i.test(body);
  const hasUrl = /happyhourflower\.com/i.test(body);
  if (hasApp && hasUrl) return body;
  return body + BRAND_CTA_HTML;
}

export async function generateArticleRecord(base44, { topic, angle }) {
  const ctx = await loadMarketContext(base44);

  const prompt = `You are the content editor for Happy Hour Flower, a local happy hour and dining discovery app.

${contextBlock(ctx)}

Write a complete, publish-ready blog article on this topic:
TOPIC: ${topic}
${angle ? `ANGLE: ${angle}` : ''}

ACCURACY RULES — these override every other instruction. Factual correctness matters more than completeness, length, or style:
- ZERO hallucinations. Every venue name, street address, phone number, website URL, neighborhood, and business detail you state must come VERBATIM from the VERIFIED VENUE RECORDS above. If a detail is not in those records, you may not state it — not even a plausible guess.
- NEVER state a specific price, happy hour time, day, menu item, or deal for a named venue. Those change constantly and are not verified here. Instead point readers to the app for current times and deals.
- Do NOT invent addresses, phone numbers, or URLs. The ONLY URL you may write that is not in the verified records is https://happyhourflower.com.
- Do NOT name a venue that does not appear in the verified records above, even if you believe it exists.
- Do not attribute quotes, awards, rankings, review scores, or "voted best" claims to anyone.
- When in doubt about ANY fact, omit it and write generally instead. An article with fewer specifics is correct; an article with an invented specific is unacceptable.
- Write no sentence you could not point to a verified record to support.
- PAIRING RULE: an address, phone number, or website may ONLY appear in the same paragraph or list item as the venue name it belongs to, copied character-for-character from that venue's own record. Never carry a detail over from a neighbouring venue. If you are listing several venues, give each venue its own <li> or <p>.
- An automated checker removes any paragraph whose address, phone or website does not match that venue's record. Omitting a detail is always safer than guessing it.

Requirements:
- 700-1100 words, warm and practical local-guide voice.
- body_html must be clean semantic HTML using only <h2>, <h3>, <p>, <ul>, <li>, <strong>, <em>, <a>. No <html>, <head>, <body>, <script>, style attributes, or markdown.
- Open with a short scene-setting paragraph (no <h1> — the page renders the title separately).
- Include 3-5 <h2> sections.
- End with an "<h2>Frequently asked questions</h2>" section of 3-4 questions, each as an <h3> question followed by a <p> answer, written so an AI assistant could quote the answer directly (AEO). Answers must obey the accuracy rules — no invented times, prices, or venue details.
- excerpt: one compelling sentence, max 200 characters.
- slug: lowercase, hyphenated, max 8 words, derived from the title.
- category: one of "Local Guides", "Happy Hour Tips", "Venue Spotlights", "Food & Drink", "City News".
- tags: 3-6 short lowercase tags.
- MANDATORY: naturally mention the Happy Hour Flower app at least twice in the body, and include the website address https://happyhourflower.com as a real <a> link at least once in the body (e.g. "find them on the Happy Hour Flower app at <a href="https://happyhourflower.com">happyhourflower.com</a>"). Never present the app or the site under any other name or URL.
- seo_title: max 60 characters. seo_description: max 155 characters. seo_keywords: 4-8 realistic search phrases including local intent.`;

  const out = await base44.asServiceRole.integrations.Core.InvokeLLM({
    prompt,
    // Intentionally no internet context: articles must be grounded ONLY in our verified venue records.
    model: 'gemini_3_8_flash',
    response_json_schema: ARTICLE_SCHEMA,
  });

  const title = out.title;
  const slug = slugify(out.slug || title);
  // Hard enforcement: drop any block whose contact details don't match our records.
  const checked = sanitizeArticleHtml(out.body_html || '', ctx.venues);
  const body_html = withBrandMention(checked.html);

  return await base44.asServiceRole.entities.BlogArticle.create({
    title,
    slug,
    excerpt: out.excerpt || '',
    body_html,
    category: out.category || 'Local Guides',
    tags: Array.isArray(out.tags) ? out.tags : [],
    author: 'Happy Hour Flower',
    status: 'scheduled',
    published_at: new Date().toISOString(),
    seo_title: out.seo_title || title,
    seo_description: out.seo_description || out.excerpt || '',
    seo_keywords: Array.isArray(out.seo_keywords) ? out.seo_keywords : [],
    source_keyword: topic,
    external_post_id: '',
  });
}

export async function suggestTopics(base44, count = 6) {
  const ctx = await loadMarketContext(base44);

  const out = await base44.asServiceRole.integrations.Core.InvokeLLM({
    prompt: `You are an SEO/AEO strategist for Happy Hour Flower, a local happy hour and dining discovery app.

${contextBlock(ctx)}

Using current local search interest, propose ${count} blog article topics that would realistically rank and get quoted by AI assistants. Favor question-shaped and "best X in Y" queries with clear local intent. Avoid duplicates and avoid generic national topics.

Only propose topics that can be written accurately using the verified venue records above — do not suggest topics that would require inventing prices, happy hour times, specific deals, rankings, or venues we do not list.

For each: a topic (the article's working title or question), an angle (one sentence on how to approach it), and a rationale (one sentence on why it will earn traffic).`,
    add_context_from_internet: true,
    model: 'gemini_3_8_flash',
    response_json_schema: {
      type: 'object',
      properties: {
        suggestions: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              topic: { type: 'string' },
              angle: { type: 'string' },
              rationale: { type: 'string' },
            },
            required: ['topic'],
          },
        },
      },
      required: ['suggestions'],
    },
  });

  return Array.isArray(out.suggestions) ? out.suggestions : [];
}