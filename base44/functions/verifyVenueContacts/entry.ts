import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { secrets } from 'base44:runtime';
import { SOURCES, applyProtectedUpdates, recordDiscrepancies } from '../../shared/enrichmentProtection.ts';
import { confirmContactsOnWebsite, logWebsiteResearch } from '../../shared/scrapflyResearch.ts';
import { placeMatchesVenue } from '../../shared/googlePlacesEnrich.ts';

// Before any contact value is CLEARED, check the venue's own website. If the official site
// independently confirms the website / phone, those values are kept — Google failing to
// confirm them is not evidence they are wrong. Only runs when a clear would actually happen.
async function keepWebsiteConfirmed(base44, venue, proposed, website) {
  const clearing = Object.keys(proposed).filter((k) => proposed[k] == null && ['phone', 'website'].includes(k));
  if (!clearing.length || !venue.website) return { proposed, siteConfirmed: false, retained: [] };
  const probe = applyProtectedUpdates(venue, Object.fromEntries(clearing.map((k) => [k, null])), SOURCES.GOOGLE_PLACES);
  if (!probe.applied.length) return { proposed, siteConfirmed: false, retained: [] }; // protected anyway — nothing would be cleared
  const check = await confirmContactsOnWebsite({ ...venue, website: venue.website });
  await logWebsiteResearch(base44, venue, { diag: check.diag, evidence: [] }, 'verifyVenueContacts');
  const next = { ...proposed };
  const retained = [];
  if (check.website_confirmed && next.website === null) { delete next.website; retained.push('website'); }
  if (check.phone_confirmed && next.phone === null) { delete next.phone; retained.push('phone'); }
  return { proposed: next, siteConfirmed: check.website_confirmed, retained, evidenceUrl: check.diag?.official_website || venue.website };
}

// Re-verifies every active venue's phone + website against Google Places, matching on
// BOTH the business name and the street number of our stored address. All writes pass
// through the shared protection policy: unclaimed venues with unprotected contact data
// may only have EMPTY contacts filled. Existing contacts are never cleared or overwritten by
// automation (no match = UNVERIFIED, a different value = CONFLICT_REVIEW_REQUIRED).

const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
const streetNumber = (a) => (String(a || '').match(/\d{1,6}/) || [''])[0];
const digits = (s) => String(s || '').replace(/\D/g, '').slice(-10);

function nameMatches(ours, theirs) {
  const a = norm(ours);
  const b = norm(theirs);
  if (!a || !b) return false;
  return a === b || a.includes(b) || b.includes(a);
}

