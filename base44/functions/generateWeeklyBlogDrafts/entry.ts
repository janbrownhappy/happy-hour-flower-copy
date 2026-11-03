import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { secrets } from 'base44:runtime';
import { generateArticleRecord, suggestTopics } from '../../shared/blogGeneration.ts';
import { requireAutomationCaller } from '../../shared/automationAuth.ts';

// Runs from the "Weekly Blog Draft Generator" workflow (no user) or manually by an admin.
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const denied = await requireAutomationCaller(base44, req);
    if (denied) return denied;

    const body = await req.json().catch(() => ({}));
    const count = Math.min(Math.max(Number(body.count) || 2, 1), 5);

    const suggestions = await suggestTopics(base44, count + 2);
    const existing = await base44.asServiceRole.entities.BlogArticle.list('-created_date', 200);
    const usedTopics = new Set(
      existing.map((a) => (a.source_keyword || a.title || '').toLowerCase().trim()).filter(Boolean)
    );

    const created = [];
    for (const s of suggestions) {
      if (created.length >= count) break;
      if (!s.topic || usedTopics.has(s.topic.toLowerCase().trim())) continue;
      const article = await generateArticleRecord(base44, { topic: s.topic, angle: s.angle });
      created.push({ id: article.id, title: article.title });
    }

    return Response.json({
      success: true,
      created_count: created.length,
      created,
      message: `Generated ${created.length} draft article${created.length === 1 ? '' : 's'} for review.`,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}