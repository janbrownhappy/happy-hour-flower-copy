// RevenueCat is the single source of truth for subscription access.
// Shared by revenuecatWebhook and getEntitlements.

export async function fetchActiveEntitlements(appUserId, secretKey) {
  const res = await fetch(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(appUserId)}`, {
    headers: { Authorization: `Bearer ${secretKey}` },
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`RevenueCat lookup failed (${res.status})`);
  const json = await res.json();
  const ents = json?.subscriber?.entitlements || {};
  const now = Date.now();
  const active = Object.keys(ents).filter((id) => {
    const exp = ents[id]?.expires_date;
    return !exp || new Date(exp).getTime() > now;
  });
  return { active, entitlements: ents };
}

// Writes the access state onto the Venue (venue_<id>) or the user's Profile.
export async function applyEntitlements(base44, appUserId, active, entitlements, eventType) {
  const now = new Date().toISOString();
  const has = (id) => active.includes(id);

  if (appUserId.startsWith('venue_')) {
    const venueId = appUserId.slice('venue_'.length);
    const venue = await base44.asServiceRole.entities.Venue.get(venueId).catch(() => null);
    if (!venue) return { updated: false, reason: 'venue_not_found' };
    const anyActive = has('venue_premium') || has('venue_platinum') || has('venue_platinum_plus');
    const update = {
      subscription_tier: has('venue_platinum') || has('venue_platinum_plus') ? 'platinum' : has('venue_premium') ? 'premium' : 'free',
      billing_status: anyActive ? 'active' : eventType === 'BILLING_ISSUE' ? 'past_due' : 'canceled',
      billing_status_updated_at: now,
    };
    if (has('venue_platinum_plus')) update.geofence_addon_status = 'active';
    else if (venue.geofence_addon_status === 'active') update.geofence_addon_status = 'canceled';
    await base44.asServiceRole.entities.Venue.update(venueId, update);
    return { updated: true, target: 'venue', venue_id: venueId, ...update };
  }

  const profiles = await base44.asServiceRole.entities.Profile.filter({ created_by_id: appUserId });
  const profile = profiles[0];
  if (!profile) return { updated: false, reason: 'profile_not_found' };
  const premium = has('consumer_premium');
  const update = {
    is_premium: premium,
    subscription_tier: premium ? 'premium' : 'free',
    subscription_status: premium ? 'active' : 'expired',
    subscription_expires_at: entitlements?.consumer_premium?.expires_date || '',
  };
  await base44.asServiceRole.entities.Profile.update(profile.id, update);
  return { updated: true, target: 'profile', ...update };
}