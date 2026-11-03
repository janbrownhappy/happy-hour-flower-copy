import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Marks the caller's own notifications as read. Pass { ids: [...] } or { all: true }.
Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me().catch(() => null);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { ids, all } = await req.json();
  const query = { user_id: user.id, is_read: { $ne: true } };
  if (!all) {
    if (!Array.isArray(ids) || !ids.length) return Response.json({ updated: 0 });
    query.id = { $in: ids.slice(0, 200) };
  }
  const res = await base44.asServiceRole.entities.VenueNotification.updateMany(query, { $set: { is_read: true } });
  return Response.json({ ok: true, has_more: !!res?.has_more });
});