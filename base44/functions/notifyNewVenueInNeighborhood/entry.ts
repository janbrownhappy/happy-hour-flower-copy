import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { requireAutomationCaller } from '../../shared/automationAuth.ts';

// Notifies users when a new venue becomes active in their saved neighborhood.
// Triggered by an entity automation on Venue create/update.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const denied = await requireAutomationCaller(base44, req);
    if (denied) return denied;
    const body = await req.json();
    const { event, data, old_data } = body || {};

    // Always load the stored venue — never trust venue fields from the request body.
    const venueId = event?.entity_id || data?.id;
    const venue = venueId ? await base44.asServiceRole.entities.Venue.get(venueId).catch(() => null) : null;
    if (!venue) {
      return Response.json({ skipped: true, reason: 'No venue data' });
    }

    const neighborhoodLabel = venue.neighborhood;
    if (!neighborhoodLabel) {
      return Response.json({ skipped: true, reason: 'Venue has no neighborhood' });
    }

    // Only alert when the venue is newly visible to users (active).
    // For updates, require that it just transitioned into "active" OR just got a neighborhood,
    // so we don't re-alert on unrelated edits to an already-active venue.
    const isActive = venue.status === 'active';
    if (!isActive) {
      return Response.json({ skipped: true, reason: 'Venue is not active' });
    }
    if (event?.type === 'update' && old_data) {
      const becameActive = old_data.status !== 'active';
      const gotNeighborhood = old_data.neighborhood !== neighborhoodLabel;
      if (!becameActive && !gotNeighborhood) {
        return Response.json({ skipped: true, reason: 'No newly-relevant change' });
      }
    }

    // Neighborhood code is the leading token of the label, e.g. "GVL-01 Downtown / Main Street" -> "GVL-01"
    const neighborhoodCode = String(neighborhoodLabel).split(/\s+/)[0];

    // Find profiles whose saved territory matches this neighborhood (by code or full label)
    const allProfiles = await base44.asServiceRole.entities.Profile.list();
    const matching = allProfiles.filter(p => {
      const pref = p.location_preferences?.neighborhood;
      if (!pref) return false;
      return pref === neighborhoodCode || pref === neighborhoodLabel;
    });

    if (matching.length === 0) {
      return Response.json({ success: true, feed_created: 0, push_sent: 0, reason: 'No users in this neighborhood' });
    }

    const venueName = venue.name || 'A new spot';
    const cleanHood = String(neighborhoodLabel).replace(/^[A-Z]+-\d+\s*/, '') || neighborhoodLabel;
    const title = `New happy hour spot in ${cleanHood}`;
    const message = `${venueName} just joined Happy Hour Flower in your area. Check it out!`;

    let feedCreated = 0;
    const pushUserIds = [];

    for (const profile of matching) {
      const userId = profile.created_by_id;
      if (!userId) continue;

      await base44.asServiceRole.entities.VenueNotification.create({
        user_id: userId,
        venue_id: venueId,
        venue_name: venueName,
        type: 'new_listing',
        title,
        message,
        is_read: false,
      });
      feedCreated++;

      // Queue push for users who have push notifications enabled
      if (profile.notif_push !== false) {
        pushUserIds.push(userId);
      }
    }

    // Send a single push notification batch via OneSignal
    let pushSent = 0;
    if (pushUserIds.length > 0) {
      const appId = Deno.env.get('ONESIGNAL_APP_ID');
      const apiKey = Deno.env.get('ONESIGNAL_REST_API_KEY');
      if (appId && apiKey) {
        const res = await fetch('https://onesignal.com/api/v1/notifications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Basic ${apiKey}` },
          body: JSON.stringify({
            app_id: appId,
            headings: { en: title },
            contents: { en: message },
            url: `/venue/${venueId}`,
            include_external_user_ids: pushUserIds,
            channel_for_external_user_ids: 'push',
          }),
        });
        const result = await res.json().catch(() => ({}));
        pushSent = result.recipients || 0;
      }
    }

    return Response.json({ success: true, feed_created: feedCreated, push_sent: pushSent, matched_users: matching.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});