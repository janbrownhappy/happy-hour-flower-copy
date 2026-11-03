import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import {
  researchInstruction,
  AMENITY_SCHEMA_FIELDS,
  gatedAmenities,
  sanitizeProposals,
  persistAmenities,
  sanitizeContradicted,
  mergeAmenityEvidence,
} from '../../shared/amenityEnrich.ts';
import {
  researchOfficialWebsite, renderEvidenceForPrompt, applySocialLinks, logWebsiteResearch,
} from '../../shared/scrapflyResearch.ts';
import { runPlacesPrepass, applyPlacesToVenue } from '../../shared/googlePlacesEnrich.ts';
import { VENUE_PHOTO_PLACEHOLDER } from '../../shared/venuePhotoPlaceholder.ts';
import { SOURCES, isClaimed, applyProtectedUpdates, recordDiscrepancies } from '../../shared/enrichmentProtection.ts';
import { gateFieldFindings, gateHappyHour, venueIdentity, demoteForIdentity, activityStatus } from '../../shared/evidenceGate.ts';

// Bulk FULL-profile enrichment. Each venue costs one Places lookup plus one
// web-search LLM call (~10-30s), so a request handles a small slice and returns a
// cursor the admin UI loops on.
const DEFAULT_BATCH = 3;

// Fields the LLM researches when Google Places already settled the contact facts.
const LLM_ONLY_FIELDS = [
  'description', 'happy_hour_start', 'happy_hour_end', 'days', 'deals',
  'facebook_url', 'instagram_url', 'tiktok_url', 'threads_url', 'youtube_url', 'x_url',
];
const CONTACT_FIELDS = ['address', 'city', 'zip_code', 'phone', 'website', 'category'];

const HH_KEYS = ['happy_hour_start', 'happy_hour_end', 'days', 'deals'];
const evidenceProps = {
  source: { type: 'string' },
  source_url: { type: 'string', description: 'Exact page URL of the evidence.' },
  evidence: { type: 'string', description: 'Text copied exactly from that page.' },
};
const sourcedString = { type: 'object', properties: { value: { type: 'string' }, ...evidenceProps } };
const sourcedList = {
  type: 'object',
  properties: { value: { type: 'array', items: { type: 'string' } }, ...evidenceProps },
};

function buildFieldSchema(keys) {
  const props = {};
  for (const key of keys) {
    props[key] = key === 'days' || key === 'deals' ? sourcedList : sourcedString;
  }
  return { type: 'object', properties: props };
}

// Entity writes can hit the rate limit mid-sweep; back off rather than losing a venue.
async function withRetry(fn, attempts = 3) {
  let lastError;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      const status = err?.status || err?.response?.status;
      if (status !== 429) throw err;
      await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, i)));
    }
  }
  throw lastError;
}

