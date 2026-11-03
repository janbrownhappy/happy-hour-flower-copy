import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';
import { secrets } from 'base44:runtime';
import { assertAdmin, withBrandMention } from '../../shared/blogGeneration.ts';

const EVENTS_SCHEMA = {
  type: 'object',
  properties: {
    start_date: { type: 'string', description: 'YYYY-MM-DD of the first day covered' },
    end_date: { type: 'string', description: 'YYYY-MM-DD of the last day covered' },
    events: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          date: { type: 'string', description: 'YYYY-MM-DD' },
          title: { type: 'string' },
          venue_name: { type: 'string' },
          is_special: { type: 'boolean', description: 'true for one-time / special events (bold in the source)' },
        },
        required: ['date', 'title'],
      },
    },
  },
  required: ['events'],
};

const esc = (s) =>
  String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const norm = (s) =>
  String(s || '')
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9 ]/g, '')
    .replace(/^the /, '')
    .replace(/\s+/g, ' ')
    .trim();

const fmtDay = (iso) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC',
  });
const fmtShort = (iso) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-US', { month: 'long', day: 'numeric', timeZone: 'UTC' });

async function loadVenues(base44) {
  const all = [];
  for (let skip = 0; skip < 10000; skip += 500) {
    const page = await base44.asServiceRole.entities.Venue.list('name', 500, skip);
    all.push(...page);
    if (page.length < 500) break;
  }
  return all.filter((v) => v.status === 'active' && v.name);
}

function matchVenue(name, venues) {
  const n = norm(name);
  if (!n) return null;
  const exact = venues.find((v) => v._n === n);
  if (exact) return exact;
  if (n.length < 5) return null;
  // Whole-word prefix only, so "Sassafras" never matches "Sassafrass Flower Farm".
  return venues.find((v) => v._n.length >= 5 && (v._n.startsWith(`${n} `) || n.startsWith(`${v._n} `))) || null;
}

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const gate = await assertAdmin(base44, secrets.get('ADMIN_EMAIL'));
    if (!gate.ok) return gate.response;

    const body = await req.json().catch(() => ({}));
    const raw = String(body.raw_text || '').trim();
    if (!raw) return Response.json({ error: 'Paste the event list first' }, { status: 400 });
    const author = String(body.author || '').trim() || 'Jan Brown';

    const today = new Date().toISOString().slice(0, 10);
    const parsed = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `Today is ${today}. Extract every event from the weekly food & drink event list below.
- Keep event titles and venue names exactly as written. Do not invent, merge, or drop events.
- Convert day headings (e.g. "Tue 9/22") into full YYYY-MM-DD dates, using the nearest matching year.
- is_special = true for events marked bold (**like this**) or described as one-time/special.
- If no venue is listed, leave venue_name empty.
- start_date / end_date = the first and last dates covered.

EVENT LIST:
${raw}`,
      response_json_schema: EVENTS_SCHEMA,
    });

    // Dedupe (source lists some events twice)
    const seen = new Set();
    const events = (parsed.events || []).filter((e) => {
      if (!e.date || !e.title) return false;
      const k = `${e.date}|${norm(e.title)}|${norm(e.venue_name)}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
    if (!events.length) return Response.json({ error: 'No events could be read from that text' }, { status: 400 });

    const venues = (await loadVenues(base44)).map((v) => ({ ...v, _n: norm(v.name) }));
    const matched = new Map();
    const unmatched = new Set();
    events.forEach((e) => {
      if (!e.venue_name) return;
      const v = matchVenue(e.venue_name, venues);
      if (v) { e.venue = v; matched.set(v.id, v.name); } else unmatched.add(e.venue_name);
    });

    const dates = [...new Set(events.map((e) => e.date))].sort();
    const start = parsed.start_date || dates[0];
    const end = parsed.end_date || dates[dates.length - 1];

    const venueHtml = (e) => {
      if (!e.venue_name) return '';
      const name = esc(e.venue_name);
      return e.venue
        ? ` — <a href="https://happyhourflower.com/venue/${e.venue.id}">${name}</a>`
        : ` — ${name}`;
    };
    const itemHtml = (e) => {
      const text = `${esc(e.title)}${venueHtml(e)}`;
      return `<li>${e.is_special ? `<strong>${text}</strong>` : text}</li>`;
    };

    const specials = events.filter((e) => e.is_special);
    let html = `<p>From one-time festivals to weekly trivia and happy hours, here's everything food and drink happening across the Upstate from ${fmtShort(start)} to ${fmtShort(end)}. <strong>Bold events</strong> are one-time or special events you won't want to miss. Recurring events are listed on their first date this week.</p>`;
    dates.forEach((d) => {
      html += `<h2>${fmtDay(d)}</h2><ul>${events.filter((e) => e.date === d).map(itemHtml).join('')}</ul>`;
    });
    if (specials.length) {
      html += `<h2>Can't-miss special events this week</h2><ul>${specials
        .map((e) => `<li><strong>${esc(e.title)}</strong> — ${fmtDay(e.date)}${e.venue_name ? ` at ${esc(e.venue_name)}` : ''}</li>`)
        .join('')}</ul>`;
    }
    html += `<p>Event details can change — check with the venue before heading out. For live happy hour times and daily deals, use the Happy Hour Flower app at <a href="https://happyhourflower.com">happyhourflower.com</a>.</p>`;
    html = withBrandMention(html);

    const sameMonth = start.slice(0, 7) === end.slice(0, 7);
    const range = sameMonth ? `${fmtShort(start)}–${Number(end.slice(8, 10))}` : `${fmtShort(start)}–${fmtShort(end)}`;
    const title = `Happy Hour Happenings: ${range}, ${end.slice(0, 4)}`;
    const slug = `happy-hour-happenings-${start}-to-${end}`;
    const excerpt = `Your weekly guide to ${events.length} food, drink and happy hour events across the Upstate, ${fmtShort(start)}–${fmtShort(end)}.`;

    const record = {
      title,
      slug,
      excerpt,
      body_html: html,
      category: 'Weekly Events',
      tags: ['weekly events', 'happy hour', 'upstate sc', 'greenville'],
      author,
      status: 'scheduled',
      published_at: `${start}T12:00:00.000Z`,
      seo_title: `Upstate Food & Drink Events: ${fmtShort(start)}–${fmtShort(end)}`.slice(0, 60),
      seo_description: excerpt.slice(0, 155),
      seo_keywords: ['greenville events this week', 'upstate sc happy hour', 'greenville food and drink events', 'things to do in greenville sc'],
      source_keyword: 'weekly events digest',
    };

    // Re-running for the same week updates the draft instead of duplicating it.
    const existing = (await base44.asServiceRole.entities.BlogArticle.filter({ slug }))[0];
    let article;
    if (existing && existing.local_edit) {
      return Response.json({ error: 'This week\'s digest was already edited by hand — delete it first to regenerate.' }, { status: 409 });
    } else if (existing) {
      article = await base44.asServiceRole.entities.BlogArticle.update(existing.id, { ...record, status: existing.status });
    } else {
      article = await base44.asServiceRole.entities.BlogArticle.create(record);
    }

    return Response.json({
      success: true,
      article_id: article.id,
      title,
      updated: !!existing,
      event_count: events.length,
      special_count: specials.length,
      day_count: dates.length,
      matched_venues: [...matched.values()].sort(),
      unmatched_venues: [...unmatched].sort(),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}