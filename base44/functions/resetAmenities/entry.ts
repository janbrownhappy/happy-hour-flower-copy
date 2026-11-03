import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Destructive, app-wide operation — admins only.
    const user = await base44.auth.me();
    const adminEmail = (Deno.env.get('ADMIN_EMAIL') || '').trim().toLowerCase();
    const isAdmin =
      user && (user.role === 'admin' || (adminEmail && user.email?.trim().toLowerCase() === adminEmail));
    if (!isAdmin) return Response.json({ error: 'Admin only' }, { status: 403 });

    // Fetch in batches and delete with delays to avoid rate limiting
    let totalDeleted = 0;
    let batch;
    
    do {
      batch = await base44.asServiceRole.entities.VenueAmenity.list(null, 50);
      if (batch.length === 0) break;
      
      for (const a of batch) {
        await base44.asServiceRole.entities.VenueAmenity.delete(a.id);
        totalDeleted++;
        // Small delay to avoid rate limiting
        await new Promise(r => setTimeout(r, 100));
      }
    } while (batch.length === 50);

    return Response.json({ success: true, deleted: totalDeleted });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});