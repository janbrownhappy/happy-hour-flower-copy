import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { secrets } from 'base44:runtime';
import { fetchActiveEntitlements, applyEntitlements } from '../../shared/revenuecat.ts';

// Returns the caller's (or their venue's) active RevenueCat entitlements and
// syncs them onto the Profile / Venue — doubles as a manual "refresh".
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const { venue_id } = await req.json().catch(() => ({}));

    let appUserId = user.id;
    if (venue_id) {
      const venue = await base44.asServiceRole.entities.Venue.get(venue_id).catch(() => null);
      if (!venue) return Response.json({ error: 'Venue not found' }, { status: 404 });
      const allowed = venue.owner_id === user.id || (venue.editor_ids || []).includes(user.id);
      if (!allowed) return Response.json({ error: 'Forbidden' }, { status: 403 });
      appUserId = `venue_${venue_id}`;
    }

    const { active, entitlements } = await fetchActiveEntitlements(appUserId, secrets.get('REVENUECAT_SECRET_KEY'));
    const result = await applyEntitlements(base44, appUserId, active, entitlements, null);
    return Response.json({ active, subscription_tier: result.subscription_tier || 'free' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}