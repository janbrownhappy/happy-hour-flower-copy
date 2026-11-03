// Shared amenity research + persistence logic used by both the per-venue
// enrichment function and the bulk re-enrich sweep.

import {
  VALID_AMENITY_SLUGS,
  AMENITY_CATEGORY_IDS,
  renderAmenityCatalogForPrompt,
  slugifyAmenityLabel,
} from './amenityCatalog.ts';
import { VENUE_RESEARCH_SYSTEM_INSTRUCTION } from './venueResearchSkill.ts';
import { SOURCES, planAmenityWrites, recordDiscrepancies } from './enrichmentProtection.ts';
import { gateAmenityFindings } from './evidenceGate.ts';

// The research skill with the live amenity catalog injected.
export function researchInstruction() {
  return VENUE_RESEARCH_SYSTEM_INSTRUCTION.replace(
    '{{AMENITY_CATALOG}}',
    renderAmenityCatalogForPrompt()
  );
}

// JSON schema fragment for the two amenity lists.
export const AMENITY_SCHEMA_FIELDS = {
  amenities: {
    type: 'array',
    description:
      'Amenities confirmed from a cited source, using exact slugs from the catalog. Omit anything you cannot source.',
    items: {
      type: 'object',
      properties: {
        slug: { type: 'string' },
        source: { type: 'string', description: 'Where this amenity was confirmed. Required.' },
        source_type: { type: 'string', description: "'official_website' when the evidence came from the provided official website pages; otherwise 'web_research'." },
        source_url: { type: 'string', description: 'Exact page URL of the evidence, when known.' },
        evidence: { type: 'string', description: 'EXACT text copied character-for-character from the page (max 200 chars). Never a URL, site name, page title or your own summary.' },
        page_title: { type: 'string', description: 'Title of the page the quote came from, when known.' },
        location_applicability: { type: 'string', description: "'this_location' when the page is specific to THIS venue's location, 'all_locations' when the source explicitly says it applies to every location, 'other_location' when it is about a different location, otherwise 'unclear'." },
        confidence: { type: 'number', description: '0-1 strength of the evidence.' },
      },
    },
  },
  proposed_amenities: {
    type: 'array',
    description:
      'Source-confirmed distinctive features that no catalog slug covers. Empty when there are none.',
    items: {
      type: 'object',
      properties: {
        label: { type: 'string' },
        suggested_category: { type: 'string' },
        source: { type: 'string', description: 'Where this was confirmed. Required.' },
      },
    },
  },
  contradicted_amenities: {
    type: 'array',
    description:
      'Catalog amenities that a CURRENT, credible source explicitly says the venue no longer offers (e.g. "no dogs allowed" sign or policy). Only with a cited source; empty when none.',
    items: {
      type: 'object',
      properties: {
        slug: { type: 'string' },
        source: { type: 'string', description: 'The evidence that the amenity is not offered. Required.' },
      },
    },
  },
};

