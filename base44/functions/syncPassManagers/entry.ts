import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { requireAutomationCaller } from '../../shared/automationAuth.ts';
import { trustedCollaborators } from '../../shared/venueAccess.ts';

// Recomputes manager_ids on every pass design of a venue from its current owner, editors and collaborators.
// Safe to call anytime: it only mirrors the venue's real team.
Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const denied = await requireAutomationCaller(base44, req);
  if (denied) return denied;
  const { venue_id } = await req.json();
  if (!venue_id) return Response.json({ error: 'venue_id is required' }, { status: 400 });

  const svc = base44.asServiceRole.entities;
  const venue = await svc.Venue.get(venue_id).catch(() => null);
  if (!venue) return Response.json({ updated: 0 });

  const collabs = await trustedCollaborators(base44.asServiceRole, venue);
  const team = [venue.owner_id, ...(venue.editor_ids || []), ...collabs.map((c) => c.user_id)];

  const passes = await svc.WalletPass.filter({ venue_id });
  const updates = passes.map((p) => ({
    id: p.id,
    manager_ids: [...new Set(team.filter(Boolean))],
  }));
  if (updates.length) await svc.WalletPass.bulkUpdate(updates);
  return Response.json({ updated: updates.length });
});