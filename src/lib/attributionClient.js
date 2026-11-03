import { recordAttribution } from '@/functions/recordAttribution';
import { trackEvent } from '@/lib/analytics';

// First-party attribution state (no PII): the last QR touch + a random session id.
const TOUCH_KEY = 'hhf_attr_touch';
const SESSION_KEY = 'hhf_session_id';
const WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

export function getSessionId() {
  try {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) { id = crypto.randomUUID(); sessionStorage.setItem(SESSION_KEY, id); }
    return id;
  } catch (_) { return ''; }
}

export function storeTouch(touch) {
  try { localStorage.setItem(TOUCH_KEY, JSON.stringify(touch)); } catch (_) {}
}

export function getStoredTouch() {
  try {
    const t = JSON.parse(localStorage.getItem(TOUCH_KEY) || 'null');
    if (!t || Date.now() - new Date(t.touched_at).getTime() > WINDOW_MS) return null;
    return t;
  } catch (_) { return null; }
}

export function clearSyncedTouch() {
  try { localStorage.setItem(TOUCH_KEY + '_synced', localStorage.getItem(TOUCH_KEY) || ''); } catch (_) {}
}

export function touchAlreadySynced() {
  try { return localStorage.getItem(TOUCH_KEY + '_synced') === localStorage.getItem(TOUCH_KEY); } catch (_) { return false; }
}

// Credit a funnel event to the user's attribution (server enforces the 7-day window).
export async function creditEvent(event, extra = {}) {
  try {
    const touch = touchAlreadySynced() ? undefined : getStoredTouch() || undefined;
    const { data } = await recordAttribution({ event, touch, ...extra });
    if (touch) clearSyncedTouch();
    return data?.attribution || null;
  } catch (_) { return null; }
}

// Mirror an arrival already recorded by the ProximityEvent system into Amplitude.
export async function trackArrival(venueId, method) {
  if (!venueId) return;
  const attr = await creditEvent('arrival', { venue_id: venueId, method });
  trackEvent('arrival_detected', {
    venue_id: venueId, detection_method: method,
    qr_id: attr?.qr_id, campaign: attr?.campaign, market: attr?.market,
  });
}

export function userAgentCategory() {
  const ua = navigator.userAgent || '';
  if (/iPhone|iPad|iPod/i.test(ua)) return 'ios';
  if (/Android/i.test(ua)) return 'android';
  if (/Windows|Macintosh|Linux/i.test(ua)) return 'desktop';
  return 'other';
}

export function referrerType() {
  if (!document.referrer) return 'direct';
  try { return new URL(document.referrer).host === window.location.host ? 'internal' : 'external'; } catch (_) { return 'external'; }
}