// Uses Places API (New) — the legacy maps/api/place endpoints cannot be enabled on
// current Google Cloud projects and return a misleading "enable Billing" error.
async function lookupPlace(apiKey, venue) {
  const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask':
        'places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.websiteUri,places.addressComponents,places.location',
    },
    body: JSON.stringify({
      textQuery: `${venue.name} ${venue.address || 'Greenville, SC'}`,
      maxResultCount: 5,
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Places search failed: ${data?.error?.message || res.status}`);
  }

  // Same geographic hard gate as enrichment: other-state / far-away candidates never match.
  const results = (data.places || []).filter((r) => placeMatchesVenue(venue, r).ok);
  const ourNum = streetNumber(venue.address);
  const named = (r) => nameMatches(venue.name, r.displayName?.text);
  const match =
    results.find((r) => named(r) && (!ourNum || streetNumber(r.formattedAddress) === ourNum)) ||
    results.find(named);
  return match || null;
}

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    const adminEmail = secrets.get('ADMIN_EMAIL') || '';
    const isOwner = adminEmail && user?.email?.toLowerCase() === adminEmail.toLowerCase();
    if (!user || (user.role !== 'admin' && !isOwner)) {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    const apiKey = secrets.get('GOOGLE_PLACES_API_KEY');
    if (!apiKey) return Response.json({ error: 'GOOGLE_PLACES_API_KEY not set' }, { status: 500 });

    const { batch = 0, batchSize = 10, venue_ids } = await req.json().catch(() => ({}));
    const active = await base44.asServiceRole.entities.Venue.filter({ status: 'active' }, 'name', 2000);
    // Optional targeted run (controlled testing) — only the given venues.
    const venues = Array.isArray(venue_ids) ? active.filter((v) => venue_ids.includes(v.id)) : active;
    const start = batch * batchSize;
    const slice = venues.slice(start, start + batchSize);

    const corrected = [];
    const cleared = [];
    const retained = [];
    const fieldStatus = []; // one row per contact field touched: what actually happened in the DB
    const confirmed = [];
    const errors = [];
    const protectedRows = [];

    for (const venue of slice) {
      try {
        const place = await lookupPlace(apiKey, venue);
        let plan;
        let updates = {};
        let site = { retained: [] };

        if (place) {
          const proposed = {};
          if (digits(place.nationalPhoneNumber) !== digits(venue.phone)) proposed.phone = place.nationalPhoneNumber || null;
          if ((place.websiteUri || '') !== (venue.website || '')) proposed.website = place.websiteUri || null;
          site = await keepWebsiteConfirmed(base44, venue, proposed);
          plan = applyProtectedUpdates(venue, site.proposed, SOURCES.GOOGLE_PLACES);
          updates = { ...plan.updates };
          // Only stamp verified when Google agrees with (or was allowed to set) every contact.
          if (!plan.protected.length) {
            updates.contacts_verified = true;
            updates.contacts_verified_at = new Date().toISOString();
            updates.contacts_verified_source = site.siteConfirmed ? 'google_places+official_website' : 'google_places';
          }
        } else {
          // Google could not confirm the business. The protection policy retains every existing
          // contact (no match is not evidence it is wrong); nothing is cleared.
          const proposed = {};
          if (venue.phone) proposed.phone = null;
          if (venue.website) proposed.website = null;
          site = await keepWebsiteConfirmed(base44, venue, proposed);
          plan = applyProtectedUpdates(venue, site.proposed, SOURCES.GOOGLE_PLACES);
          plan.protected = plan.protected.map((p) => ({ ...p, reason: 'Unable to verify against Google Places' }));
          updates = { ...plan.updates };
          if (site.siteConfirmed && !plan.protected.length) {
            updates.contacts_verified = true;
            updates.contacts_verified_at = new Date().toISOString();
            updates.contacts_verified_source = 'official_website';
          } else if (!plan.protected.length) updates.contacts_verified = false;
        }

        const disc = await recordDiscrepancies(base44, venue, plan.protected, 'verifyVenueContacts');
        if (disc) protectedRows.push({ name: venue.name, fields: plan.protected.map((p) => p.field), reason: plan.protected[0].reason });

        if (Object.keys(updates).length) {
          await base44.asServiceRole.entities.Venue.update(venue.id, updates);
        }
        // Report each field by what actually happened to the record — never "cleared"
        // unless the value was really set to empty.
        // Automated verification never clears or overwrites an existing contact (Phase 2.3.1).
        for (const field of ['phone', 'website']) {
          const google = place ? (field === 'phone' ? place.nationalPhoneNumber || null : place.websiteUri || null) : null;
          const conflict = plan.protected.some((p) => p.field === field);
          let status;
          if (field in updates && updates[field]) status = 'FILLED_FROM_VERIFIED_SOURCE';
          else if (conflict) status = 'CONFLICT_REVIEW_REQUIRED';
          else if (place && venue[field] && !(field in site.proposed)) status = 'CONFIRMED_GOOGLE';
          else if (site.retained.includes(field)) status = 'CONFIRMED_OFFICIAL_WEBSITE';
          else status = venue[field] ? 'UNVERIFIED' : 'EMPTY';
          const r = { name: venue.name, venue_id: venue.id, field, existing: venue[field] || null, research: place ? google : 'no Google match', final: (field in updates ? updates[field] : venue[field]) || null, status };
          if (status === 'FILLED_FROM_VERIFIED_SOURCE') corrected.push(r);
          else if (status !== 'EMPTY') retained.push(r);
          fieldStatus.push(r);
        }
        if (!disc && !fieldStatus.some((r) => r.venue_id === venue.id)) confirmed.push(venue.name);
      } catch (err) {
        errors.push({ name: venue.name, error: err.message });
      }
    }

    const hasMore = start + batchSize < venues.length;
    return Response.json({
      total: venues.length,
      processed: `${start}-${start + slice.length}`,
      confirmed: confirmed.length,
      corrected,
      cleared,
      retained,
      field_status: fieldStatus,
      protected: protectedRows,
      errors,
      hasMore,
      nextBatch: hasMore ? batch + 1 : null,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}