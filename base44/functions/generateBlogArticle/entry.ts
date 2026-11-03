import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { secrets } from 'base44:runtime';
import { assertAdmin, generateArticleRecord } from '../../shared/blogGeneration.ts';

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const gate = await assertAdmin(base44, secrets.get('ADMIN_EMAIL'));
    if (!gate.ok) return gate.response;

    const body = await req.json().catch(() => ({}));
    const topic = (body.topic || '').trim();
    if (!topic) return Response.json({ error: 'A topic is required' }, { status: 400 });

    const article = await generateArticleRecord(base44, { topic, angle: body.angle || '' });
    return Response.json({
      success: true,
      article_id: article.id,
      title: article.title,
      message: `Draft created: “${article.title}”`,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}