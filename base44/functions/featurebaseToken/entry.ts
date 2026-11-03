import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { secrets } from 'base44:runtime';
import jwt from 'npm:jsonwebtoken@9.0.2';

/**
 * Signs a Featurebase identity JWT (HS256) for the currently logged-in user.
 * The token carries the user's identity plus audience-aware custom attributes so
 * every Featurebase widget (Feedback, Updates, Messenger) inherits the correct
 * identity and can be sliced by role / tier / market.
 *
 * Custom attributes (role, subscription_tier, market_id, market_name) must be
 * declared in Featurebase → Settings → Users → Custom attributes to persist.
 */
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const jwtSecret = secrets.get('FEATUREBASE_JWT_SECRET');
    if (!jwtSecret) {
      return Response.json({ error: 'FEATUREBASE_JWT_SECRET not configured' }, { status: 500 });
    }

    // Enrich with the user's Profile (tier + market) — best effort, never block auth
    let profile = null;
    try {
      const profiles = await base44.entities.Profile.filter({ created_by_id: user.id });
      profile = profiles[0] || null;
    } catch (_) { /* profile optional */ }

    const role = user.role || 'user';
    const audience =
      role === 'admin' ? 'admin' : role === 'venue_owner' ? 'venue_owner' : 'consumer';
    const subscriptionTier =
      profile?.subscription_tier || (profile?.is_premium ? 'premium' : 'free');
    const locPrefs = profile?.location_preferences || {};

    // Venue owners: attach their venues as Featurebase "companies" so feedback
    // and support can be sliced by account.
    let companies = undefined;
    if (audience === 'venue_owner') {
      try {
        const venues = await base44.entities.Venue.filter({ owner_id: user.id });
        if (venues.length > 0) {
          companies = venues.map((v) => ({
            companyId: v.id,
            name: v.name || 'Venue',
            plan: v.subscription_tier || 'free',
            city: v.city || '',
            market_name: v.market_name || '',
          }));
        }
      } catch (_) { /* venues optional */ }
    }

    const payload = {
      userId: user.id,
      email: user.email,
      name: user.full_name || user.email,
      role: audience,
      subscription_tier: subscriptionTier,
      market_id: locPrefs.market_id || '',
      market_name: locPrefs.market_name || '',
    };
    if (companies) payload.companies = companies;

    const token = jwt.sign(payload, jwtSecret, { algorithm: 'HS256' });

    return Response.json({ token });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}