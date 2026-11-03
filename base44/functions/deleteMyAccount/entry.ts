import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

// Permanently deletes the CALLING user's own data and login. Never accepts a user id from the request.
const OWNED = ['Favorite', 'VenueNote', 'Profile', 'Review', 'CheckIn', 'CrewMember', 'LocalQuestion', 'LocalAnswer', 'AppSession', 'UserBlock'];

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const sr = base44.asServiceRole;
    const results = await Promise.allSettled(
      OWNED.map((name) => sr.entities[name].deleteMany({ created_by_id: user.id }))
    );
    results.forEach((r, i) => { if (r.status === 'rejected') console.log('skip', OWNED[i], r.reason?.message); });
    await sr.entities.User.delete(user.id);
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}