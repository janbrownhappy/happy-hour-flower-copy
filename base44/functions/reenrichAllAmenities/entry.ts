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
import { researchOfficialWebsite, renderEvidenceForPrompt, logWebsiteResearch } from '../../shared/scrapflyResearch.ts';
import { runPlacesPrepass, applyPlacesToVenue } from '../../shared/googlePlacesEnrich.ts';
import { venueIdentity } from '../../shared/evidenceGate.ts';

// Bulk amenity re-research. Each LLM call with web search takes ~10-30s, so a single
// request handles a small slice of venues and returns a cursor. The admin UI loops
// until done, showing progress between slices.
const DEFAULT_BATCH = 3;

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    const adminEmail = (Deno.env.get('ADMIN_EMAIL') || '').trim().toLowerCase();
    const isAdmin =
      user && (user.role === 'admin' || (adminEmail && user.email?.trim().toLowerCase() === adminEmail));
    if (!isAdmin) return Response.json({ error: 'Admin only' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const offset = Number(body.offset) || 0;
    const batchSize = Math.min(Math.max(Number(body.batch_size) || DEFAULT_BATCH, 1), 5);

    const allVenues = await base44.asServiceRole.entities.Venue.filter({ status: 'active' }, 'name', 2000);
    const slice = allVenues.slice(offset, offset + batchSize);

    const schema = {
      type: 'object',
      properties: {
        ...AMENITY_SCHEMA_FIELDS,
        notes: { type: 'string', description: 'Anything the admin should know about source quality or gaps.' },
      },
    };

    const results = [];
    for (const venue of slice) {
      try {
        // Authoritative Places pass first: refresh contacts, re-verify them, and
        // take Google's own place attributes as sourced amenities.
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
        if (places.matched) {
          placesAmenities = places.amenities || [];
          const res = await applyPlacesToVenue(base44, venue, places, 'reenrichAllAmenities');
          current = res.venue;
        }

        const siteResearch = await researchOfficialWebsite(current, places);
        await logWebsiteResearch(base44, current, siteResearch, 'reenrichAllAmenities');

        const known = {
          name: current.name || null,
          address: current.address || null,
          city: current.city || null,
          category: current.category || null,
          website: current.website || null,
          facebook_url: current.facebook_url || null,
          instagram_url: current.instagram_url || null,
        };

        const prompt = `${researchInstruction()}

=== THIS TASK ===
Research ONLY the amenities for the venue below, following the AMENITIES — EVIDENCE-ONLY TAGGING
rules above. Do not return any other venue fields.

Venue on file:
${JSON.stringify(known, null, 2)}
${placesAmenities.length ? `\nGoogle Places already asserts these amenities — do NOT repeat them:\n${placesAmenities.map((a) => a.slug).join(', ')}\n` : ''}
${renderEvidenceForPrompt(siteResearch, current)}

Return JSON only, with three arrays: amenities (catalog slugs, each with a source),
proposed_amenities (distinctive source-confirmed features with no matching slug), and
contradicted_amenities (catalog slugs a current, cited source says the venue does NOT offer).

Every entry must cite a specific source. An amenity you cannot source must be omitted entirely —
do not guess from the venue's category, name, or neighborhood. If you can confirm nothing, return
empty arrays and explain why in notes. Empty arrays are an acceptable, correct answer.`;

        const research = await base44.asServiceRole.integrations.Core.InvokeLLM({
          model: 'gemini_3_flash',
          add_context_from_internet: true,
          prompt,
          response_json_schema: schema,
        });

        const amenities = await gatedAmenities(base44, current, research?.amenities, siteResearch, 'reenrichAllAmenities', venueIdentity(current, places, siteResearch));
        const reviewQueued = amenities.reviewQueued;
        const proposals = sanitizeProposals(research?.proposed_amenities);
        // persistAmenities rewrites the venue's amenity rows, so the Places-sourced
        // ones must be included or they would be lost. One row per slug.
        const merged = mergeAmenityEvidence(amenities.kept, placesAmenities);
        const contradicted = sanitizeContradicted(research?.contradicted_amenities);
        const persisted = await persistAmenities(base44, current, merged, proposals, { contradicted, origin: 'reenrichAllAmenities' });

        results.push({
          venue_id: venue.id,
          venue_name: venue.name,
          places_matched: places.matched,
          places_amenities: placesAmenities.length,
          amenities_saved: persisted.created,
          proposals_queued: persisted.queued,
          dropped: amenities.dropped.length,
          auto_saved: amenities.kept.map((a) => ({ slug: a.slug, confidence: a.confidence, source_url: a.source_url, evidence: a.evidence })),
          review_only: amenities.review,
          review_queued: reviewQueued,
          website_research: { status: siteResearch.diag.status, pages: siteResearch.diag.pages.length, requests: siteResearch.diag.requests },
          notes: research?.notes || '',
        });
      } catch (err) {
        // One venue failing must never abort the sweep.
        results.push({ venue_id: venue.id, venue_name: venue.name, error: err.message });
      }
    }

    const nextOffset = offset + slice.length;
    return Response.json({
      success: true,
      total: allVenues.length,
      processed: nextOffset,
      next_offset: nextOffset < allVenues.length ? nextOffset : null,
      done: nextOffset >= allVenues.length,
      results,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}