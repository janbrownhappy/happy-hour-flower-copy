import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verify user is authenticated and is admin
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const payload = await req.json();
    const { venue_id, review_id } = payload;

    // Fetch venue
    const venue = await base44.entities.Venue.get(venue_id);
    if (!venue) {
      return Response.json({ error: 'Venue not found' }, { status: 404 });
    }

    // Fetch review
    const review = await base44.entities.Review.get(review_id);
    if (!review) {
      return Response.json({ error: 'Review not found' }, { status: 404 });
    }

    // Find venue owner/collaborators
    const collaborators = await base44.entities.VenueCollaborator.filter({ venue_id });
    if (!collaborators || collaborators.length === 0) {
      return Response.json({ error: 'No collaborators found for this venue' }, { status: 404 });
    }

    // Get user emails for each collaborator
    const allUsers = await base44.entities.User.list();
    const userMap = Object.fromEntries(allUsers.map(u => [u.id, u]));

    // Send email to each collaborator
    const emails = collaborators
      .map(c => userMap[c.user_id])
      .filter(u => u && u.email);

    for (const recipient of emails) {
      await base44.functions.sendEmail({
        template_name: 'new_review_notification',
        to: recipient.email,
        variables: {
          venue_name: venue.name,
          reviewer_name: review.user_name || 'A customer',
          rating: review.rating.toString(),
          comment: review.comment || 'No comment'
        }
      });
    }

    return Response.json({ 
      success: true, 
      message: `Notification sent to ${emails.length} collaborator(s)` 
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});