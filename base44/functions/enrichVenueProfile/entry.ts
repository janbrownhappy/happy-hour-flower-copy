import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import {
  researchInstruction,
  AMENITY_SCHEMA_FIELDS,
  sanitizeAmenities,
  sanitizeProposals,
  persistAmenities,
  mergeAmenityEvidence,
} from '../../shared/amenityEnrich.ts';
import {
  researchOfficialWebsite, renderEvidenceForPrompt, applySocialLinks, publicDiagnostics, logWebsiteResearch,
} from '../../shared/scrapflyResearch.ts';
import { runPlacesPrepass, applyPlacesToVenue } from '../../shared/googlePlacesEnrich.ts';
import { VENUE_PHOTO_PLACEHOLDER } from '../../shared/venuePhotoPlaceholder.ts';
import { normalizeDays } from '../../shared/evidenceGate.ts';
import {
  SOURCES, isClaimed, fieldSource, stampProvenance, canAutomatedEnrichmentModify,
} from '../../shared/enrichmentProtection.ts';

// Fields the LLM is asked for once Google Places has supplied the contact facts.
const LLM_ONLY_FIELDS = [
  'description', 'happy_hour_start', 'happy_hour_end', 'days', 'deals',
  'facebook_url', 'instagram_url', 'tiktok_url', 'threads_url', 'youtube_url', 'x_url',
];
// Contact facts Places owns. Only handed to the LLM when Places found no match.
const CONTACT_FIELDS = ['name', 'address', 'city', 'zip_code', 'phone', 'website', 'category'];
// Places fields the admin review UI can show/accept as suggestions.
const REVIEWABLE_PLACES_FIELDS = new Set(['address', 'city', 'zip_code', 'phone', 'website', 'category']);
const SYSTEM_KEYS = new Set(['status']);

const sourcedString = { type: 'object', properties: { value: { type: 'string' }, source: { type: 'string' } } };
const sourcedList = {
  type: 'object',
  properties: { value: { type: 'array', items: { type: 'string' } }, source: { type: 'string' } },
};

