import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { secrets } from 'base44:runtime';
import { assertAdmin, suggestTopics } from '../../shared/blogGeneration.ts';

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const gate = await assertAdmin(base44, secrets.get('ADMIN_EMAIL'));
    if (!gate.ok) return gate.response;

    const body = await req.json().catch(() => ({}));
    const count = Math.min(Math.max(Number(body.count) || 6, 1), 10);

    const suggestions = await suggestTopics(base44, count);
    return Response.json({ suggestions });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}