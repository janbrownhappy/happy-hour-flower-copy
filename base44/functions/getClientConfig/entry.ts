import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Public-safe app configuration: disabled feature keys, whitelisted settings,
// and (for signed-in venue owners) their own venues' feature overrides.
const PUBLIC_SETTINGS = ['reviews_enabled', 'despia_location_movement_meters', 'despia_location_buffer_seconds'];

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const svc = base44.asServiceRole.entities;
  const user = await base44.auth.me().catch(() => null);

  const [flags, settings] = await Promise.all([
    svc.FeatureFlag.filter({ is_enabled: false }),
    svc.AppSetting.filter({ key: { $in: PUBLIC_SETTINGS } }),
  ]);
  const settingMap = {};
  settings.forEach((s) => { settingMap[s.key] = { value_bool: s.value_bool, value_string: s.value_string }; });

  const venueOverrides = {};
  if (user) {
    const venues = await svc.Venue.filter({ owner_id: user.id });
    const ids = venues.map((v) => v.id);
    if (ids.length) {
      const now = Date.now();
      const rows = await svc.VenueFeatureOverride.filter({ venue_id: { $in: ids } });
      rows.forEach((o) => {
        if (o.expires_at && new Date(o.expires_at).getTime() < now) return;
        venueOverrides[o.feature_key] = o.is_enabled !== false;
      });
    }
  }

  return Response.json({ disabled_features: flags.map((f) => f.feature_key), settings: settingMap, venue_overrides: venueOverrides });
});