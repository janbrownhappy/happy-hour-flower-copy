// Phase 2.4.1 targeted regression: official-website social links only (no LLM, no other fields).
// For each venue: crawl the official site, evaluate every discovered social link through the
// production field gate, and auto-fill only what the gate allows into EMPTY fields.
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { researchOfficialWebsite, applySocialLinks, logWebsiteResearch } from '../../shared/scrapflyResearch.ts';
import { gateFieldFindings, socialLocationCheck, findQuoteInPages, isTestimonial } from '../../shared/evidenceGate.ts';
import { applyProtectedUpdates, recordDiscrepancies, SOURCES } from '../../shared/enrichmentProtection.ts';

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    const adminEmail = (Deno.env.get('ADMIN_EMAIL') || '').trim().toLowerCase();
    if (!(user && (user.role === 'admin' || (adminEmail && user.email?.trim().toLowerCase() === adminEmail)))) return Response.json({ error: 'Forbidden' }, { status: 403 });
    const { venue_ids = [], dry_run = false, testimonial_quotes = null, evidence_terms = null } = await req.json();
    // Read-only: return short official-website snippets around the given terms (e.g. "happy hour").
    if (evidence_terms) {
      const out = await Promise.all(venue_ids.slice(0, 6).map(async (id) => {
        const venue = await base44.asServiceRole.entities.Venue.get(id);
        const site = await researchOfficialWebsite(venue, null);
        const re = new RegExp(evidence_terms.join('|'), 'gi');
        const snippets = [];
        for (const p of site.evidence) {
          const t = p.text.replace(/\s+/g, ' ');
          for (const m of t.matchAll(re)) { if (snippets.length < 8) snippets.push({ url: p.url, text: t.slice(Math.max(0, m.index - 80), m.index + 280) }); }
        }
        return { venue_id: id, name: venue.name, status: site.diag.status, structure: site.diag.location_structure || null, pages: site.diag.pages.map((p) => p.url), social: site.diag.social_candidates || [], snippets };
      }));
      return Response.json({ results: out });
    }
    // Read-only check: classify given quotes against the venue's freshly retrieved pages.
    if (testimonial_quotes) {
      const venue = await base44.asServiceRole.entities.Venue.get(venue_ids[0]);
      const site = await researchOfficialWebsite(venue, null);
      return Response.json({ results: testimonial_quotes.map((q) => {
        const page = findQuoteInPages(q, site.evidence, '');
        return { quote: q, found_on: page?.url || null, testimonial: page ? isTestimonial(q, page) : null };
      }) });
    }
    const results = [];
    for (const id of venue_ids.slice(0, 2)) {
      const venue = await base44.asServiceRole.entities.Venue.get(id);
      const site = await researchOfficialWebsite(venue, null);
      await logWebsiteResearch(base44, venue, site, 'socialLinkRegression');
      const d = site.diag;
      const fields = applySocialLinks({}, site);
      const values = Object.fromEntries(Object.entries(fields).map(([k, f]) => [k, f.value]));
      const gate = gateFieldFindings(venue, values, fields, site);
      const plan = applyProtectedUpdates(venue, gate.allowed, SOURCES.OFFICIAL_WEBSITE);
      if (!dry_run && plan.applied.length) await base44.asServiceRole.entities.Venue.update(id, plan.updates);
      const review = gate.log.filter((e) => e.decision !== 'auto_saved' && !/REGRESSION_PROTECTION/.test(e.reason) || (/REGRESSION_PROTECTION/.test(e.reason) && e.value !== venue[e.field]));
      if (!dry_run) await recordDiscrepancies(base44, venue, review.map((e) => ({
        field: e.field, existing_value: venue[e.field] ?? null, proposed_value: e.value, proposed_source: SOURCES.OFFICIAL_WEBSITE,
        evidence: `Linked from ${d.social_context?.[e.field]?.page || d.official_website} (${e.page_context || 'n/a'})`,
        source_url: d.social_context?.[e.field]?.page || '', reason: `Review only — ${e.reason}`,
      })), 'socialLinkRegression');
      const rows = (d.social_candidates || []).map((c) => {
        const chosen = values[c.field] === c.url;
        const g = chosen ? gate.log.find((e) => e.field === c.field) : null;
        const existing = venue[c.field] || '';
        const check = socialLocationCheck(venue, c.field, c.url, c);
        let action, reason;
        if (g) {
          action = g.decision === 'auto_saved' && plan.applied.includes(c.field) ? 'AUTO_FILL_EMPTY'
            : /REGRESSION_PROTECTION/.test(g.reason) ? 'RETAIN_EXISTING' : 'REVIEW';
          reason = g.reason;
        } else { action = existing ? 'RETAIN_EXISTING' : 'BLOCK'; reason = 'not the selected candidate for this field'; }
        return { platform: c.field, existing, url: c.url, page: c.page, context: c.context, account: g?.account_class || check.account, action, reason };
      });
      results.push({ venue_id: id, venue_name: venue.name, website_status: d.status, location_structure: d.location_structure || null, applied: plan.applied, rows });
    }
    return Response.json({ results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}