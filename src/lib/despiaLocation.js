// Phase 4 — Despia native GPS bridge. Client only forwards points; the backend
// (processLocation → Phase 2 → Phase 3) stays authoritative for all venue logic.
import despia from 'despia-native';
import { base44 } from '@/api/base44Client';

export const isDespia = () => typeof navigator !== 'undefined' && navigator.userAgent.toLowerCase().includes('despia');

const state = {
  detected: isDespia(), tracking: false, permission: 'not_requested', movement_meters: null,
  last: null, previous: null, interval_seconds: null, moved_meters: null,
  submission: 'idle', response: null, error: '', updates: 0,
};
const listeners = new Set();
const emit = (patch) => { Object.assign(state, patch); listeners.forEach((l) => l({ ...state })); };
export const getDespiaState = () => ({ ...state });
export const subscribeDespia = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };

// Diagnostic only (time/distance between device updates) — never used for venue matching.
function meters(a, b) {
  const R = 6371000, r = (d) => (d * Math.PI) / 180;
  const x = Math.sin(r(b.latitude - a.latitude) / 2) ** 2 + Math.cos(r(a.latitude)) * Math.cos(r(b.latitude)) * Math.sin(r(b.longitude - a.longitude) / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(x)));
}

let pending = null; // only the newest unsent point is kept
let retryTimer = null;
let noFixTimer = null;

async function submit(point, attempt = 0) {
  emit({ submission: attempt ? `retrying (${attempt})` : 'sending' });
  try {
    const res = await base44.functions.invoke('processLocation', {
      source: 'despia', latitude: point.latitude, longitude: point.longitude, accuracy: point.horizontalAccuracy,
      timestamp: point.timestamp ? new Date(point.timestamp * 1000).toISOString() : new Date().toISOString(),
      speed: point.speed, heading: point.course, altitude: point.altitude,
    });
    if (pending === point) pending = null;
    emit({ submission: 'ok', response: res.data, error: '' });
  } catch (e) {
    const status = e?.response?.status;
    if (status === 401 || status === 403) { pending = null; return emit({ submission: 'auth_expired', error: 'Session expired — location not sent' }); }
    if (status === 400) { pending = null; return emit({ submission: 'rejected', error: e?.response?.data?.error || 'Malformed location' }); }
    emit({ submission: 'failed', error: e?.message || 'Network/backend error' });
    if (attempt < 3 && pending === point) {
      clearTimeout(retryTimer);
      retryTimer = setTimeout(() => pending === point && submit(point, attempt + 1), 15000 * 2 ** attempt);
    }
  }
}

function onPoint(data) {
  if (!data || data.active === false) return emit({ tracking: false });
  if (!Number.isFinite(data.latitude) || !Number.isFinite(data.longitude)) return emit({ error: 'Malformed location from device' });
  clearTimeout(noFixTimer);
  const prev = state.last;
  emit({
    permission: 'granted', previous: prev, last: data, updates: state.updates + 1,
    interval_seconds: prev?.timestamp ? Math.round(data.timestamp - prev.timestamp) : null,
    moved_meters: prev ? meters(prev, data) : null,
  });
  pending = data;
  clearTimeout(retryTimer);
  submit(data);
}

export function startDespiaTracking({ movementMeters, bufferSeconds }) {
  if (!isDespia()) return;
  window.onLocationChange = onPoint; // must exist before location:// so replayed points aren't lost
  if (despia.locationTracking && state.movement_meters === movementMeters) return emit({ tracking: true });
  try {
    despia(`location://?buffer=${bufferSeconds}&movement=${Math.round(movementMeters * 100)}`);
    emit({ tracking: true, movement_meters: movementMeters, permission: state.permission === 'granted' ? 'granted' : 'requested', error: '' });
    clearTimeout(noFixTimer);
    noFixTimer = setTimeout(() => { if (state.permission !== 'granted') emit({ permission: 'no_fix (denied, restricted or no GPS)' }); }, 90000);
  } catch (e) { emit({ tracking: false, error: e?.message || 'Despia GPS unavailable' }); }
}

export async function stopDespiaTracking() {
  if (!isDespia()) return;
  clearTimeout(retryTimer); clearTimeout(noFixTimer); pending = null;
  try { if (despia.locationTracking) await despia('stoplocation://', ['locationSession']); } catch { /* ignore */ }
  emit({ tracking: false });
}