// Centralized write-protection policy for ALL automated venue enrichment.
//
// Precedence: VENUE OWNER > HHF ADMIN > VERIFIED EXTERNAL SOURCE > AUTOMATED RESEARCH.
// Every automated Venue / VenueAmenity / photo write goes through this module, so a new
// source (e.g. scrapfly_official_website) inherits the rules just by passing its source id.
//
// Rules:
// - A value whose provenance is venue_owner or hhf_admin is never changed or cleared by an
//   automated source.
// - A CLAIMED venue (owner_id set, or verification_status verified / pending_approval) gets
//   no automated writes at all — every differing finding, including for empty fields, is
//   preserved as an EnrichmentDiscrepancy (suggestion) for review.
// - Manual writes (source venue_owner / hhf_admin) are always allowed — protection limits
//   automation, never legitimate owner/admin edits.

export const SOURCES = {
  VENUE_OWNER: 'venue_owner',
  HHF_ADMIN: 'hhf_admin',
  OFFICIAL_WEBSITE: 'scrapfly_official_website',
  GOOGLE_PLACES: 'google_places',
  GEMINI: 'gemini_web_research',
  AUTOMATED: 'automated_enrichment',
  OTHER: 'other_external_source',
};

export const PROTECTED_SOURCES = new Set([SOURCES.VENUE_OWNER, SOURCES.HHF_ADMIN]);

export function isClaimed(venue) {
  return !!(venue?.owner_id || ['verified', 'pending_approval'].includes(venue?.verification_status));
}

export function fieldSource(venue, field) {
  return venue?.field_provenance?.[field] || '';
}

const isBlank = (v) => v == null || v === '' || (Array.isArray(v) && v.length === 0);

function normalize(field, v) {
  if (Array.isArray(v)) return JSON.stringify(v.map((x) => normalize(field, x)));
  if (typeof v === 'number') return String(v);
  const s = String(v ?? '').trim().toLowerCase();
  if (field === 'phone') return s.replace(/\D/g, '').slice(-10);
  if (/url$|^website$/.test(field)) return s.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/+$/, '');
  return s;
}

export function sameValue(field, a, b) {
  if (isBlank(a) && isBlank(b)) return true;
  if (isBlank(a) || isBlank(b)) return false;
  if (typeof a === 'number' && typeof b === 'number') return Math.abs(a - b) < 1e-6;
  return normalize(field, a) === normalize(field, b);
}

const CONTACT_GUARD = new Set(['phone', 'website']);

// The single policy decision. Returns a structured result either way.
export function canAutomatedEnrichmentModify(venue, field, existingValue, existingSource, proposedValue, proposedSource) {
  const base = {
    venue_id: venue?.id || '',
    venue_name: venue?.name || '',
    field,
    existing_value: existingValue ?? null,
    existing_source: existingSource || '',
    proposed_value: proposedValue ?? null,
    proposed_source: proposedSource,
    at: new Date().toISOString(),
  };
  if (sameValue(field, existingValue, proposedValue)) {
    return { ...base, allowed: false, action: 'unchanged', reason: 'Matches current value' };
  }
  if (PROTECTED_SOURCES.has(proposedSource)) {
    return { ...base, allowed: true, action: 'write', reason: 'Manual owner/admin write' };
  }
  // Phase 2.3.1 contact rule: automation may only FILL an empty phone/website. No match /
  // failed research never clears one (unverified ≠ wrong), and a differing value is a
  // conflict for review, never an automated replacement.
  if (CONTACT_GUARD.has(field) && !isBlank(existingValue)) {
    if (isBlank(proposedValue)) return { ...base, allowed: false, action: 'retained', reason: 'UNVERIFIED — existing value retained (no match is not evidence it is wrong)' };
    return { ...base, allowed: false, action: 'protected', reason: 'CONFLICT_REVIEW_REQUIRED — existing value retained' };
  }
  if (PROTECTED_SOURCES.has(existingSource)) {
    return { ...base, allowed: false, action: 'protected', reason: `Value set by ${existingSource} — automated sources cannot change it` };
  }
  if (isClaimed(venue)) {
    return {
      ...base,
      allowed: false,
      action: 'protected',
      reason: isBlank(proposedValue)
        ? 'Claimed venue — automated sources cannot clear it'
        : 'Claimed venue — automated findings are suggestions only',
    };
  }
  return { ...base, allowed: true, action: 'write', reason: 'Unclaimed venue, unprotected value' };
}

// Run a set of proposed field values through the policy.
// Returns the safe update patch (with field_provenance merged), the keys written, and the
// protected/skipped results (identical matches are not reported).
export function applyProtectedUpdates(venue, proposed, proposedSource) {
  const updates = {};
  const provenance = {};
  const applied = [];
  const blocked = [];
  for (const [field, value] of Object.entries(proposed || {})) {
    const r = canAutomatedEnrichmentModify(venue, field, venue?.[field], fieldSource(venue, field), value, proposedSource);
    if (r.allowed) {
      updates[field] = value;
      provenance[field] = proposedSource;
      applied.push(field);
    } else if (r.action === 'protected') {
      blocked.push(r);
    }
  }
  if (applied.length) updates.field_provenance = { ...(venue?.field_provenance || {}), ...provenance };
  return { updates, applied, protected: blocked };
}

