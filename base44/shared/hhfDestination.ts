// Shared HHF destination resolver — used by QR routing (and future OneSignal routing).
// Returns a same-site path or null when the destination is invalid. Never returns an
// external URL, so it cannot be used as an open redirect.

export const SHORT_URL_BASE = 'https://happyhourflower.com';
export const ATTRIBUTION_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const SAFE_PATH = /^\/(?!\/)[A-Za-z0-9\-_/]*(\?[A-Za-z0-9=&\-_%.]*)?$/;

export function isSafePath(p) {
  return typeof p === 'string' && p.length < 300 && SAFE_PATH.test(p) && !p.includes('\\');
}

async function safeGet(entity, id) {
  if (!id) return null;
  try { return await entity.get(id); } catch (_) { return null; }
}

export async function resolveHHFDestination(svc, type, id, extra = {}) {
  switch (type) {
    case 'venue': {
      const v = await safeGet(svc.entities.Venue, id);
      return v && v.status !== 'inactive' ? `/venue/${v.id}` : null;
    }
    case 'special': {
      const item = await safeGet(svc.entities.HappyHourItem, id);
      if (!item) return null;
      const v = await safeGet(svc.entities.Venue, item.venue_id);
      return v ? `/venue/${v.id}?special=${item.id}` : null;
    }
    case 'event': {
      const ev = await safeGet(svc.entities.VenueEvent, id);
      if (!ev) return null;
      const v = await safeGet(svc.entities.Venue, ev.venue_id);
      return v ? `/venue/${v.id}?event=${ev.id}` : null;
    }
    case 'consumer_premium': return '/plans/consumer';
    case 'venue_premium': return '/plans/venue';
    case 'signup': return '/register';
    case 'onboarding': return '/onboarding';
    case 'url': return isSafePath(extra.url) ? extra.url : null;
    default: return null;
  }
}

export function campaignDestinationId(c) {
  if (c.destination_type === 'venue') return c.destination_id || c.venue_id;
  if (c.destination_type === 'special') return c.destination_id || c.special_id;
  if (c.destination_type === 'event') return c.destination_id || c.event_id;
  return c.destination_id || '';
}