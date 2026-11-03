import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { secrets } from 'base44:runtime';
import { findDuplicateClusters, buildMergePatch, VENUE_CHILD_ENTITIES } from '../../shared/venueDedupe.ts';

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const adminEmail = secrets.get('ADMIN_EMAIL');
    if (user.role !== 'admin' && user.email !== adminEmail) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const execute = body.execute === true;
    const approvedIds = Array.isArray(body.cluster_ids) ? body.cluster_ids : [];

    const svc = base44.asServiceRole.entities;
    const venues = await svc.Venue.list('name', 5000);

    // Per-venue child counts feed the completeness score.
    const [items, amenities] = await Promise.all([
      svc.HappyHourItem.list('-created_date', 20000).catch(() => []),
      svc.VenueAmenity.list('-created_date', 20000).catch(() => []),
    ]);
    const counts = {};
    const bump = (id, key) => {
      if (!id) return;
      if (!counts[id]) counts[id] = { items: 0, amenities: 0 };
      counts[id][key] += 1;
    };
    items.forEach((i) => bump(i.venue_id, 'items'));
    amenities.forEach((a) => bump(a.venue_id, 'amenities'));

    const clusters = findDuplicateClusters(venues, counts);

    if (!execute) {
      return Response.json({
        dry_run: true,
        total_venues: venues.length,
        clusters,
        cluster_count: clusters.length,
        duplicate_count: clusters.reduce((n, c) => n + c.duplicates.length, 0),
      });
    }

    const byId = Object.fromEntries(venues.map((v) => [v.id, v]));
    const targets = approvedIds.length
      ? clusters.filter((c) => approvedIds.includes(c.cluster_id))
      : [];
    if (!targets.length) {
      return Response.json({ error: 'No approved clusters to execute.' }, { status: 400 });
    }

    const results = [];
    let deleted = 0;
    let reparented = 0;

    for (const cluster of targets) {
      const survivor = byId[cluster.survivor.id];
      const dups = cluster.duplicates.map((d) => byId[d.id]).filter(Boolean);
      if (!survivor || !dups.length) continue;

      const detail = { cluster_id: cluster.cluster_id, survivor: survivor.name, deleted: [], moved: {}, fields_merged: [], error: '' };
      try {
        // 1. Merge fields the survivor is missing.
        const patch = buildMergePatch(survivor, dups);
        if (Object.keys(patch).length) {
          await svc.Venue.update(survivor.id, patch);
          detail.fields_merged = Object.keys(patch);
        }

        // 2. Re-parent every child record, then delete the duplicate.
        for (const dup of dups) {
          for (const entity of VENUE_CHILD_ENTITIES) {
            try {
              const children = await svc[entity].filter({ venue_id: dup.id }, '-created_date', 1000);
              if (!children.length) continue;
              await svc[entity].updateMany({ venue_id: dup.id }, { $set: { venue_id: survivor.id } });
              detail.moved[entity] = (detail.moved[entity] || 0) + children.length;
              reparented += children.length;
            } catch (e) {
              // Entity without a venue_id field / not queryable — skip it.
            }
          }
          await svc.Venue.delete(dup.id);
          detail.deleted.push(dup.name);
          deleted += 1;
        }
      } catch (err) {
        detail.error = err.message;
      }
      results.push(detail);
    }

    return Response.json({
      dry_run: false,
      clusters_processed: results.length,
      venues_deleted: deleted,
      records_reparented: reparented,
      results,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}