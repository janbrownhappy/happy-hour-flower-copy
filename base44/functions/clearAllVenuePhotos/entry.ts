import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Fetch all venues
    const venues = await base44.entities.Venue.list();
    
    console.log('Clearing photos for', venues.length, 'venues');

    let updatedCount = 0;
    
    // Update venues in batches to avoid rate limits
    for (const venue of venues) {
      if (venue.photo_urls && venue.photo_urls.length > 0) {
        try {
          await base44.entities.Venue.update(venue.id, { photo_urls: [] });
          updatedCount++;
          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          console.error('Failed to update venue', venue.id, ':', error.message);
        }
      }
    }

    return Response.json({
      success: true,
      message: `Cleared photos from ${updatedCount} venues`,
      totalVenues: venues.length,
      updatedCount
    });

  } catch (error) {
    console.error('Error:', error.message);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});