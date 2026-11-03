import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { trustedCollaborators } from '../../shared/venueAccess.ts';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all venues owned by or collaborated on by this user
    const allVenues = await base44.asServiceRole.entities.Venue.list();
    const myCollabs = await base44.asServiceRole.entities.VenueCollaborator.filter({ user_id: user.id });
    const collabVenueIds = [];
    for (const vid of new Set(myCollabs.map(c => c.venue_id))) {
      const v = allVenues.find(x => x.id === vid);
      if (v && (await trustedCollaborators(base44.asServiceRole, v, { user_id: user.id })).length) collabVenueIds.push(vid);
    }

    const userVenues = allVenues.filter(v =>
      v.owner_id === user.id || collabVenueIds.includes(v.id)
    );

    if (userVenues.length === 0) {
      return Response.json({ 
        views: 0, 
        favorites: 0, 
        reviews: 0,
        venues: []
      });
    }

    const venueIds = userVenues.map(v => v.id);
    
    // Calculate date range for past month
    const now = new Date();
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    // Get all activity logs for these venues in the past month
    const allLogs = await base44.asServiceRole.entities.ActivityLog.list();
    const recentLogs = allLogs.filter(log => {
      if (!venueIds.includes(log.venue_id)) return false;
      const logDate = new Date(log.created_date);
      return logDate >= oneMonthAgo;
    });

    // Get all reviews for these venues
    const allReviews = await base44.asServiceRole.entities.Review.list();
    const venueReviews = allReviews.filter(r => 
      venueIds.includes(String(r.venue_id))
    );
    const recentReviews = venueReviews.filter(r => {
      const reviewDate = new Date(r.created_date);
      return reviewDate >= oneMonthAgo;
    });

    // Aggregate metrics
    const totalViews = userVenues.reduce((sum, v) => sum + (v.view_count || 0), 0);
    const totalFavorites = userVenues.reduce((sum, v) => sum + (v.favorite_count || 0), 0);

    // Per-venue breakdown
    const venueMetrics = userVenues.map(venue => {
      const venueLogs = recentLogs.filter(log => log.venue_id === venue.id);
      const venueReviewsList = recentReviews.filter(r => String(r.venue_id) === venue.id);
      
      return {
        id: venue.id,
        name: venue.name,
        views: venue.view_count || 0,
        favorites: venue.favorite_count || 0,
        reviews: venueReviewsList.length,
        recent_updates: venueLogs.length
      };
    });

    return Response.json({
      views: totalViews,
      favorites: totalFavorites,
      reviews: recentReviews.length,
      venues: venueMetrics,
      period: {
        start: oneMonthAgo.toISOString(),
        end: now.toISOString()
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});