// Pull the researched value out of a { value, source } pair, skipping blanks so a
// null answer never wipes data already on the record.
function collectUpdates(fields, keys) {
  const updates = {};
  for (const key of keys) {
    const value = fields?.[key]?.value;
    if (value == null) continue;
    // The model sometimes returns placeholder text instead of a real null.
    if (typeof value === 'string' && /^(|null|none|n\/?a|unknown|not found|undefined)$/i.test(value.trim())) continue;
    if (Array.isArray(value) && value.length === 0) continue;
    // Days are stored as Mon..Sun; the model sometimes returns full day names.
    updates[key] = key === 'days' && Array.isArray(value) ? value.map((d) => String(d).trim().slice(0, 3)) : value;
  }
  return updates;
}

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    // Scheduled batch runner calls in without a user, authenticated by the internal key.
    const internalKey = Deno.env.get('HHF_WEBHOOK_KEY') || '';
    const internal = !!internalKey && body.internal_key === internalKey;
    let user = null;
    if (!internal) { try { user = await base44.auth.me(); } catch (_e) { user = null; } }
    const adminEmail = (Deno.env.get('ADMIN_EMAIL') || '').trim().toLowerCase();
    const isAdmin = internal ||
      (user && (user.role === 'admin' || (adminEmail && user.email?.trim().toLowerCase() === adminEmail)));
    if (!isAdmin) return Response.json({ error: 'Admin only' }, { status: 403 });
    const batchSize = Math.min(Math.max(Number(body.batch_size) || DEFAULT_BATCH, 1), 5);
    const force = body.force === true;
    const phase25 = body.phase === '2.5';

    // Optional targeted sweep: only the given venues (e.g. the ones just imported).
    const targetIds = Array.isArray(body.venue_ids) ? body.venue_ids.filter(Boolean) : null;
    const allActive = await base44.asServiceRole.entities.Venue.filter({ status: 'active' }, 'name', 2000);
    const allVenues = targetIds ? allActive.filter((v) => targetIds.includes(v.id)) : allActive;
    // Venues already swept are skipped, so a resume never re-spends credits on them.
    const pending = force ? allVenues : allVenues.filter((v) => !v.full_enrichment_at);
    const alreadyDone = allVenues.length - pending.length;
    const slice = pending.slice(0, batchSize);

    const results = [];
    for (const venue of slice) {
      try {
        let current = venue;
        let placesAmenities = [];
        const places = await runPlacesPrepass({
          name: venue.name,
          address: venue.address || '',
          city: venue.city || '',
          state_code: venue.state_code || '',
          zip_code: venue.zip_code || '',
          lat: venue.lat,
          lng: venue.lng,
          website: venue.website || '',
        });

        const protectedFields = [];
        let discrepanciesRecorded = 0;
        // Phase 2.5 recent-activity gate: only venues Google confirms as operating get enriched.
        const activity = activityStatus(places);
        if (phase25 && activity.status !== 'ACTIVE_RECENTLY_CONFIRMED') {
          const closed = activity.status === 'CONFIRMED_CLOSED';
          const fp = { ...(venue.field_provenance || {}), activity_status: activity.status, activity_checked_at: new Date().toISOString() };
          await withRetry(() => base44.asServiceRole.entities.Venue.update(venue.id, closed ? { status: 'inactive', field_provenance: fp } : { field_provenance: fp }));
          discrepanciesRecorded += await recordDiscrepancies(base44, venue, [{
            field: closed ? 'business_status' : 'venue_activity', existing_value: venue.status, proposed_value: activity.status,
            proposed_source: SOURCES.GOOGLE_PLACES, evidence: activity.evidence,
            reason: closed ? 'CONFIRMED_CLOSED — set inactive (record and history preserved)' : activity.status === 'POSSIBLY_CLOSED' ? 'VENUE_CLOSURE_REVIEW' : 'VENUE_ACTIVITY_REVIEW — no automatic enrichment',
          }], 'phase25');
          results.push({ venue_id: venue.id, venue_name: venue.name, activity, skipped: true, set_inactive: closed, places: { matched: places.matched, reason: places.match_reason || places.reason || '', rejected: places.rejected || [] }, discrepancies_recorded: discrepanciesRecorded });
          continue;
        }
        if (places.matched) {
          placesAmenities = places.amenities || [];
          // Places writes pass through the protection policy (claimed/owner/admin values stay).
          const res = await applyPlacesToVenue(base44, venue, places, 'enrichAllVenuesFull', withRetry);
          current = res.venue;
          protectedFields.push(...res.protected.map((p) => p.field));
          discrepanciesRecorded += res.discrepancies;
        }

        // Official website evidence (Scrapfly). Failure resolves to a status, never throws.
        const siteResearch = await researchOfficialWebsite(current, places);
        await logWebsiteResearch(base44, current, siteResearch, 'enrichAllVenuesFull');
        const identity = venueIdentity(current, places, siteResearch);

        const known = {
          name: current.name || null,
          address: current.address || null,
          city: current.city || null,
          zip_code: current.zip_code || null,
          phone: current.phone || null,
          website: current.website || null,
          category: current.category || null,
          description: current.description || null,
          happy_hour_start: current.happy_hour_start || null,
          happy_hour_end: current.happy_hour_end || null,
          days: current.days || [],
          deals: current.deals || [],
          facebook_url: current.facebook_url || null,
          instagram_url: current.instagram_url || null,
          tiktok_url: current.tiktok_url || null,
          threads_url: current.threads_url || null,
          youtube_url: current.youtube_url || null,
          x_url: current.x_url || null,
        };

        const requestedFields = places.matched ? LLM_ONLY_FIELDS : [...CONTACT_FIELDS, ...LLM_ONLY_FIELDS];

        const placesContext = places.matched
          ? `=== AUTHORITATIVE GOOGLE PLACES DATA (already verified — do NOT contradict or re-report these) ===
Matched Google listing: ${places.display_name}
${JSON.stringify(places.fields, null, 2)}
${places.opening_hours ? `Business hours (a happy hour can only fall inside these):\n${places.opening_hours.join('\n')}` : ''}
${placesAmenities.length ? `Amenities Google already asserts (do NOT repeat these in your amenities list):\n${placesAmenities.map((a) => a.slug).join(', ')}` : ''}

Identity, address, city, ZIP, phone, website and category are settled above. Research ONLY: ${LLM_ONLY_FIELDS.join(', ')}.`
          : `=== NO GOOGLE PLACES MATCH ===
Google Places could not confirm this business, so contact details are unverified. Research every
field below yourself and cite a source for each one.`;

        const prompt = `${researchInstruction()}

=== THIS TASK ===
Apply the Venue Research Skill above to research this bar/restaurant thoroughly using all available
public sources (official website, Google Maps/Places, social media, review sites, menus).

Venue currently on file:
${JSON.stringify(known, null, 2)}

${placesContext}

${renderEvidenceForPrompt(siteResearch, current)}

This result is saved automatically with no human review, so accuracy matters more than completeness.
Return a value ONLY when a real source supports it; otherwise return null. For HAPPY HOUR be
especially strict — never invent times or deals.

Return JSON only. For each field give the value plus a short "source" string describing where you
found it. Unknown or unconfirmed fields must be null.

Rules:
- Website / social URLs must be full https:// URLs and belong to this venue
- Times like "4:00 PM"
- days: array from ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"]
- deals: array of short strings (e.g. "$5 house cocktails", "Half-price wings")
${places.matched ? '' : '- Phone format: (XXX) XXX-XXXX\n'}- happy_hour_confirmed: true only if an explicit, current source states the happy hour times/deals.
- amenities: follow the AMENITIES — EVIDENCE-ONLY TAGGING rules above exactly. Every entry needs a real catalog slug AND a specific source.
- proposed_amenities: only distinctive, source-confirmed features no catalog slug covers. Empty array when there are none.
- contradicted_amenities: only catalog amenities a current, cited source says the venue does NOT offer. Empty array when none.`;

        const schema = {
          type: 'object',
          properties: {
            fields: buildFieldSchema(requestedFields),
            ...AMENITY_SCHEMA_FIELDS,
            happy_hour_confirmed: { type: 'boolean' },
            happy_hour_source_url: { type: 'string', description: 'Exact page URL the happy hour came from.' },
            happy_hour_evidence: { type: 'string', description: 'Text copied EXACTLY from that page stating the happy hour.' },
            happy_hour_location: { type: 'string', description: "'this_location' | 'all_locations' | 'other_location' | 'unclear'" },
            happy_hour_source_date: { type: 'string', description: 'A date printed ON that page that dates the happy-hour info (e.g. "October 5, 2026"), copied exactly. Never the retrieval date or a copyright year. Empty if the page shows no such date.' },
            summary: { type: 'string', description: 'Short plain-language summary of findings and uncertainty.' },
          },
        };

        const research = await base44.asServiceRole.integrations.Core.InvokeLLM({
          model: 'gemini_3_flash',
          add_context_from_internet: true,
          prompt,
          response_json_schema: schema,
        });

        // Unconfirmed happy hour never auto-saves — it would publish a guess.
        const hhConfirmed = research?.happy_hour_confirmed === true;
        if (research) research.fields = applySocialLinks(research.fields, siteResearch);
        const researched = collectUpdates(research?.fields, requestedFields);

        // Phase 2.3 gates. Non-happy-hour fields: only official-website (Class B) values write.
        const nonHH = Object.fromEntries(Object.entries(researched).filter(([k]) => !HH_KEYS.includes(k)));
        const fieldGate = gateFieldFindings(current, nonHH, research?.fields, siteResearch);
        // Happy hour: official, location-confirmed, traceable quote; merge — never regress.
        const hhProposed = hhConfirmed ? Object.fromEntries(Object.entries(researched).filter(([k]) => HH_KEYS.includes(k))) : {};
        const hhGate = gateHappyHour(current, hhProposed, {
          source_url: research?.happy_hour_source_url, evidence: research?.happy_hour_evidence,
          location_applicability: research?.happy_hour_location, source_date: research?.happy_hour_source_date,
        }, siteResearch);
        // Ambiguous identity: research is shown for review only, nothing auto-writes.
        if (identity.status === 'IDENTITY_NEEDS_REVIEW') {
          fieldGate.allowed = {}; hhGate.updates = {};
          demoteForIdentity(fieldGate.log); demoteForIdentity(hhGate.log);
        }
        const plan = applyProtectedUpdates(current, { ...fieldGate.allowed, ...hhGate.updates }, SOURCES.OFFICIAL_WEBSITE);
        protectedFields.push(...plan.protected.map((p) => p.field));
        const gateReview = [
          ...fieldGate.log.filter((e) => e.decision !== 'auto_saved').map((e) => ({
            field: e.field, existing_value: current[e.field] ?? null, proposed_value: e.value,
            proposed_source: e.source_class === 'B' ? SOURCES.OFFICIAL_WEBSITE : SOURCES.GEMINI,
            evidence: e.evidence, source_url: e.source_url, reason: `Review only — ${e.reason}`,
          })),
          ...hhGate.log.filter((e) => e.action !== 'written' && e.action !== 'retained_existing').map((e) => ({
            field: e.field || 'happy_hour', existing_value: e.existing_deal ?? e.existing, existing_source: e.existing_source || '',
            proposed_value: e.proposed_deal ?? e.proposed,
            proposed_source: e.source_class === 'B' ? SOURCES.OFFICIAL_WEBSITE : SOURCES.GEMINI,
            evidence: e.evidence, source_url: e.source_url,
            reason: e.action === 'conflict'
              ? `HAPPY_HOUR_DEAL_CONFLICT — class ${e.source_class}, ${e.location_status}; recommended ${e.recommended_action}`
              : `Review only — ${e.reason}`,
          })),
        ];
        discrepanciesRecorded += await recordDiscrepancies(
          base44, current, [...plan.protected, ...gateReview], 'enrichAllVenuesFull'
        );

        current = await withRetry(() =>
          base44.asServiceRole.entities.Venue.update(venue.id, {
            ...plan.updates,
            full_enrichment_at: new Date().toISOString(),
          })
        );

        const amenities = await gatedAmenities(base44, current, research?.amenities, siteResearch, 'enrichAllVenuesFull', identity);
        const reviewQueued = amenities.reviewQueued;
        const proposals = sanitizeProposals(research?.proposed_amenities);
        const contradicted = sanitizeContradicted(research?.contradicted_amenities);
        const merged = mergeAmenityEvidence(amenities.kept, placesAmenities);
        const persisted = await withRetry(() =>
          persistAmenities(base44, current, merged, proposals, { contradicted, origin: 'enrichAllVenuesFull' })
        );
        discrepanciesRecorded += persisted.discrepancies || 0;

        // Photo step: venues without a real photo get the multi-source photo fetch.
        let photo = null;
        if (!(current.photo_urls || []).some((u) => u && u !== VENUE_PHOTO_PLACEHOLDER)) {
          photo = await base44.asServiceRole.functions.invoke('fetchVenuePhoto', { venueId: venue.id, assignPlaceholder: true, internal_key: internalKey })
            .then((r) => r.data).catch((e) => ({ success: false, error: e.message }));
        }

        results.push({
          photo: photo ? { success: !!photo.success, added: photo.added || 0, reason: photo.reason || '' } : null,
          venue_id: venue.id,
          venue_name: venue.name,
          claimed: isClaimed(venue),
          identity,
          activity,
          updates_written: plan.updates,
          location_structure: siteResearch.diag.location_structure || '',
          location_evidence: siteResearch.diag.location_evidence || null,
          places_protected: protectedFields,
          places_matched: places.matched,
          fields_updated: plan.applied,
          fields_protected: [...new Set(protectedFields)],
          discrepancies_recorded: discrepanciesRecorded,
          happy_hour_confirmed: hhConfirmed,
          amenities_saved: persisted.created,
          proposals_queued: persisted.queued,
          dropped: amenities.dropped.length,
          auto_saved: amenities.kept.map((a) => ({ slug: a.slug, confidence: a.confidence, source_url: a.source_url, evidence: a.evidence })),
          places_amenities: placesAmenities.map((a) => a.slug),
          review_only: amenities.review,
          review_queued: reviewQueued,
          amenity_gate: amenities.log,
          field_gate: fieldGate.log,
          happy_hour_gate: hhGate.log,
          places: { matched: places.matched, reason: places.match_reason || places.reason || '', address: places.matched_address || '', rejected: places.rejected || [] },
          fields_researched: Object.fromEntries(Object.entries(researched).map(([k, v]) => [k, { value: v, source: research?.fields?.[k]?.source || '' }])),
          website_research: {
            status: siteResearch.diag.status, pages: siteResearch.diag.pages.length, requests: siteResearch.diag.requests,
            rendered: siteResearch.diag.rendered_count, pdf_links: siteResearch.diag.pdf_links, errors: siteResearch.diag.errors,
            multi_location: siteResearch.diag.multi_location, duration_ms: siteResearch.diag.duration_ms,
          },
          summary: research?.summary || '',
        });
      } catch (err) {
        // One venue failing must never abort the sweep.
        results.push({ venue_id: venue.id, venue_name: venue.name, error: err.message });
      }
    }

    const processed = alreadyDone + slice.length;
    return Response.json({
      success: true,
      total: allVenues.length,
      processed,
      next_offset: processed < allVenues.length ? processed : null,
      done: slice.length === 0 || processed >= allVenues.length,
      results,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}