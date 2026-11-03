import { venueOutcome } from '@/components/admin/enrichment/RunLogVenueList';

// Default unit rates (USD) — assumptions, editable in the dashboard.
export const DEFAULT_RATES = { places: 0.049, scrapfly: 0.002, ai: 0.01 };

// Usage is taken from what each batch recorded per venue.
export function summarize(batches, rates) {
  const s = { runs: batches.length, venues: 0, updated: 0, failed: 0, skipped: 0, noChange: 0, places: 0, scrapfly: 0, ai: 0 };
  for (const b of batches) {
    const results = b.results || [];
    const seen = new Set(results.map(r => r.venue_id));
    const missing = (b.failed_venue_ids || []).filter(id => !seen.has(id)).length;
    s.failed += missing;
    s.venues += missing;
    for (const r of results) {
      s.venues++;
      const o = venueOutcome(b, r);
      if (o === 'updated') s.updated++; else if (o === 'failed') s.failed++; else if (o === 'skipped') s.skipped++; else s.noChange++;
      if (o !== 'skipped') { s.places++; s.ai++; }
      s.scrapfly += Number(r.web?.q) || 0;
    }
  }
  s.cost = { places: s.places * rates.places, scrapfly: s.scrapfly * rates.scrapfly, ai: s.ai * rates.ai };
  s.cost.total = s.cost.places + s.cost.scrapfly + s.cost.ai;
  return s;
}