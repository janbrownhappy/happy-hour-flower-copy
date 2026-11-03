import { base44 } from '@/api/base44Client';

export const TEST_MODES = [
  ['APP_OPEN', 'App open'], ['APP_BACKGROUNDED', 'App backgrounded'], ['PHONE_LOCKED', 'Phone locked'],
  ['APP_TERMINATED', 'App terminated'], ['WALKING', 'Walking'], ['DRIVING', 'Driving'],
];
// Mutually exclusive app-state modes (movement modes can combine with any one of these).
export const APP_STATE_MODES = ['APP_OPEN', 'APP_BACKGROUNDED', 'PHONE_LOCKED', 'APP_TERMINATED'];

export const modeLabel = (modes) => (modes?.length ? modes.map((m) => m.replace(/_/g, ' ')).join(' + ') : '—');
export const fmtTime = (iso) => (iso ? new Date(iso).toLocaleTimeString() : '—');
export const m = (v) => (v == null ? '—' : `${Math.round(v)}m`);

export function detectPlatform() {
  const ua = navigator.userAgent || '';
  if (/iphone|ipad|ipod/i.test(ua)) return 'ios';
  if (/android/i.test(ua)) return 'android';
  if (/windows|macintosh|linux/i.test(ua)) return 'desktop';
  return 'other';
}

export const fieldTestAction = (payload) => base44.functions.invoke('fieldTestSession', payload).then((r) => r.data);
export const loadReadings = (sessionId) => base44.entities.FieldTestReading.filter({ session_id: sessionId }, 'reading_at', 5000);