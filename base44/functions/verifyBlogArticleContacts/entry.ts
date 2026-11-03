import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { secrets } from 'base44:runtime';
import { sanitizeArticleHtml } from '../../shared/blogFactCheck.ts';

// Admin-only: researches every flagged contact detail in one blog article with a
// web-searching LLM and reports, per passage, whether the stated address / phone /
// website is correct plus a corrected replacement. Nothing is saved here — the
// admin reviews and applies the corrections in the editor.
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    const adminEmail = secrets.get('ADMIN_EMAIL') || '';
    const isOwner = adminEmail && user?.email?.toLowerCase() === adminEmail.toLowerCase();
    if (!user || (user.role !== 'admin' && !isOwner)) {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    const { article_id } = await req.json().catch(() => ({}));
    if (!article_id) return Response.json({ error: 'article_id is required' }, { status: 400 });

    const article = await base44.asServiceRole.entities.BlogArticle.get(article_id);
    if (!article) return Response.json({ error: 'Article not found' }, { status: 404 });

    const venues = await base44.asServiceRole.entities.Venue.filter({ status: 'active' }, 'name', 500);
    const verified = venues
      .filter((v) => v.contacts_verified)
      .map((v) => ({ name: v.name, address: v.address, phone: v.phone, website: v.website }));

    const { removed, removedBlocks } = sanitizeArticleHtml(article.body_html || '', verified);
    if (!removed.length) {
      return Response.json({ findings: [], message: 'No unverified contact details found.' });
    }

    const venueList = verified
      .map((v) => `- ${v.name} | ${v.address || 'no address'} | ${v.phone || 'no phone'} | ${v.website || 'no website'}`)
      .join('\n');

    const prompt = `You are a fact-checker for a local happy-hour guide covering venues in South Carolina, Georgia and Florida.

Article title: "${article.title}"

Each numbered passage below was flagged because it states a street address, phone number or website that does not match a verified venue record in our database.

Passages:
${removed.map((r, i) => `${i + 1}. ${r}`).join('\n')}

Our verified venue records (name | address | phone | website):
${venueList || '(none)'}

For EACH passage, research the business online (official website, Google Business Profile) and decide:
- verdict "correct" if the contact details stated are accurate for that business right now
- verdict "incorrect" if any detail is wrong or outdated — then give the accurate values
- verdict "unverifiable" if you cannot find an authoritative source

Rules:
- Never invent a detail. If no authoritative source confirms it, use "unverifiable".
- corrected_text must be the passage rewritten with accurate details, or the passage with the unverifiable detail removed. Keep the original wording and tone; plain text only, no HTML.
- Always cite the source you used (a URL or the name of the source).`;

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      add_context_from_internet: true,
      model: 'gemini_3_8_flash',
      response_json_schema: {
        type: 'object',
        properties: {
          findings: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                passage: { type: 'string' },
                business_name: { type: 'string' },
                verdict: { type: 'string', enum: ['correct', 'incorrect', 'unverifiable'] },
                verified_address: { type: 'string' },
                verified_phone: { type: 'string' },
                verified_website: { type: 'string' },
                corrected_text: { type: 'string' },
                source: { type: 'string' },
                notes: { type: 'string' },
              },
            },
          },
        },
      },
    });

    const findings = (result?.findings || []).map((f, i) => ({
      ...f,
      original: removed[i] || f.passage || '',
      original_html: removedBlocks[i] || '',
    }));

    return Response.json({ article_id, checked: removed.length, findings });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}