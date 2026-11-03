import { ATTRIBUTION_WINDOW_MS } from './hhfDestination.ts';

const TOUCH_KEYS = ['qr_id', 'source', 'channel', 'campaign', 'placement', 'venue_id', 'special_id', 'ambassador_id', 'market', 'destination_type', 'destination_id'];

export async function getAttribution(svc, userId) {
  const rows = await svc.entities.Attribution.filter({ hhf_user_id: userId });
  return rows[0] || null;
}

// Apply a qualifying touch: first-touch set once, last-touch always updated, history appended.
export async function applyTouch(svc, userId, touch) {
  if (!touch || !touch.qr_id) return getAttribution(svc, userId);
  const at = touch.touched_at || new Date().toISOString();
  const last = {};
  for (const k of TOUCH_KEYS) last[k] = String(touch[k] || '').slice(0, 120);
  const entry = { qr_id: last.qr_id, campaign: last.campaign, placement: last.placement, venue_id: last.venue_id, touched_at: at };
  const existing = await getAttribution(svc, userId);
  if (!existing) {
    return svc.entities.Attribution.create({
      hhf_user_id: userId, ...last, first_touch_at: at, last_touch_at: at,
      first_source: last.source, first_channel: last.channel, first_campaign: last.campaign,
      first_placement: last.placement, first_qr_id: last.qr_id, first_venue_id: last.venue_id,
      first_ambassador_id: last.ambassador_id, touch_history: [entry],
    });
  }
  const history = (existing.touch_history || []).slice(-49);
  const dup = history.some(h => h.qr_id === entry.qr_id && h.touched_at === entry.touched_at);
  const patch = { ...last, last_touch_at: at, touch_history: dup ? history : [...history, entry] };
  if (!existing.first_qr_id) {
    Object.assign(patch, { first_touch_at: at, first_source: last.source, first_channel: last.channel, first_campaign: last.campaign, first_placement: last.placement, first_qr_id: last.qr_id, first_venue_id: last.venue_id, first_ambassador_id: last.ambassador_id });
  }
  return svc.entities.Attribution.update(existing.id, patch);
}

export function withinWindow(attr, at = Date.now()) {
  return !!(attr && attr.qr_id && attr.last_touch_at && at - new Date(attr.last_touch_at).getTime() <= ATTRIBUTION_WINDOW_MS);
}