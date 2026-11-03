import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { consumeDailyQuota } from '../../shared/dailyLimit.ts';
import { AMENITY_CATALOG, VALID_AMENITY_SLUGS } from '../../shared/amenityCatalog.ts';

// Turns a spoken voice-search phrase into structured Explore filters.
// The prompt and allowed values live here; the caller only sends what the user said.
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const NEIGHBORHOODS = [
  'GVL-01 Downtown / Main Street', 'GVL-02 West End', 'GVL-03 Village of West Greenville',
  'GVL-04 Augusta Road Corridor', 'GVL-05 Haynie-Sirrine / Fluor Field', 'GVL-06 Hampton Station / Sans Souci',
  'MAU-01 BridgeWay Station', 'MAU-02 Mauldin Main / E. Butler Rd', 'SIM-01 Downtown Simpsonville',
  'SIM-02 Five Forks', 'SIM-03 Fairview Road', 'FTN-01 Downtown Fountain Inn',
];
const MAX_TEXT = 300;

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { text, today: clientToday } = await req.json().catch(() => ({}));
    const phrase = String(text || '').trim().slice(0, MAX_TEXT);
    if (!phrase) return Response.json({ error: 'text is required' }, { status: 400 });
    if (!(await consumeDailyQuota(base44.asServiceRole, 'voice', user.id, 50))) {
      return Response.json({ error: 'Daily voice search limit reached. Try typing your search instead.' }, { status: 429 });
    }
    const today = DAYS.includes(clientToday) ? clientToday : DAYS[(new Date().getDay() + 6) % 7];
    const amenityRef = AMENITY_CATALOG.flatMap((c) => c.amenities.map(([slug, label]) => `${slug} — ${label}`)).join('; ');

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `You are a search parser for a happy hour discovery app in Greenville, SC. A user said: "${phrase.replace(/"/g, "'")}".
Extract structured search filters. Today is ${today}.
- "day": one of ${DAYS.join(', ')} if a day is mentioned (map "today" to ${today}, "tonight" to ${today}, "tomorrow" to the next day). Empty string if none.
- "neighborhood": the closest match from this list if mentioned, otherwise empty string: ${NEIGHBORHOODS.join('; ')}.
- "near_me": true ONLY if the user asks for something close to them — "near me", "nearby", "close by", "around here", "walking distance". Otherwise false.
- "price": 1-4 if budget mentioned (cheap/budget=1, moderate=2, upscale=3, fine dining=4), otherwise 0.
- "amenities": an ARRAY of matching amenity slugs from the list below. When a user names features, especially several joined by "and", map EACH one to its own slug so they become separate filters. Match generously: "outdoor seating"/"patio" → outdoor_patio, "pet friendly"/"dogs" → dog_friendly, "live music" → live_music, etc. Only include slugs that exist in this list; return [] if none apply. Amenity list (slug — label): ${amenityRef}.
- "search": any LEFTOVER descriptive keywords that did NOT map to an amenity slug above — e.g. a specific venue name or a category word. Do NOT repeat words already captured as amenities. Empty string if none.`,
      response_json_schema: {
        type: 'object',
        properties: {
          day: { type: 'string' },
          neighborhood: { type: 'string' },
          near_me: { type: 'boolean' },
          price: { type: 'number' },
          amenities: { type: 'array', items: { type: 'string' } },
          search: { type: 'string' },
        },
      },
    });

    // Only return values the app understands.
    return Response.json({
      day: DAYS.includes(result?.day) ? result.day : '',
      neighborhood: NEIGHBORHOODS.includes(result?.neighborhood) ? result.neighborhood : '',
      near_me: result?.near_me === true,
      price: [1, 2, 3, 4].includes(Number(result?.price)) ? Number(result.price) : 0,
      amenities: (Array.isArray(result?.amenities) ? result.amenities : []).filter((s) => VALID_AMENITY_SLUGS.has(s)),
      search: String(result?.search || '').slice(0, 100),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}