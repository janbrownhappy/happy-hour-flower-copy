// Instagram announcements for newly imported venues.
// New venues go into a review queue (InstagramPost, status 'pending'); nothing is
// posted until the account owner approves that entry. One record per venue.
const IG = 'https://graph.instagram.com/v21.0';
const SITE = 'https://happyhourflower.com';
export const INSTAGRAM_POSTER_EMAIL = 'jan.brown@happyhourflower.com';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const firstPhoto = (v) => (v.photo_urls || []).find((u) => /^https:\/\//.test(u || '')) || '';

function buildCaption(v) {
  const where = [v.neighborhood || v.area, v.city].filter(Boolean).join(', ');
  const hh = v.happy_hour_start && v.happy_hour_end ? `Happy hour: ${v.happy_hour_start} - ${v.happy_hour_end}` : '';
  const city = (v.city || '').replace(/[^a-z0-9]/gi, '');
  return [
    `New on Happy Hour Flower: ${v.name}!`,
    where ? `📍 ${where}` : '',
    hh,
    v.description ? v.description.slice(0, 300) : '',
    `See deals and hours: ${SITE}/venue/${v.id}`,
    `#happyhour #happyhourflower${city ? ` #${city} #${city}eats` : ''}`,
  ].filter(Boolean).join('\n\n');
}

async function ig(path, params, method = 'GET') {
  const url = `${IG}/${path}?${new URLSearchParams(params)}`;
  const res = await fetch(url, { method, signal: AbortSignal.timeout(20000) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) throw new Error(data.error?.message || `Instagram error ${res.status}`);
  return data;
}

// Adds a published venue to the review queue (once per venue, ever).
export async function queueVenueForInstagram(sr, venueId) {
  const existing = await sr.entities.InstagramPost.filter({ venue_id: venueId }, { limit: 1 });
  if (existing.items?.length) return { skipped: 'already queued', post_id: existing.items[0].id };
  const v = await sr.entities.Venue.get(venueId).catch(() => null);
  if (!v) return { skipped: 'venue not found' };
  if (v.status !== 'active') return { skipped: 'venue not published' };
  const post = await sr.entities.InstagramPost.create({
    venue_id: v.id, venue_name: v.name, venue_city: v.city || '', status: 'pending',
    caption: buildCaption(v), image_url: firstPhoto(v), queued_at: new Date().toISOString(),
  });
  return { queued: post.id };
}

// Publishes one approved queue entry. Only pending or failed entries can be published.
export async function publishQueuedPost(sr, postId, reviewer) {
  const Post = sr.entities.InstagramPost;
  const post = await Post.get(postId).catch(() => null);
  if (!post) return { error: 'Queue entry not found', status: 404 };
  if (!['pending', 'failed'].includes(post.status)) return { error: `Already ${post.status}`, status: 409 };

  const now = () => new Date().toISOString();
  await Post.update(post.id, { status: 'publishing', reviewed_at: now(), reviewed_by: reviewer, error: '' });
  const v = await sr.entities.Venue.get(post.venue_id).catch(() => null);
  const image_url = (v && firstPhoto(v)) || post.image_url;
  const caption = post.caption || (v ? buildCaption(v) : '');
  const fail = async (msg) => { await Post.update(post.id, { status: 'failed', error: msg.slice(0, 500), posted_at: now() }); return { error: msg }; };
  if (!image_url) return fail('This venue has no photo to post');

  try {
    const { accessToken } = await sr.connectors.getConnection('instagram');
    const me = await ig('me', { fields: 'id', access_token: accessToken });
    const container = await ig(`${me.id}/media`, { image_url, caption, access_token: accessToken }, 'POST');
    for (let i = 0; i < 10; i++) {
      const s = await ig(container.id, { fields: 'status_code', access_token: accessToken });
      if (s.status_code === 'FINISHED') break;
      if (s.status_code === 'ERROR') throw new Error('Instagram could not process the photo (it must be a JPEG)');
      await sleep(3000);
    }
    const pub = await ig(`${me.id}/media_publish`, { creation_id: container.id, access_token: accessToken }, 'POST');
    await Post.update(post.id, { status: 'posted', instagram_media_id: pub.id, image_url, caption, posted_at: now() });
    return { posted: pub.id };
  } catch (e) {
    return fail(String(e.message));
  }
}