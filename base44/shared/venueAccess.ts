import { isAppAdmin } from './automationAuth.ts';

// Collaborator rows that actually grant authority over a venue. Any signed-in user can
// write a VenueCollaborator row, so a row only counts when it was created by the server
// (claim approval / team tools), by the venue's owner, or by an app admin.
// `svc` is base44.asServiceRole.
export async function trustedCollaborators(svc, venue, query = {}) {
  if (!venue?.id) return [];
  const rows = await svc.entities.VenueCollaborator.filter({ ...query, venue_id: venue.id });
  const isServer = (c) => typeof c === 'string' && c.startsWith('service_');
  const others = [...new Set(rows.map((r) => r.created_by_id).filter((c) => c && !isServer(c) && c !== venue.owner_id))];
  const adminIds = others.length
    ? new Set((await svc.entities.User.filter({ id: { $in: others } })).filter(isAppAdmin).map((u) => u.id))
    : new Set();
  return rows.filter((r) => isServer(r.created_by_id) || (venue.owner_id && r.created_by_id === venue.owner_id) || adminIds.has(r.created_by_id));
}

// True when the user may act for this venue: app admin, owner, editor,
// trusted collaborator, or venue staff assigned to it.
export async function canActForVenue(svc, user, venueId) {
  if (!user || !venueId) return false;
  if (isAppAdmin(user)) return true;
  if (user.role === 'venue_staff' && user.venue_id === venueId) return true;
  const venue = await svc.entities.Venue.get(venueId).catch((e) => (e.status === 404 ? null : Promise.reject(e)));
  if (!venue) return false;
  if (venue.owner_id === user.id || (venue.editor_ids || []).includes(user.id)) return true;
  return (await trustedCollaborators(svc, venue, { user_id: user.id })).length > 0;
}