// Pushes one ChangelogEntry to Featurebase (create or update) and publishes it.
// Records the result on the entry. Returns { ok, error?, postId?, postUrl?, updated? }.
const API_BASE = 'https://do.featurebase.app/v2/changelogs';

const FB_CATEGORY = {
  feature: 'New',
  fix: 'Fixed',
  design: 'Improved',
  content: 'Improved',
  backend: 'Improved',
  other: 'Improved',
};

export async function pushEntryToFeaturebase(base44, entry, apiKey) {
  const Entries = base44.asServiceRole.entities.ChangelogEntry;
  const body = {
    title: entry.title,
    markdownContent: entry.description || entry.title,
    state: 'draft',
    categories: [FB_CATEGORY[entry.category] || 'Improved'],
  };

  const isUpdate = Boolean(entry.featurebase_post_id);
  const url = isUpdate ? `${API_BASE}/${entry.featurebase_post_id}` : API_BASE;
  const headers = { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' };
  const send = (b) => fetch(url, { method: isUpdate ? 'PATCH' : 'POST', headers, body: JSON.stringify(b) });

  let res = await send(body);
  let text = await res.text();
  // The mapped category may not exist in this organization — retry with 'Improved'.
  if (!res.ok && text.includes('changelog_category') && body.categories[0] !== 'Improved') {
    res = await send({ ...body, categories: ['Improved'] });
    text = await res.text();
  }
  let payload = {};
  try { payload = text ? JSON.parse(text) : {}; } catch (_e) { payload = {}; }

  if (!res.ok) {
    const asText = (v) => (typeof v === 'string' ? v : v ? JSON.stringify(v) : '');
    const detail = asText(payload?.error) || asText(payload?.message) || asText(payload?.errors) || text.slice(0, 300);
    const msg = payload?.requiresPlanUpgrade
      ? `Featurebase plan upgrade required: ${asText(payload.message)}`
      : `Featurebase returned ${res.status}${detail ? `: ${detail}` : ''}`;
    await Entries.update(entry.id, { featurebase_push_error: String(msg).slice(0, 500) });
    return { ok: false, error: msg };
  }

  const post = payload?.results || payload?.data || payload?.changelog || payload;
  const postId = post?.id || post?._id || entry.featurebase_post_id || '';

  // Created posts start as drafts — publish so they show on the public changelog.
  if (postId) {
    await fetch(`${API_BASE}/${postId}/publish`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ locales: [], sendEmail: false }),
    });
  }

  const postUrl = post?.url || post?.permalink || entry.featurebase_url || '';
  await Entries.update(entry.id, {
    featurebase_post_id: postId,
    featurebase_url: postUrl,
    featurebase_pushed_at: new Date().toISOString(),
    featurebase_push_error: '',
  });
  return { ok: true, postId, postUrl, updated: isUpdate };
}