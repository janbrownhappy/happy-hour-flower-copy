import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { secrets } from 'base44:runtime';
import { fetchActiveEntitlements, applyEntitlements } from '../../shared/revenuecat.ts';

// Public RevenueCat webhook. Access is always re-read from RevenueCat's API,
// never trusted from the event type.
export default async function (req) {
  try {
    if (req.method !== 'POST') return Response.json({ error: 'Method not allowed' }, { status: 405 });
    const expected = secrets.get('REVENUECAT_WEBHOOK_AUTH');
    if (!expected || req.headers.get('Authorization') !== expected) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const event = body?.event || {};
    if (event.environment === 'SANDBOX') return Response.json({ ignored: 'sandbox' });
    const appUserId = event.app_user_id;
    if (!appUserId) return Response.json({ ignored: 'no_app_user_id' });

    const { active, entitlements } = await fetchActiveEntitlements(appUserId, secrets.get('REVENUECAT_SECRET_KEY'));
    const result = await applyEntitlements(base44, appUserId, active, entitlements, event.type);
    return Response.json({ received: true, active, result });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}