import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

/**
 * Brand-scoped collaborator management for chain owners.
 *
 * Actions:
 *  - "invite": invite (or link an existing) user as a collaborator on a set of
 *    venues with a given role. Creates one VenueCollaborator per venue and keeps
 *    each venue's editor_ids array in sync so the Venue update RLS rule grants
 *    edit access. If the email isn't a platform user yet, sends an invite.
 *  - "remove": removes a collaborator from a set of venues (deletes the
 *    VenueCollaborator rows and pulls the user from editor_ids).
 *
 * Only the owner of ALL the target venues (or an admin) may act. Runs the
 * privileged writes via service role after that ownership check.
 */
const EDIT_ROLES = ['owner', 'regional_manager', 'editor'];

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { action, venueIds, role, email, userId } = body;

    if (!action || !Array.isArray(venueIds) || venueIds.length === 0) {
      return Response.json({ error: 'action and venueIds are required' }, { status: 400 });
    }

    const svc = base44.asServiceRole;
    const isAdmin = user.role === 'admin';

    // Load the target venues and verify the caller owns every one of them.
    const venues = [];
    for (const vid of venueIds) {
      const v = await svc.entities.Venue.get(vid).catch(() => null);
      if (!v) return Response.json({ error: `Venue ${vid} not found` }, { status: 404 });
      if (!isAdmin && v.owner_id !== user.id) {
        return Response.json({ error: 'You do not own one or more of these venues' }, { status: 403 });
      }
      venues.push(v);
    }

    if (action === 'invite') {
      const cleanEmail = (email || '').trim().toLowerCase();
      const inviteRole = role || 'editor';
      if (!cleanEmail) return Response.json({ error: 'email is required' }, { status: 400 });

      // Resolve to an existing platform user if there is one.
      const allUsers = await svc.entities.User.list().catch(() => []);
      let target = allUsers.find(u => (u.email || '').toLowerCase() === cleanEmail);
      let invited = false;

      if (!target) {
        // Not on the platform yet — send an invite as a regular user.
        await base44.users.inviteUser(cleanEmail, 'user').catch(() => {});
        invited = true;
      }

      const grantsEdit = EDIT_ROLES.includes(inviteRole);

      for (const v of venues) {
        // Create the collaborator row if this user isn't already linked.
        const existing = await svc.entities.VenueCollaborator
          .filter({ venue_id: String(v.id), ...(target ? { user_id: target.id } : { user_email: cleanEmail }) })
          .catch(() => []);
        if (existing.length === 0) {
          await svc.entities.VenueCollaborator.create({
            venue_id: String(v.id),
            user_id: target ? target.id : '',
            user_email: cleanEmail,
            role: inviteRole,
          });
        } else {
          await svc.entities.VenueCollaborator.update(existing[0].id, { role: inviteRole });
        }

        // Keep editor_ids in sync for the RLS gate (only for edit-capable roles
        // and only when we already know the user's id).
        if (target && grantsEdit) {
          const current = Array.isArray(v.editor_ids) ? v.editor_ids : [];
          if (!current.includes(target.id)) {
            await svc.entities.Venue.update(v.id, { editor_ids: [...current, target.id] });
          }
        }
      }

      return Response.json({
        ok: true,
        invited,
        linked: !!target,
        message: invited
          ? `Invitation sent to ${cleanEmail}. They'll get edit access on sign-up.`
          : `${cleanEmail} added to ${venues.length} location(s) as ${inviteRole}.`,
      });
    }

    if (action === 'remove') {
      for (const v of venues) {
        const rows = await svc.entities.VenueCollaborator
          .filter({ venue_id: String(v.id), ...(userId ? { user_id: userId } : { user_email: (email || '').trim().toLowerCase() }) })
          .catch(() => []);
        for (const r of rows) {
          await svc.entities.VenueCollaborator.delete(r.id).catch(() => {});
        }
        if (userId) {
          const current = Array.isArray(v.editor_ids) ? v.editor_ids : [];
          if (current.includes(userId)) {
            await svc.entities.Venue.update(v.id, { editor_ids: current.filter(id => id !== userId) });
          }
        }
      }
      return Response.json({ ok: true, message: 'Collaborator removed from selected locations.' });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}