import { base44 } from '@/api/base44Client';

// Runs the standard venue enrichment routine on a just-created venue and saves
// its findings: fills fields still empty on the venue, plus cited amenities.
export default async function enrichNewVenue(venue) {
  const { data } = await base44.functions.invoke('enrichVenueProfile', { venue_id: venue.id });
  if (data?.error) throw new Error(data.error);

  const updates = {};
  for (const [key, f] of Object.entries(data.suggestions?.fields || {})) {
    const value = f?.value;
    const empty = venue[key] == null || venue[key] === '' || (Array.isArray(venue[key]) && !venue[key].length);
    if (empty && value != null && value !== '' && value !== 'null' && !data.protection?.[key]) updates[key] = value;
  }

  const amenities = data.amenities || [];
  if (Object.keys(updates).length || amenities.length) {
    await base44.functions.invoke('enrichVenueProfile', {
      action: 'save', venue_id: venue.id, updates, amenities, places_verified: data.places_verified,
    });
  }
  return { fieldsFilled: Object.keys(updates).length, amenities: amenities.length };
}