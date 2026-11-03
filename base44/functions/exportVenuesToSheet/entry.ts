import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

const FIELDS = [
  'name', 'slug', 'category', 'status', 'subscription_tier', 'neighborhood',
  'address', 'city', 'zip_code', 'lat', 'lng',
  'phone', 'website', 'facebook_url', 'instagram_url', 'tiktok_url', 'threads_url', 'youtube_url',
  'price_level', 'rating', 'review_count', 'view_count', 'favorite_count',
  'happy_hour_start', 'happy_hour_end',
  'is_featured', 'is_new', 'is_fan_favorite',
  'verification_status', 'description', 'tags',
  'owner_id', 'created_date', 'updated_date'
];

function cellValue(val) {
  if (val === null || val === undefined) return '';
  if (Array.isArray(val)) return val.join('; ');
  return String(val);
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    // Load all venues (service role — admin export of the full dataset)
    const venues = [];
    let page = 1;
    while (true) {
      const batch = await base44.asServiceRole.entities.Venue.list('-created_date', 500, (page - 1) * 500);
      if (!batch.length) break;
      venues.push(...batch);
      if (batch.length < 500) break;
      page++;
    }

    const rows = [FIELDS, ...venues.map(v => FIELDS.map(f => cellValue(v[f])))];

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('googlesheets');
    const title = `Happy Hour Flower — Venues ${new Date().toISOString().slice(0, 10)}`;

    // Create a new spreadsheet
    const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ properties: { title } }),
    });
    const created = await createRes.json();
    if (!createRes.ok) {
      return Response.json({ error: created.error?.message || 'Failed to create spreadsheet' }, { status: 500 });
    }
    const spreadsheetId = created.spreadsheetId;
    const spreadsheetUrl = created.spreadsheetUrl;

    // Write all rows
    const updateRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A1?valueInputOption=RAW`,
      {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ values: rows }),
      }
    );
    const updated = await updateRes.json();
    if (!updateRes.ok) {
      return Response.json({ error: updated.error?.message || 'Failed to write data' }, { status: 500 });
    }

    return Response.json({ success: true, count: venues.length, spreadsheetUrl });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}