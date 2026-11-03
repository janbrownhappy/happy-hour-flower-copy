import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { isAppAdmin } from '../../shared/automationAuth.ts';
import { canActForVenue } from '../../shared/venueAccess.ts';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Accept either competitorIds (legacy) or competitors: [{ name, matched_venue_id }]
    const { venueId, competitorIds = [], competitors: namedCompetitors = [] } = await req.json();
    if (!venueId) return Response.json({ error: 'venueId is required' }, { status: 400 });

    // Only the venue's own team may see this, and only on the Platinum plan.
    if (!(await canActForVenue(base44.asServiceRole, user, venueId))) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (!isAppAdmin(user)) {
      const own = await base44.asServiceRole.entities.Venue.get(venueId).catch(() => null);
      if ((own?.subscription_tier || 'free') !== 'platinum') {
        return Response.json({ error: 'Competitor insights are a Platinum feature.' }, { status: 403 });
      }
    }

    // Pull all venues once so we can match by name when needed
    const allVenues = await base44.asServiceRole.entities.Venue.list('-created_date', 5000);
    const venuesById = Object.fromEntries(allVenues.map((v) => [String(v.id), v]));
    const venuesByName = Object.fromEntries(
      allVenues.map((v) => [String(v.name || '').trim().toLowerCase(), v])
    );

    // Pull all favorites & reviews once, index per venue
    const [allFavs, allReviews] = await Promise.all([
      base44.asServiceRole.entities.Favorite.list('-created_date', 5000),
      base44.asServiceRole.entities.Review.list('-created_date', 5000),
    ]);

    const buildRow = (v, displayName) => {
      if (!v) {
        // Named competitor with no matching venue — show name with zero metrics
        return {
          id: null,
          name: displayName,
          views: 0,
          favorites: 0,
          reviews: 0,
          rating: 0,
          price_level: null,
          category: '',
          matched: false,
        };
      }
      const favs = allFavs.filter((f) => String(f.venue_id) === String(v.id));
      const reviews = allReviews.filter(
        (r) => String(r.venue_id) === String(v.id) && r.status === 'approved'
      );
      return {
        id: v.id,
        name: displayName || v.name,
        views: v.view_count || 0,
        favorites: v.favorite_count || favs.length,
        reviews: reviews.length,
        rating: v.rating || 0,
        price_level: v.price_level || null,
        category: v.category || '',
        matched: true,
      };
    };

    const ownVenue = buildRow(venuesById[String(venueId)]);

    // Normalize the competitor list from either input shape
    let compEntries;
    if (namedCompetitors.length > 0) {
      compEntries = namedCompetitors.slice(0, 4).map((c) => {
        const name = (c.name || '').trim();
        let v = c.matched_venue_id ? venuesById[String(c.matched_venue_id)] : null;
        if (!v) v = venuesByName[name.toLowerCase()] || null;
        return buildRow(v, name || (v && v.name));
      });
    } else {
      compEntries = competitorIds.filter(Boolean).slice(0, 4).map((id) => {
        const v = venuesById[String(id)];
        return buildRow(v, v && v.name);
      });
    }

    const competitorsOut = compEntries.filter((c) => c && c.name);

    return Response.json({ ownVenue, competitors: competitorsOut });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});