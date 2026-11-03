import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { EMAIL_CATALOG } from '../../shared/emailCatalog.ts';

// Admin-only. Ensures an editable EmailTemplate exists in the DB for every email
// in the catalog. Idempotent: it CREATES missing templates but never overwrites
// an existing one (so admin edits are preserved). Safe to run repeatedly.
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    const ownerEmail = (Deno.env.get('ADMIN_EMAIL') || '').toLowerCase();
    const isAdmin = user?.role === 'admin' || (!!ownerEmail && user?.email?.toLowerCase() === ownerEmail);
    if (!isAdmin) {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const existing = await base44.asServiceRole.entities.EmailTemplate.list('', 500);
    const existingNames = new Set(existing.map((t) => t.name));

    const toCreate = EMAIL_CATALOG
      .filter((e) => !existingNames.has(e.name))
      .map((e) => ({
        name: e.name,
        subject: e.defaultSubject,
        body: e.defaultBody,
        description: e.description,
        is_active: true,
      }));

    let created = 0;
    if (toCreate.length > 0) {
      await base44.asServiceRole.entities.EmailTemplate.bulkCreate(toCreate);
      created = toCreate.length;
    }

    return Response.json({
      success: true,
      created,
      skipped_existing: existing.length,
      created_names: toCreate.map((t) => t.name),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}