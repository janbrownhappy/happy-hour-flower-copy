import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { queueVenueForInstagram, publishQueuedPost, INSTAGRAM_POSTER_EMAIL } from '../../shared/instagramVenuePost.ts';

// Instagram review queue actions. Only the account owner may use it.
//   { venue_id }                       -> add a new venue to the review queue
//   { action: 'approve', post_id }     -> publish that entry now
//   { action: 'skip', post_id }        -> mark skipped, never posted
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if ((user.email || '').toLowerCase() !== INSTAGRAM_POSTER_EMAIL) {
      return Response.json({ error: 'Only the Happy Hour Flower account owner can manage Instagram posts' }, { status: 403 });
    }
    const { action = 'queue', venue_id, post_id } = await req.json().catch(() => ({}));
    const sr = base44.asServiceRole;

    if (action === 'queue') {
      if (!venue_id) return Response.json({ error: 'venue_id is required' }, { status: 400 });
      return Response.json(await queueVenueForInstagram(sr, venue_id));
    }
    if (!post_id) return Response.json({ error: 'post_id is required' }, { status: 400 });

    if (action === 'approve') {
      const result = await publishQueuedPost(sr, post_id, user.email);
      return Response.json(result, { status: result.status || 200 });
    }
    if (action === 'skip') {
      const post = await sr.entities.InstagramPost.get(post_id).catch((e) => (e.status === 404 ? null : Promise.reject(e)));
      if (!post) return Response.json({ error: 'Queue entry not found' }, { status: 404 });
      if (!['pending', 'failed'].includes(post.status)) return Response.json({ error: `Already ${post.status}` }, { status: 409 });
      await sr.entities.InstagramPost.update(post_id, { status: 'skipped', reviewed_at: new Date().toISOString(), reviewed_by: user.email });
      return Response.json({ skipped: true });
    }
    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}