// Client-side provenance stamping for MANUAL owner/admin saves.
// Enforcement of the protection policy lives server-side; this only records who set what.

export const PROVENANCE_FIELDS = [
  'name', 'address', 'city', 'zip_code', 'phone', 'website', 'category', 'description',
  'happy_hour_start', 'happy_hour_end', 'days', 'deals',
  'facebook_url', 'instagram_url', 'tiktok_url', 'threads_url', 'youtube_url', 'x_url',
  'lat', 'lng', 'price_level',
];

const norm = (v) => JSON.stringify(v ?? null) === '""' ? 'null' : JSON.stringify(v ?? null);

// Stamp `source` on every provenance field whose value changed.
export function stampFieldProvenance(venue, next, source) {
  const out = { ...(venue?.field_provenance || {}) };
  for (const k of PROVENANCE_FIELDS) {
    if (!(k in next)) continue;
    if (norm(next[k]) !== norm(venue?.[k])) out[k] = source;
  }
  return out;
}

// photo_provenance parallel to the new photo_urls: existing photos keep their marker,
// newly added photos get `source`.
export function buildPhotoProvenance(venue, urls, source) {
  const prov = venue?.photo_provenance || [];
  const known = new Map((venue?.photo_urls || []).map((u, i) => [u, prov[i] || '']));
  return (urls || []).map((u) => (known.has(u) ? known.get(u) : source));
}