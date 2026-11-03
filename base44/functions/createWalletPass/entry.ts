import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { trustedCollaborators } from '../../shared/venueAccess.ts';

// Creates a pass design only when the caller is an admin, the venue owner, or a venue collaborator.
Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { venue_id, data } = await req.json();
  if (!venue_id || !data) return Response.json({ error: 'venue_id and data are required' }, { status: 400 });

  const svc = base44.asServiceRole.entities;
  const venue = await svc.Venue.get(venue_id);
  if (!venue) return Response.json({ error: 'Venue not found' }, { status: 404 });

  let allowed = user.role === 'admin' || venue.owner_id === user.id || (venue.editor_ids || []).includes(user.id);
  if (!allowed) {
    const collabs = await trustedCollaborators(base44.asServiceRole, venue, { user_id: user.id });
    allowed = collabs.length > 0;
  }
  if (!allowed) return Response.json({ error: 'You do not manage this venue' }, { status: 403 });

  const allCollabs = await trustedCollaborators(base44.asServiceRole, venue);
  const manager_ids = [...new Set([venue.owner_id, ...(venue.editor_ids || []), ...allCollabs.map((c) => c.user_id), user.id].filter(Boolean))];

  const pass = await svc.WalletPass.create({
    manager_ids,
    ...data,
    venue_id,
    venue_name: venue.name,
    creator_user_id: user.id,
  });
  return Response.json({ pass });
});