import { base44 } from '@/api/base44Client';

// Stable per-offer key within a venue.
export function offerKey(day, offerText) {
  return `${day}::${(offerText || '').trim()}`;
}

// Fire-and-forget: record an offer view or redeem-click.
// `type` is 'view' or 'redeem'. Upserts a single OfferStat row per offer and
// increments the matching counter. Errors are swallowed — tracking is non-critical.
export async function trackOffer({ venue, day, offerText, type }) {
  try {
    if (!venue?.id || !day || !offerText?.trim()) return;
    await base44.functions.invoke('trackOfferStat', { venue_id: String(venue.id), day, offer_text: offerText.trim(), type });
  } catch (_) {
    // non-critical
  }
}