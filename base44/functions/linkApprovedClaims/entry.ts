import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { isAppAdmin } from '../../shared/automationAuth.ts';

// Links approved claims (submitted anonymously via the public portal) to the
// signed-in user whose email matches the claimant email, making them the owner.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user?.email) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const sr = base44.asServiceRole.entities;
    const email = user.email.toLowerCase();
    const candidates = (await sr.VenueClaimRequest.filter({ status: 'approved' }))
      .filter((c) => !c.user_id && c.venue_id && c.reviewed_by && c.reviewed_at
        && (c.claimant_email || '').toLowerCase() === email);

    // Only honor approvals actually recorded by an app admin (processVenueClaim sets reviewed_by).
    const reviewerIds = [...new Set(candidates.map((c) => c.reviewed_by))];
    const reviewers = reviewerIds.length ? await sr.User.filter({ id: { $in: reviewerIds } }) : [];
    const adminIds = new Set(reviewers.filter(isAppAdmin).map((u) => u.id));
    const claims = candidates.filter((c) => adminIds.has(c.reviewed_by) && c.reviewed_by !== user.id);

    for (const claim of claims) {
      await sr.Venue.update(claim.venue_id, { owner_id: user.id, verification_status: 'verified' });
      const existing = await sr.VenueCollaborator.filter({ venue_id: claim.venue_id, user_id: user.id });
      if (existing.length === 0) {
        await sr.VenueCollaborator.create({ venue_id: claim.venue_id, user_id: user.id, user_email: user.email, role: 'owner' });
      }
      await sr.VenueClaimRequest.update(claim.id, { user_id: user.id });
    }
    if (claims.length && user.role !== 'admin' && user.role !== 'venue_owner') {
      await sr.User.update(user.id, { role: 'venue_owner' });
    }

    const owned = await sr.Venue.filter({ owner_id: user.id });
    return Response.json({ linked: claims.length, isOwner: owned.length > 0, venueId: owned[0]?.id || null });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});