import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { DEFAULT_RULES } from '../../shared/churnScoring.ts';

// Seeds the ChurnScoringRule table with default rules. Admin-only. Idempotent —
// only creates rules whose rule_key does not already exist, so admin edits are preserved.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    const existing = await base44.asServiceRole.entities.ChurnScoringRule.list('', 500);
    const existingKeys = new Set(existing.map(r => r.rule_key));

    const toCreate = DEFAULT_RULES.filter(r => !existingKeys.has(r.rule_key));
    let created = 0;
    if (toCreate.length > 0) {
      await base44.asServiceRole.entities.ChurnScoringRule.bulkCreate(
        toCreate.map(r => ({ ...r, is_active: true }))
      );
      created = toCreate.length;
    }

    return Response.json({ success: true, created, already_present: existing.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}