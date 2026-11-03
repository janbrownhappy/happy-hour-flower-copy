import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Get all venues
    const venues = await base44.asServiceRole.entities.Venue.list();
    
    const supabasePattern = /supabase\.co/;
    const venuesWithSupabase = venues.filter(v => 
      v.photo_urls?.some(url => supabasePattern.test(url))
    );
    
    // Update each venue to remove broken Supabase URLs
    const updates = [];
    for (const venue of venuesWithSupabase) {
      const newPhotoUrls = (venue.photo_urls || []).filter(
        url => !supabasePattern.test(url)
      );
      
      // If we removed all photos, add a placeholder
      if (newPhotoUrls.length === 0) {
        const categoryToPhoto: Record<string, string> = {
          'Bar & Restaurant': 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=600&q=80',
          'Restaurant': 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&q=80',
          'Sports Bar': 'https://images.unsplash.com/photo-1566417713204-5c74e76e2c88?w=600&q=80',
          'Steakhouse': 'https://images.unsplash.com/photo-1544025162-d76694265947?w=600&q=80',
          'Latin & Mexican': 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=600&q=80',
          'Café & Bistro': 'https://images.unsplash.com/photo-1521017432531-fbd92d768814?w=600&q=80',
        };
        
        const defaultPhoto = categoryToPhoto[venue.category] || 
          'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=600&q=80';
        
        newPhotoUrls.push(defaultPhoto);
      }
      
      updates.push(
        base44.asServiceRole.entities.Venue.update(venue.id, {
          photo_urls: newPhotoUrls
        })
      );
    }
    
    await Promise.all(updates);
    
    return Response.json({
      success: true,
      updated: updates.length,
      message: `Fixed ${updates.length} venues with broken photo URLs`
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});