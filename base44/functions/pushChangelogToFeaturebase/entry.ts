import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { secrets } from 'base44:runtime';
import { pushEntryToFeaturebase } from '../../shared/featurebaseChangelog.ts';

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const adminEmail = secrets.get('ADMIN_EMAIL');
    if (user.role !== 'admin' && user.email !== adminEmail) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { entry_id } = await req.json();
    if (!entry_id) return Response.json({ error: 'entry_id is required' }, { status: 400 });

    const entry = await base44.asServiceRole.entities.ChangelogEntry.get(entry_id);
    if (!entry) return Response.json({ error: 'Changelog entry not found' }, { status: 404 });

    const apiKey = secrets.get('FEATUREBASE_API_KEY');
    if (!apiKey) {
      const msg = 'FEATUREBASE_API_KEY is not set';
      await base44.asServiceRole.entities.ChangelogEntry.update(entry_id, { featurebase_push_error: msg });
      return Response.json({ error: msg }, { status: 400 });
    }

    const r = await pushEntryToFeaturebase(base44, entry, apiKey);
    if (!r.ok) return Response.json({ error: r.error }, { status: 502 });

    return Response.json({
      success: true,
      updated: r.updated,
      featurebase_post_id: r.postId,
      featurebase_url: r.postUrl,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}