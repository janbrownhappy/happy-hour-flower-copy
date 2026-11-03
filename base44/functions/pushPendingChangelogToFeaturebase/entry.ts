import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { secrets } from 'base44:runtime';
import { pushEntryToFeaturebase } from '../../shared/featurebaseChangelog.ts';
import { requireAutomationCaller } from '../../shared/automationAuth.ts';

// Pushes every changelog entry not yet sent to Featurebase (oldest first).
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);

    // Scheduled runs call as the app admin; anonymous and non-admin callers are rejected.
    const denied = await requireAutomationCaller(base44, req);
    if (denied) return denied;

    const apiKey = secrets.get('FEATUREBASE_API_KEY');
    if (!apiKey) return Response.json({ error: 'FEATUREBASE_API_KEY is not set' }, { status: 400 });

    const res = await base44.asServiceRole.entities.ChangelogEntry.filter(
      { $or: [{ featurebase_pushed_at: { $exists: false } }, { featurebase_pushed_at: null }, { featurebase_pushed_at: '' }] },
      'created_date',
      200,
    );
    const items = Array.isArray(res) ? res : (res?.items || []);

    let pushed = 0;
    const errors = [];
    for (const entry of items) {
      const r = await pushEntryToFeaturebase(base44, entry, apiKey);
      if (r.ok) pushed++;
      else errors.push({ title: entry.title, error: r.error });
    }

    return Response.json({ success: true, found: items.length, pushed, failed: errors.length, errors: errors.slice(0, 5) });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}