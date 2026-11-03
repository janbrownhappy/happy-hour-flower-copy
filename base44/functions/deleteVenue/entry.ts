import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { venueId } = await req.json();
    if (!venueId) {
      return Response.json({ error: 'venueId is required' }, { status: 400 });
    }

    // Use service role for all DB operations to avoid RLS $in subquery issues
    const sr = base44.asServiceRole;

    // Fetch venue to verify ownership and check subscription tier
    const venue = await sr.entities.Venue.get(venueId);
    if (!venue) {
      return Response.json({ error: 'Venue not found' }, { status: 404 });
    }

    // Only the venue owner or admin can delete
    const isOwner = venue.owner_id === user.id || user.role === 'admin';
    if (!isOwner) {
      return Response.json({ error: 'Forbidden: only the venue owner can delete this venue' }, { status: 403 });
    }

    // Cancel RevenueCat subscription if venue is on a paid tier (best-effort)
    const rcCancellationResult = { attempted: false, success: false };
    if (venue.subscription_tier && venue.subscription_tier !== 'free') {
      rcCancellationResult.attempted = true;
      const rcApiKey = Deno.env.get('REVENUECAT_SECRET_API_KEY');
      if (rcApiKey) {
        const rcUserId = encodeURIComponent(venue.owner_id || user.id);
        try {
          const rcRes = await fetch(`https://api.revenuecat.com/v1/subscribers/${rcUserId}/subscriptions`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${rcApiKey}`, 'Content-Type': 'application/json' },
          });
          if (rcRes.ok) {
            const rcData = await rcRes.json();
            const subscriptions = rcData.subscriber?.subscriptions || {};
            for (const [productId] of Object.entries(subscriptions)) {
              try {
                await fetch(`https://api.revenuecat.com/v1/subscribers/${rcUserId}/subscriptions/${encodeURIComponent(productId)}/defer`, {
                  method: 'DELETE',
                  headers: { 'Authorization': `Bearer ${rcApiKey}`, 'Content-Type': 'application/json' },
                });
              } catch { /* best-effort */ }
            }
            rcCancellationResult.success = true;
          }
        } catch { /* best-effort */ }
      }
    }

    // Delete related records first
    const [amenities, events, collaborators, walletPasses] = await Promise.all([
      sr.entities.VenueAmenity.filter({ venue_id: venueId }),
      sr.entities.VenueEvent.filter({ venue_id: venueId }),
      sr.entities.VenueCollaborator.filter({ venue_id: venueId }),
      sr.entities.WalletPass.filter({ venue_id: venueId }),
    ]);

    await Promise.all([
      ...amenities.map(r => sr.entities.VenueAmenity.delete(r.id)),
      ...events.map(r => sr.entities.VenueEvent.delete(r.id)),
      ...collaborators.map(r => sr.entities.VenueCollaborator.delete(r.id)),
      ...walletPasses.map(r => sr.entities.WalletPass.delete(r.id)),
    ]);

    // Delete the venue itself
    await sr.entities.Venue.delete(venueId);

    return Response.json({
      success: true,
      venue_name: venue.name,
      subscription_cancellation: rcCancellationResult,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});