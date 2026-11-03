import { VENUE_RESEARCH_SYSTEM_INSTRUCTION } from './venueResearchSkill.ts';
import { isFacebookUrl, facebookPagePath, facebookUrlHasName, fetchFacebookPublicInfo } from './facebookVenue.ts';

const SCHEMA = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    description: { type: 'string' },
    category: { type: 'string', description: 'e.g. Bar, Restaurant, Brewery, Winery, Food Truck' },
    address: { type: 'string', description: 'Street address only' },
    city: { type: 'string' },
    state_code: { type: 'string', description: 'Two-letter state code' },
    zip_code: { type: 'string' },
    lat: { type: 'number' },
    lng: { type: 'number' },
    phone: { type: 'string' },
    price_level: { type: 'number', description: '1-4' },
    website: { type: 'string', description: "The venue's own official website (never a Facebook or directory link)" },
    facebook_url: { type: 'string' },
    instagram_url: { type: 'string' },
    tiktok_url: { type: 'string' },
    x_url: { type: 'string' },
    youtube_url: { type: 'string' },
    has_happy_hour: { type: 'boolean' },
    happy_hour_start: { type: 'string', description: 'e.g. 4:00 PM' },
    happy_hour_end: { type: 'string' },
    days: { type: 'array', items: { type: 'string' }, description: 'Happy hour days, e.g. Mon, Tue' },
    deals: { type: 'array', items: { type: 'string' }, description: 'Happy hour specials with prices' },
    amenities_raw: { type: 'array', items: { type: 'string' } },
    notes: { type: 'string', description: 'Anything uncertain the admin should verify' },
  },
};

const RULES = 'Only include values you found evidence for; leave anything unconfirmed empty and mention it in notes. Never invent prices or times.';
const filled = (v) => v != null && v !== '' && !(Array.isArray(v) && !v.length);

const llm = (base44, prompt) => base44.asServiceRole.integrations.Core.InvokeLLM({
  model: 'gemini_3_flash', add_context_from_internet: true, prompt: `${VENUE_RESEARCH_SYSTEM_INSTRUCTION}\n\n${prompt}`, response_json_schema: SCHEMA,
});

// Facebook page: read the public page, then research the venue on the public web
// (Google listing, official site, other profiles) to fill what Facebook didn't expose.
async function researchFacebook(base44, url) {
  const fb = await fetchFacebookPublicInfo(url);
  if (!fb.ok && !facebookUrlHasName(url)) {
    throw new Error("Facebook didn't share this page publicly and the link has no page name to search for. Paste the venue's website instead, or a Facebook link like facebook.com/venuename.");
  }
  const fbFields = fb.ok ? { name: fb.title } : {};
  const context = fb.ok
    ? `The public Facebook page is titled "${fb.title}"${fb.location ? `, located in ${fb.location}` : ''}${fb.description ? `, and its intro says: "${fb.description}"` : ''}. Research exactly this business and location — not a similarly named venue elsewhere.`
    : `The Facebook page could not be read (${fb.reason}). Identify the venue only from the name in the page link; if you can't confidently identify it, leave every field empty.`;
  const web = await llm(base44, `Research the venue whose Facebook page is ${url}. ${context}
Search the public web (Google Business listing, the venue's official website, Instagram, local listings) to find its full profile. Make sure the venue you describe is the one this Facebook page belongs to. Put the venue's own official website in "website" (never a Facebook link). ${RULES}`);

  const draft = { ...web, ...Object.fromEntries(Object.entries(fbFields).filter(([, v]) => filled(v))) };
  if (draft.website && isFacebookUrl(draft.website)) delete draft.website;
  draft.facebook_url = url;
  draft.source_url = url;
  const fromWeb = Object.keys(SCHEMA.properties).filter((k) => k !== 'notes' && k !== 'facebook_url' && filled(web[k]) && !filled(fbFields[k]));
  return {
    draft,
    import_meta: { source: 'facebook', facebook_read: fb.ok, facebook_reason: fb.ok ? '' : fb.reason, fields_from_web: fromWeb },
  };
}

// Researches a venue from its website (or Facebook page) URL; returns a draft plus possible existing matches.
export async function researchVenueUrl(base44, url) {
  const Venue = base44.asServiceRole.entities.Venue;
  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  if (isFacebookUrl(url)) {
    const { draft, import_meta } = await researchFacebook(base44, url);
    if (!draft.name) throw new Error("Couldn't identify the venue from this Facebook page. Try pasting its website instead.");
    const or = [{ facebook_url: { $regex: esc(facebookPagePath(url)), $options: 'i' } }];
    if (draft.website) {
      try { or.push({ website: { $regex: esc(new URL(draft.website).hostname.replace(/^www\./, '')), $options: 'i' } }); } catch { delete draft.website; }
    }
    const existing = await Venue.filter({ $or: or }, '-created_date', 3);
    return { draft, import_meta, duplicates: existing.map((v) => ({ id: v.id, name: v.name, city: v.city })) };
  }

  const draft = await llm(base44, `Research the venue whose official website is ${url}. Read that site (home, menu, happy hour, contact pages) and its Google listing / social profiles. Return the venue's profile. ${RULES}`);
  const host = new URL(url).hostname.replace(/^www\./, '');
  const existing = await Venue.filter({ website: { $regex: esc(host), $options: 'i' } }, '-created_date', 3);
  return {
    draft: { ...draft, website: url },
    import_meta: { source: 'website' },
    duplicates: existing.map((v) => ({ id: v.id, name: v.name, city: v.city })),
  };
}