// Keep only amenities that use a real catalog slug AND carry a source string.
// Anything unsourced or off-catalog is dropped — that is the no-hallucination gate.
// opts.minConfidence: drop findings whose stated confidence is below this (automated sweeps).
// opts.reviewFloor: findings with confidence in [reviewFloor, minConfidence) are returned in
// `review` (suggestion only, never auto-saved). Findings with no stated confidence are treated
// as below the auto-save bar when minConfidence is set.
export const AUTO_SAVE_MIN_CONFIDENCE = 0.8;
export const REVIEW_MIN_CONFIDENCE = 0.6;
export function sanitizeAmenities(raw, opts = {}) {
  const minConfidence = opts.minConfidence || 0;
  const reviewFloor = opts.reviewFloor ?? minConfidence;
  const seen = new Set();
  const kept = [];
  const dropped = [];
  const review = [];
  for (const item of Array.isArray(raw) ? raw : []) {
    const slug = String(item?.slug || '').trim();
    const source = String(item?.source || '').trim();
    if (!slug) continue;
    if (!VALID_AMENITY_SLUGS.has(slug)) {
      dropped.push({ slug, reason: 'not in catalog' });
      continue;
    }
    if (!source) {
      dropped.push({ slug, reason: 'no source cited' });
      continue;
    }
    const confidence = typeof item?.confidence === 'number' ? Math.max(0, Math.min(1, item.confidence)) : null;
    if (seen.has(slug)) continue;
    seen.add(slug);
    const official = item?.source_type === 'official_website';
    const evidence = String(item?.evidence || '').trim().slice(0, 200);
    const sourceUrl = String(item?.source_url || '').trim();
    // Automated sweeps: confidence alone is not enough — an auto-save needs a quote and a URL.
    if (minConfidence && (!evidence || !/^https?:\/\//i.test(sourceUrl))) {
      dropped.push({ slug, confidence, reason: 'no evidence quote or source URL' });
      continue;
    }
    const effective = confidence ?? (minConfidence ? 0 : null);
    if (effective != null && effective < minConfidence) {
      if (confidence != null && confidence >= reviewFloor) {
        review.push({ slug, confidence, source_url: String(item?.source_url || '').trim(), evidence, source });
      } else {
        dropped.push({ slug, confidence, reason: 'low confidence' });
      }
      continue;
    }
    kept.push({
      slug,
      source: official ? `Official Website${evidence ? `: "${evidence}"` : ''}` : source,
      source_label: official ? 'Official Website' : source,
      source_url: String(item?.source_url || '').trim(),
      evidence,
      confidence,
      location_applicability: String(item?.location_applicability || '').trim(),
      provenance: official ? SOURCES.OFFICIAL_WEBSITE : SOURCES.GEMINI,
    });
  }
  return { kept, dropped, review };
}

// 0.60–0.79 findings from automated sweeps become review items (never amenity rows).
export async function recordReviewAmenities(base44, venue, review, origin) {
  if (!review.length) return 0;
  return await recordDiscrepancies(base44, venue, review.map((r) => ({
    field: `amenity:${r.slug}`,
    existing_value: 'absent',
    proposed_value: 'present',
    proposed_source: r.source_url && /official/i.test(r.source) ? SOURCES.OFFICIAL_WEBSITE : SOURCES.GEMINI,
    evidence: `${r.evidence || r.source} (confidence ${r.confidence.toFixed(2)})`,
    source_url: r.source_url,
    reason: 'Review only — confidence 0.60–0.79 is below the 0.80 auto-save threshold',
  })), origin);
}

// Phase 2.3: automated sweeps run every finding through the evidence gate. Only Class B
// (official website) findings with a traceable quote, confirmed location, matching meaning,
// no conflict and confidence >= 0.80 auto-save. Everything else >= 0.60 becomes a review item.
export async function gatedAmenities(base44, venue, raw, siteResearch, origin, identity = null) {
  const all = sanitizeAmenities(raw);
  const existing = await base44.asServiceRole.entities.VenueAmenity.filter({ venue_id: venue.id });
  const gate = gateAmenityFindings(venue, all.kept, siteResearch, new Set(existing.map((r) => r.amenity_slug)));
  if (identity?.status === 'IDENTITY_NEEDS_REVIEW') {
    for (const e of gate.log) if (e.decision === 'auto_saved') { e.decision = 'review'; e.reason = 'IDENTITY_NEEDS_REVIEW'; gate.review.push(e); }
    gate.autoSave = [];
  }
  const kept = gate.autoSave.map((a) => ({
    ...a,
    source: `Official Website: "${a.evidence}"`,
    source_label: 'Official Website',
    provenance: SOURCES.OFFICIAL_WEBSITE,
  }));
  const reviewQueued = await recordDiscrepancies(base44, venue, gate.review.map((r) => ({
    field: `amenity:${r.slug}`,
    existing_value: 'absent',
    proposed_value: 'present',
    proposed_source: r.source_class === 'B' ? SOURCES.OFFICIAL_WEBSITE : SOURCES.GEMINI,
    evidence: `${r.evidence || '(no quote)'} (confidence ${Number(r.confidence).toFixed(2)})`,
    source_url: r.source_url,
    reason: `Review only — ${r.reason}${r.location_why ? ` [${r.location_why}]` : ''}`,
  })), origin);
  return { kept, review: gate.review, log: gate.log, dropped: all.dropped, reviewQueued };
}

// One entry per slug across sources (Google + official website + web research): evidence is
// combined instead of creating duplicate amenities. Official website wins provenance.
const PROVENANCE_RANK = { [SOURCES.OFFICIAL_WEBSITE]: 3, [SOURCES.GOOGLE_PLACES]: 2, [SOURCES.GEMINI]: 1 };
export function mergeAmenityEvidence(...lists) {
  const bySlug = new Map();
  for (const a of lists.flat()) {
    const prior = bySlug.get(a.slug);
    if (!prior) { bySlug.set(a.slug, { ...a }); continue; }
    if (!prior.source.includes(a.source)) prior.source = `${prior.source} | ${a.source}`;
    if ((PROVENANCE_RANK[a.provenance] || 0) > (PROVENANCE_RANK[prior.provenance] || 0)) {
      prior.provenance = a.provenance;
      prior.source_label = a.source_label || prior.source_label;
    }
    prior.source_url = prior.source_url || a.source_url || '';
    prior.evidence = prior.evidence || a.evidence || '';
    if (typeof a.confidence === 'number') prior.confidence = Math.max(prior.confidence ?? 0, a.confidence);
  }
  return [...bySlug.values()];
}

export function sanitizeProposals(raw) {
  const seen = new Set();
  const kept = [];
  for (const item of Array.isArray(raw) ? raw : []) {
    const label = String(item?.label || '').trim();
    const source = String(item?.source || '').trim();
    if (!label || !source) continue;
    const suggested_slug = slugifyAmenityLabel(label);
    if (!suggested_slug) continue;
    // A "proposal" that duplicates an existing slug is not new — skip it.
    if (VALID_AMENITY_SLUGS.has(suggested_slug)) continue;
    if (seen.has(suggested_slug)) continue;
    seen.add(suggested_slug);
    const cat = String(item?.suggested_category || '').trim();
    kept.push({
      label,
      source,
      suggested_slug,
      suggested_category: AMENITY_CATEGORY_IDS.includes(cat) ? cat : '',
    });
  }
  return kept;
}

// Catalog amenities a current source says the venue no longer offers.
export function sanitizeContradicted(raw) {
  const seen = new Set();
  const kept = [];
  for (const item of Array.isArray(raw) ? raw : []) {
    const slug = String(item?.slug || '').trim();
    const source = String(item?.source || '').trim();
    if (!slug || !source || !VALID_AMENITY_SLUGS.has(slug) || seen.has(slug)) continue;
    seen.add(slug);
    kept.push({ slug, source });
  }
  return kept;
}

// Write a venue's amenity rows through the protection policy, and queue any new proposals.
// Owner/admin rows are never removed; claimed venues get discrepancies instead of writes.
// opts.provenance: source of this write (default gemini_web_research; 'hhf_admin' for an
// admin-approved save). opts.contradicted: [{slug, source}] negative findings.
export async function persistAmenities(base44, venue, amenities, proposals, opts = {}) {
  const venueId = venue.id;
  const provenance = opts.provenance || SOURCES.GEMINI;
  const existing = await base44.asServiceRole.entities.VenueAmenity.filter({ venue_id: venueId });
  // Automated contradictions never delete rows on their own — they become review items.
  const manual = provenance === SOURCES.HHF_ADMIN || provenance === SOURCES.VENUE_OWNER;
  const contradicted = opts.contradicted || [];
  const plan = planAmenityWrites(venue, existing, amenities, provenance, manual ? contradicted : []);
  if (!manual) {
    const present = new Set(existing.map((r) => r.amenity_slug));
    plan.discrepancies.push(...contradicted.filter((c) => present.has(c.slug)).map((c) => ({
      field: `amenity:${c.slug}`, existing_value: 'present', proposed_value: 'absent', proposed_source: provenance,
      evidence: c.source, reason: 'Review only — automated removal requires admin confirmation',
    })));
  }

  for (const row of plan.toDelete) {
    await base44.asServiceRole.entities.VenueAmenity.delete(row.id);
  }

  const verifiedAt = new Date().toISOString();
  let created = 0;
  if (plan.toCreate.length) {
    await base44.asServiceRole.entities.VenueAmenity.bulkCreate(
      plan.toCreate.map((a) => ({
        venue_id: venueId,
        amenity_slug: a.slug,
        source: String(a.source || '').slice(0, 1000),
        source_url: a.source_url || '',
        ...(typeof a.confidence === 'number' ? { confidence: a.confidence } : {}),
        provenance: a.provenance,
        verified_at: verifiedAt,
      }))
    );
    created = plan.toCreate.length;
  }
  const discrepancies = await recordDiscrepancies(base44, venue, plan.discrepancies, opts.origin || 'persistAmenities');

  let queued = 0;
  if (proposals.length) {
    // Don't re-queue a label already pending or already ruled on for this venue.
    const priors = await base44.asServiceRole.entities.AmenityProposal.filter({ venue_id: venueId });
    const priorSlugs = new Set(priors.map((p) => p.suggested_slug));
    const fresh = proposals.filter((p) => !priorSlugs.has(p.suggested_slug));
    if (fresh.length) {
      await base44.asServiceRole.entities.AmenityProposal.bulkCreate(
        fresh.map((p) => ({
          venue_id: venueId,
          venue_name: venue.name || '',
          label: p.label,
          suggested_slug: p.suggested_slug,
          suggested_category: p.suggested_category,
          source: p.source,
          status: 'pending',
        }))
      );
      queued = fresh.length;
    }
  }

  return { replaced: plan.toDelete.length, created, queued, kept_protected: plan.keptProtected, discrepancies };
}