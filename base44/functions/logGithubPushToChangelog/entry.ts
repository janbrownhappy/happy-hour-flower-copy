import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

const REPO = 'janbrownhappy/happy-hour-flower';
const CATEGORIES = ['feature', 'fix', 'design', 'content', 'backend', 'other'];

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const raw = await req.text();

    // Verify GitHub's HMAC signature
    const secret = Deno.env.get('GITHUB_WEBHOOK_SECRET');
    const sig = req.headers.get('x-hub-signature-256') || '';
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const mac = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(raw)));
    const expected = 'sha256=' + [...mac].map(b => b.toString(16).padStart(2, '0')).join('');
    if (!secret || sig.length !== expected.length || ![...sig].every((ch, i) => ch === expected[i])) {
      return Response.json({ error: 'invalid signature' }, { status: 401 });
    }

    if (req.headers.get('x-github-event') === 'ping') return Response.json({ ok: true });

    const body = raw.trim().startsWith('{')
      ? JSON.parse(raw)
      : JSON.parse(new URLSearchParams(raw).get('payload') || '{}');
    const repository = body.repository?.full_name || body.repository;
    const { ref, commits } = body;

    if (repository !== REPO) return Response.json({ skipped: 'other repository' });
    if (ref !== 'refs/heads/main') return Response.json({ skipped: 'not main branch' });

    const list = (commits || []).filter(c => c?.message && !/^Merge /.test(c.message));
    if (!list.length) return Response.json({ created: 0 });

    const res = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `You write a product changelog for "Happy Hour Flower", a happy hour discovery app.
Turn these code commits into changelog entries a non-technical business owner understands.
Merge commits that describe the same change into one entry. Skip trivial ones (typos, formatting, auto-saves with no meaningful change).
For each entry give: a short title (max 80 chars, no emojis), a 1-2 sentence plain-English description, a category (one of ${CATEGORIES.join(', ')}), and the timestamp of the latest commit it covers.

Commits:
${list.map(c => `- [${c.timestamp}] ${c.message}\n  files: ${[...(c.added || []), ...(c.modified || []), ...(c.removed || [])].slice(0, 15).join(', ')}`).join('\n')}`,
      response_json_schema: {
        type: 'object',
        properties: {
          entries: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                description: { type: 'string' },
                category: { type: 'string', enum: CATEGORIES },
                timestamp: { type: 'string' }
              }
            }
          }
        }
      }
    });

    const entries = (res?.entries || []).filter(e => e.title).map(e => ({
      title: e.title.slice(0, 200),
      description: e.description || '',
      category: CATEGORIES.includes(e.category) ? e.category : 'other',
      change_date: e.timestamp ? new Date(e.timestamp).toISOString() : new Date().toISOString(),
      source: 'auto'
    }));

    if (entries.length) await base44.asServiceRole.entities.ChangelogEntry.bulkCreate(entries);
    return Response.json({ created: entries.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}