// Merge provenance for a manual (owner/admin) write of the given keys.
export function stampProvenance(venue, keys, source) {
  const out = { ...(venue?.field_provenance || {}) };
  for (const k of keys) out[k] = source;
  return out;
}

const asText = (v) => (v == null ? '' : typeof v === 'string' ? v : JSON.stringify(v));

// Preserve blocked findings as reviewable discrepancies. Upserts one pending row per
// venue+field so re-runs refresh rather than pile up. Never throws — a discrepancy write
// failing must not fail the enrichment job.
export async function recordDiscrepancies(base44, venue, items, origin) {
  // Sources an admin rejected for this venue (e.g. a same-name business elsewhere) never re-enter review.
  const rejected = (venue?.field_provenance?.rejected_source_domains || []).map((d) => String(d).toLowerCase());
  const isRejected = (d) => rejected.some((dom) => `${d.source_url || ''} ${d.evidence || ''}`.toLowerCase().includes(dom));
  const list = (items || []).filter((d) => d && !isRejected(d));
  if (!venue?.id || !list.length) return 0;
  try {
    const db = base44.asServiceRole.entities.EnrichmentDiscrepancy;
    const pending = await db.filter({ venue_id: venue.id, status: 'pending' });
    const byField = new Map(pending.map((p) => [p.field, p]));
    const detected_at = new Date().toISOString();
    const toCreate = [];
    for (const d of list) {
      const row = {
        venue_id: venue.id,
        venue_name: venue.name || '',
        field: d.field,
        current_value: asText(d.existing_value),
        current_source: d.existing_source || '',
        proposed_value: asText(d.proposed_value),
        proposed_source: d.proposed_source || '',
        evidence: d.evidence || '',
        source_url: d.source_url || '',
        reason: d.reason || '',
        origin_function: origin || '',
        detected_at,
        status: 'pending',
      };
      const prior = byField.get(d.field);
      if (prior) await db.update(prior.id, row);
      else toCreate.push(row);
    }
    if (toCreate.length) await db.bulkCreate(toCreate);
    return list.length;
  } catch (err) {
    console.error('recordDiscrepancies failed:', err.message);
    return 0;
  }
}

// Amenity policy (pure). Given the venue's current rows and an automated finding set,
// decide what may be written. Owner/admin rows are never deleted or overwritten; claimed
// venues receive no automated amenity writes at all.
//   proposed:     [{ slug, source, provenance? }]  amenities the source asserts
//   contradicted: [{ slug, source }]               amenities a source says are gone
export function planAmenityWrites(venue, existingRows, proposed, proposedSource, contradicted = []) {
  const rows = existingRows || [];
  const bySlug = new Map(rows.map((r) => [r.amenity_slug, r]));
  const manualWrite = PROTECTED_SOURCES.has(proposedSource);
  const claimed = isClaimed(venue) && !manualWrite;
  const isProtectedRow = (r) => PROTECTED_SOURCES.has(r?.provenance);
  const discrepancies = [];
  const disc = (slug, existing, proposedVal, src, evidence, reason) => discrepancies.push({
    venue_id: venue?.id, field: `amenity:${slug}`, existing_value: existing,
    existing_source: bySlug.get(slug)?.provenance || '', proposed_value: proposedVal,
    proposed_source: src, evidence, reason, at: new Date().toISOString(),
  });

  // Contradictions against amenities currently on the record.
  for (const c of contradicted || []) {
    const row = bySlug.get(c.slug);
    if (!row) continue;
    if (claimed || isProtectedRow(row)) {
      disc(c.slug, 'present', 'absent', proposedSource, c.source,
        isProtectedRow(row) ? `Amenity set by ${row.provenance} — not removed` : 'Claimed venue — suggestion only');
    }
  }

  if (claimed) {
    for (const a of proposed || []) {
      if (!bySlug.has(a.slug)) {
        disc(a.slug, 'absent', 'present', a.provenance || proposedSource, a.source, 'Claimed venue — suggestion only');
      }
    }
    return { toDelete: [], toCreate: [], keptProtected: rows.length, discrepancies };
  }

  // Unclaimed (or a manual admin write): keep protected rows, rewrite the rest.
  const keep = rows.filter(isProtectedRow);
  const keepSlugs = new Set(keep.map((r) => r.amenity_slug));
  // Manual admin saves replace the set. Automated runs never remove an amenity just because
  // it wasn't re-found (absence is not evidence): only re-found rows (refreshed with new
  // evidence) or explicitly contradicted rows are replaced/removed.
  const contradictedSlugs = new Set((contradicted || []).map((c) => c.slug));
  const refound = new Set((proposed || []).map((a) => a.slug));
  const toDelete = rows.filter((r) => !isProtectedRow(r)
    && (manualWrite || refound.has(r.amenity_slug) || contradictedSlugs.has(r.amenity_slug)));
  const seen = new Set();
  const toCreate = [];
  for (const a of proposed || []) {
    if (keepSlugs.has(a.slug) || seen.has(a.slug)) continue;
    seen.add(a.slug);
    toCreate.push({ ...a, provenance: manualWrite ? proposedSource : (a.provenance || proposedSource) });
  }
  return { toDelete, toCreate, keptProtected: keep.length, discrepancies };
}

// Photos: photo_provenance is parallel to photo_urls.
export function photoPairs(venue) {
  const prov = venue?.photo_provenance || [];
  return (venue?.photo_urls || []).map((url, i) => ({ url, source: prov[i] || '' }));
}