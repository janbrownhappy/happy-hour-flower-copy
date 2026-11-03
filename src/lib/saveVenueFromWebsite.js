import { base44 } from '@/api/base44Client';
import enrichNewVenue from '@/lib/enrichNewVenue';

const isEmpty = (x) => x == null || x === '' || x === 'null' || (Array.isArray(x) && !x.length);

// Saves a researched website draft: fills only missing fields on a matched venue
// (never duplicates), or creates a new draft venue; then runs enrichment and publishes
// only when asked and only after enrichment succeeds.
export default async function saveVenueFromWebsite(draft, duplicates, status) {
  const clean = Object.fromEntries(Object.entries(draft).filter(([, v]) => !isEmpty(v)));
  const dupId = duplicates?.[0]?.id;
  let v;
  if (dupId) {
    const existing = await base44.entities.Venue.get(dupId);
    const missing = Object.fromEntries(Object.entries(clean).filter(([k]) => isEmpty(existing[k])));
    if (Object.keys(missing).length) await base44.entities.Venue.update(dupId, missing);
    v = { ...existing, ...missing, id: dupId, updatedExisting: true };
  } else {
    v = await base44.entities.Venue.create({ ...clean, status: 'draft', source_url: draft.source_url || draft.website, scrape_status: 'needs_review' });
  }

  const enrich = await enrichNewVenue(v).catch(e => ({ error: e?.response?.data?.error || e.message }));
  if (enrich.error) return { ...v, enrich: null, enrichError: enrich.error };

  const finalStatus = v.updatedExisting && v.status !== 'draft' ? v.status : status;
  if (finalStatus === 'active' && v.status !== 'active') await base44.entities.Venue.update(v.id, { status: 'active' });
  // Add brand-new published venues to the Instagram review queue (account owner only).
  if (finalStatus === 'active' && !v.updatedExisting) {
    base44.functions.invoke('postVenueToInstagram', { venue_id: v.id }).catch(() => {});
  }
  return { ...v, status: finalStatus, enrich };
}