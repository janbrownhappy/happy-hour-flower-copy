import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { secrets } from 'base44:runtime';
import { sanitizeArticleHtml } from '../../shared/blogFactCheck.ts';

// Read-only fact check: reports which blog articles contain contact details
// (phone / website / street address) that don't match a verified venue record.
// Nothing is modified — this only flags drafts for review before publishing.
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    const adminEmail = secrets.get('ADMIN_EMAIL') || '';
    const isOwner = adminEmail && user?.email?.toLowerCase() === adminEmail.toLowerCase();
    if (!user || (user.role !== 'admin' && !isOwner)) {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    const { articleIds = null } = await req.json().catch(() => ({}));

    const venues = await base44.asServiceRole.entities.Venue.filter({ status: 'active' }, 'name', 500);
    const verified = venues
      .filter((v) => v.contacts_verified)
      .map((v) => ({ name: v.name, address: v.address, phone: v.phone, website: v.website }));

    const articles = await base44.asServiceRole.entities.BlogArticle.list('-published_at', 500);
    const scope = Array.isArray(articleIds) && articleIds.length
      ? articles.filter((a) => articleIds.includes(a.id))
      : articles;

    const results = scope.map((a) => {
      const { removed } = sanitizeArticleHtml(a.body_html || '', verified);
      return { id: a.id, title: a.title, issues: removed };
    });

    return Response.json({
      checked: results.length,
      verifiedVenues: verified.length,
      flagged: results.filter((r) => r.issues.length),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}