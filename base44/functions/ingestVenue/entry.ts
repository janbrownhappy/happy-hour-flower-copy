import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { secrets, waitUntil } from 'base44:runtime';

// Webhook: receives one scraped venue per request from the external happy hour scraper
// and writes it into the Venue table, matching on venue_key so a re-scrape updates
// rather than duplicating. Responds fast — the scraper times out at 15s and retries 5xx.
export default async function (req) {
  try {
    if (req.method !== 'POST') {
      return Response.json({ error: 'Method not allowed' }, { status: 405 });
    }

    const expected = secrets.get('HHF_WEBHOOK_KEY');
    const provided = req.headers.get('api_key');
    if (!expected || provided !== expected) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const venueKey = body?.venue_key?.trim();
    const venue = body?.venue || {};
    if (!venueKey) return Response.json({ error: 'venue_key is required' }, { status: 400 });
    if (!venue.name?.trim()) return Response.json({ error: 'venue.name is required' }, { status: 400 });

    const base44 = createClientFromRequest(req);
    const db = base44.asServiceRole.entities;

    const receivedAt = new Date().toISOString();
    const scrapedAt = body.scraped_at || receivedAt;
    const scrapeError = body.error ? String(body.error) : '';
    // An empty scrape almost always means the scraper hit the wrong page, not that the
    // venue dropped its happy hour — so it must never overwrite data we already hold.
    const goodScrape = !scrapeError && venue.has_happy_hour === true;

    const existing = (await db.Venue.filter({ venue_key: venueKey }))[0] || null;

    let action;
    if (existing && existing.manual_override === true) {
      // Hand-corrected record: touch only the scrape metadata so a human can compare.
      action = 'skipped_override';
      await db.Venue.update(existing.id, {
        last_scraped_at: scrapedAt,
        scrape_status: 'needs_review',
      });
    } else if (goodScrape) {
      const fields = {
        name: venue.name,
        address: venue.address || '',
        city: venue.city || '',
        phone: venue.phone || '',
        website: venue.website || '',
        instagram_url: venue.instagram || '',
        has_happy_hour: true,
        happy_hour_windows: Array.isArray(venue.happy_hour_windows) ? venue.happy_hour_windows : [],
        specials: Array.isArray(venue.specials) ? venue.specials : [],
        amenities_raw: (Array.isArray(venue.amenities_mentioned) ? venue.amenities_mentioned : []).map(String),
        notes: venue.notes || '',
        source_url: body.source_url || '',
        last_scraped_at: scrapedAt,
        last_scrape_error: '',
        scrape_status: 'scraped',
      };
      if (existing) {
        action = 'updated';
        await db.Venue.update(existing.id, fields);
      } else {
        action = 'created';
        await db.Venue.create({ ...fields, venue_key: venueKey, manual_override: false });
      }
    } else {
      // Empty or failed scrape — flag it, keep whatever happy hour data already exists.
      const flagged = {
        source_url: body.source_url || '',
        last_scraped_at: scrapedAt,
        last_scrape_error: scrapeError,
        scrape_status: 'needs_review',
      };
      if (existing) {
        action = 'flagged';
        await db.Venue.update(existing.id, flagged);
      } else {
        action = 'created';
        await db.Venue.create({
          ...flagged,
          venue_key: venueKey,
          name: venue.name,
          address: venue.address || '',
          city: venue.city || '',
          phone: venue.phone || '',
          website: venue.website || '',
          instagram_url: venue.instagram || '',
          manual_override: false,
        });
      }
    }

    // Logging must never delay the scraper's response.
    waitUntil(
      db.ScrapeLog.create({
        run_id: body.run_id || '',
        venue_key: venueKey,
        received_at: receivedAt,
        action,
        error: scrapeError,
      })
    );

    return Response.json({ ok: true, venue_key: venueKey, action });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}