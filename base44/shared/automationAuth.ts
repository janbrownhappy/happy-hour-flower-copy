import { secrets } from 'base44:runtime';

// The account owner is the app's admin (stored with role venue_owner).
const OWNER_EMAIL = 'jan.brown@happyhourflower.com';

export function isAppAdmin(user) {
  if (!user) return false;
  if (user.role === 'admin') return true;
  const email = String(user.email || '').trim().toLowerCase();
  const owners = [secrets.get('ADMIN_EMAIL'), OWNER_EMAIL].filter(Boolean).map((e) => String(e).trim().toLowerCase());
  return !!email && owners.includes(email);
}

// Constant-time string comparison for shared secrets.
export function safeEqual(a, b) {
  const x = new TextEncoder().encode(String(a || ''));
  const y = new TextEncoder().encode(String(b || ''));
  if (!x.length || x.length !== y.length) return false;
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}

// True when a server-to-server call carries the app's internal key in its body.
export function hasInternalKey(body) {
  const key = secrets.get('HHF_WEBHOOK_KEY') || '';
  return !!key && typeof body?.internal_key === 'string' && safeEqual(body.internal_key, key);
}

// Gate for workflow/scheduled/admin-only functions. Workflows call as the app admin;
// other backend functions pass `internal_key`. Anonymous and non-admin callers are rejected.
// Returns null when allowed, otherwise a 401/403 Response.
export async function requireAutomationCaller(base44, req) {
  const body = await req.clone().json().catch(() => ({}));
  if (hasInternalKey(body)) return null;
  const user = await base44.auth.me().catch(() => null);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isAppAdmin(user)) return Response.json({ error: 'Forbidden' }, { status: 403 });
  return null;
}