function buildFieldSchema(keys) {
  const props = {};
  for (const key of keys) {
    props[key] = key === 'days' || key === 'deals' ? sourcedList : sourcedString;
  }
  return { type: 'object', properties: props };
}

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    // Background import queue calls in without a user, authenticated by the internal key.
    const internalKey = Deno.env.get('HHF_WEBHOOK_KEY') || '';
    const internal = !!internalKey && body.internal_key === internalKey;
    const user = internal ? null : await base44.auth.me().catch(() => null);
    const adminEmail = (Deno.env.get('ADMIN_EMAIL') || '').trim().toLowerCase();
    const isAdmin = internal || (user && (user.role === 'admin' || (adminEmail && user.email?.trim().toLowerCase() === adminEmail)));
    if (!isAdmin) {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    const {
      venue_id,
      name = '',
      website = '',
      file_urls = [],
      notes = '',
      action,
      updates,
      amenities: amenitiesToSave,
      proposed_amenities: proposalsToSave,
      places_verified,
    } = body;

    // Save path: an ADMIN deliberately accepts suggestions. This is a manual write, so
    // every accepted field is stamped hhf_admin and becomes protected from automation.
    if (action === 'save') {
      const baseUpdates = updates && typeof updates === 'object' ? { ...updates } : {};
      // Phase 2.4.1: canonical day storage (Mon..Sun); unrecognized values are kept, never guessed.
      if (Array.isArray(baseUpdates.days)) {
        const n = normalizeDays(baseUpdates.days);
        baseUpdates.days = [...n.days, ...n.invalid];
      }
      const fieldKeys = Object.keys(baseUpdates).filter((k) => !SYSTEM_KEYS.has(k));
      if (places_verified) {
        baseUpdates.contacts_verified = true;
        baseUpdates.contacts_verified_at = new Date().toISOString();
        baseUpdates.contacts_verified_source = 'google_places';
      }
      const hasFields = fieldKeys.length > 0 || Object.keys(baseUpdates).length > 0;
      const cleanAmenities = sanitizeAmenities(amenitiesToSave).kept;
      const cleanProposals = sanitizeProposals(proposalsToSave);
      const hasAmenityWork = cleanAmenities.length || cleanProposals.length;

      if (!hasFields && !hasAmenityWork) {
        return Response.json({ error: 'No fields to save' }, { status: 400 });
      }

      let saved = null;
      let wasCreated = false;
      if (venue_id) {
        const existing = await base44.asServiceRole.entities.Venue.get(venue_id);
        if (!existing) return Response.json({ error: 'Venue not found' }, { status: 404 });
        if (fieldKeys.length) baseUpdates.field_provenance = stampProvenance(existing, fieldKeys, SOURCES.HHF_ADMIN);
        saved = hasFields
          ? await base44.asServiceRole.entities.Venue.update(venue_id, baseUpdates)
          : existing;
      } else {
        if (!baseUpdates.name) return Response.json({ error: 'A new venue needs at least a name to save' }, { status: 400 });
        baseUpdates.field_provenance = stampProvenance(null, fieldKeys, SOURCES.HHF_ADMIN);
        saved = await base44.asServiceRole.entities.Venue.create({ ...baseUpdates, status: baseUpdates.status || 'draft' });
        wasCreated = true;
      }

      let amenityResult = null;
      if (hasAmenityWork && saved?.id) {
        amenityResult = await persistAmenities(base44, saved, cleanAmenities, cleanProposals, {
          provenance: SOURCES.HHF_ADMIN, origin: 'enrichVenueProfile:save',
        });
      }

      return Response.json({ success: true, venue: saved, created: wasCreated, amenities: amenityResult });
    }

    let venue = null;
    if (venue_id) {
      venue = await base44.asServiceRole.entities.Venue.get(venue_id);
      if (!venue) {
        return Response.json({ error: 'Venue not found' }, { status: 404 });
      }
    } else if (!name.trim() && !website.trim()) {
      return Response.json({ error: 'Provide a venue, or a name and/or website' }, { status: 400 });
    }

    // ── Google Places pre-pass ───────────────────────────────────────────────
    const places = await runPlacesPrepass({
      name: venue?.name || name.trim(),
      address: venue?.address || '',
      city: venue?.city || '',
      state_code: venue?.state_code || '',
      zip_code: venue?.zip_code || '',
      lat: venue?.lat,
      lng: venue?.lng,
      website: venue?.website || website.trim(),
    }, { lite: !!body.lite_places });

    // Photo step (runs alongside research): venues without a real photo get the multi-source fetch,
    // reusing the Places match's photos instead of a second Google lookup.
    const photoPromise = venue && !(venue.photo_urls || []).some((u) => u && u !== VENUE_PHOTO_PLACEHOLDER)
      ? (internal ? base44.asServiceRole : base44).functions.invoke('fetchVenuePhoto', {
          venueId: venue_id, assignPlaceholder: true,
          ...(places.matched ? { google_photos: places.photos || [] } : {}),
          ...(internal ? { internal_key: internalKey } : {}),
        }).then((r) => r.data).catch((e) => ({ success: false, error: e.message }))
      : Promise.resolve(null);

    let placesApplied = false;
    let appliedKeys = [];
    let placesProtected = [];
    let placesAmenities = [];
    if (places.matched) {
      placesAmenities = places.amenities || [];
      if (venue_id) {
        // Existing venue — Places writes go through the protection policy.
        const res = await applyPlacesToVenue(base44, venue, places, 'enrichVenueProfile');
        venue = res.venue;
        appliedKeys = res.applied;
        placesProtected = res.protected;
        placesApplied = appliedKeys.length > 0;
      }
    }

    // ── Official website research (Scrapfly) — evidence only; never fails the run ──
    const siteVenue = venue || { name: name.trim(), website: website.trim() };
    const siteResearch = await researchOfficialWebsite(siteVenue, places);
    if (venue) await logWebsiteResearch(base44, venue, siteResearch, 'enrichVenueProfile');

    const known = {
      name: venue?.name || name.trim() || null,
      address: venue?.address || null,
      city: venue?.city || null,
      zip_code: venue?.zip_code || null,
      phone: venue?.phone || null,
      website: venue?.website || website.trim() || null,
      category: venue?.category || null,
      description: venue?.description || null,
      happy_hour_start: venue?.happy_hour_start || null,
      happy_hour_end: venue?.happy_hour_end || null,
      days: venue?.days || [],
      deals: venue?.deals || [],
      facebook_url: venue?.facebook_url || null,
      instagram_url: venue?.instagram_url || null,
      tiktok_url: venue?.tiktok_url || null,
      threads_url: venue?.threads_url || null,
      youtube_url: venue?.youtube_url || null,
      x_url: venue?.x_url || null,
    };

    // With a Places match, the LLM is narrowed to what Google cannot answer.
    const requestedFields = places.matched ? LLM_ONLY_FIELDS : [...CONTACT_FIELDS, ...LLM_ONLY_FIELDS];

    const placesContext = places.matched
      ? `=== AUTHORITATIVE GOOGLE PLACES DATA (already verified — do NOT contradict or re-report these) ===
Matched Google listing: ${places.display_name}
${JSON.stringify(places.fields, null, 2)}
${places.opening_hours ? `Business hours (a happy hour can only fall inside these):\n${places.opening_hours.join('\n')}` : ''}
${placesAmenities.length ? `Amenities Google already asserts (do NOT repeat these in your amenities list):\n${placesAmenities.map((a) => a.slug).join(', ')}` : ''}

The venue's identity, address, city, ZIP, phone, website and category are settled by the data
above. Do NOT return those fields. Research ONLY: ${LLM_ONLY_FIELDS.join(', ')}.`
      : `=== NO GOOGLE PLACES MATCH ===
Google Places could not confirm this business, so contact details are unverified. Research every
field below yourself and cite a source for each one.`;

    const prompt = `${researchInstruction()}

=== THIS TASK ===
Apply the Venue Research Skill above to research this bar/restaurant thoroughly using all available public sources (official website, Google Maps/Places, social media, review sites, menus).

Venue currently on file:
${JSON.stringify(known, null, 2)}

${placesContext}

${renderEvidenceForPrompt(siteResearch, siteVenue)}

${notes ? `Additional context provided by the admin:\n${notes}\n` : ''}
${file_urls.length ? `The admin also attached ${file_urls.length} file(s) (photos of the venue, menus, or PDF documents). Use them as primary evidence — they override web sources when they conflict.` : ''}

Your task: produce the most accurate, complete result you can for the fields you were asked for. For HAPPY HOUR specials, be especially careful — only report times and deals you can actually confirm from a source. Do NOT invent happy hour details. If you cannot confirm happy hour info, set those fields to null and say so in the summary.

Return JSON only. For each field, provide the value and a short "source" string describing where you found it (e.g. "Official website", "Google Maps", "Attached menu PDF", "Instagram bio"). If a field is unknown or unconfirmed, use null for the value.

Rules:
- Website / social URLs must be full https:// URLs, and must be the venue's own accounts
- Times like "4:00 PM"
- days: array from ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"]
- deals: array of short strings (e.g. "$5 house cocktails", "Half-price wings")
${places.matched ? '' : '- Phone format: (XXX) XXX-XXXX\n'}- happy_hour_confirmed: true only if you found an explicit, current source stating the happy hour times/deals; otherwise false.
- amenities: follow the AMENITIES — EVIDENCE-ONLY TAGGING rules above exactly. Every entry needs a real catalog slug AND a specific source. Unsourced or off-catalog entries are discarded, so returning them only loses information.
- proposed_amenities: only genuinely distinctive, source-confirmed features that no catalog slug covers. Empty array when there are none.
- contradicted_amenities: only catalog amenities a current, cited source says the venue does NOT offer. Empty array when none.`;

    const schema = {
      type: 'object',
      properties: {
        fields: buildFieldSchema(requestedFields),
        ...AMENITY_SCHEMA_FIELDS,
        happy_hour_confirmed: { type: 'boolean' },
        summary: { type: 'string', description: 'A short plain-language summary of what was found and any uncertainty.' }
      }
    };

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      model: 'gemini_3_flash',
      add_context_from_internet: true,
      file_urls: file_urls.length ? file_urls : undefined,
      prompt,
      response_json_schema: schema,
    });

    // Places facts that were NOT written (new venue, or protected on an existing one) ride
    // along as pre-sourced suggestions the admin can deliberately accept.
    if (places.matched) {
      result.fields = result.fields || {};
      for (const [key, value] of Object.entries(places.fields)) {
        if (appliedKeys.includes(key)) continue;
        if (venue_id && !REVIEWABLE_PLACES_FIELDS.has(key)) continue;
        result.fields[key] = { value, source: 'Google Places' };
      }
    }

    result.fields = applySocialLinks(result.fields, siteResearch);

    // Which suggestions the automated policy would refuse — shown as "Protected" in review.
    const protection = {};
    if (venue) {
      for (const [key, f] of Object.entries(result.fields || {})) {
        const src = f?.source === 'Google Places' ? SOURCES.GOOGLE_PLACES
          : /official website/i.test(f?.source || '') ? SOURCES.OFFICIAL_WEBSITE : SOURCES.GEMINI;
        const r = canAutomatedEnrichmentModify(venue, key, venue[key], fieldSource(venue, key), f?.value, src);
        if (r.action === 'protected') protection[key] = { reason: r.reason, existing_source: r.existing_source };
      }
    }

    const amenityCheck = sanitizeAmenities(result?.amenities);
    const mergedAmenities = mergeAmenityEvidence(amenityCheck.kept, placesAmenities);
    const currentAmenities = venue_id
      ? await base44.asServiceRole.entities.VenueAmenity.filter({ venue_id })
      : [];

    const photo = await photoPromise;
    return Response.json({
      photo: photo ? { success: !!photo.success, added: photo.added || 0, reason: photo.reason || '' } : null,
      venue_id: venue_id || null,
      claimed: isClaimed(venue),
      current: known,
      current_amenities: currentAmenities.map((a) => ({ slug: a.amenity_slug, source: a.source || '', provenance: a.provenance || '' })),
      suggestions: result,
      protection,
      places: {
        matched: places.matched,
        applied: placesApplied,
        protected_fields: placesProtected.map((p) => p.field),
        reason: places.reason || '',
        display_name: places.display_name || '',
        fields: places.fields || {},
        amenity_count: placesAmenities.length,
      },
      places_verified: places.matched && placesProtected.length === 0,
      website_research: publicDiagnostics(siteResearch),
      amenities: mergedAmenities,
      amenities_dropped: amenityCheck.dropped,
      proposed_amenities: sanitizeProposals(result?.proposed_amenities),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}