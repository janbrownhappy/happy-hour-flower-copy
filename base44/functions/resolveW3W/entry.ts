import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Converts a what3words address (e.g. "filled.count.soap") into lat/lng coordinates
// using the what3words convert-to-coordinates API. Used when a venue owner sets the
// venue's precise location for geofencing.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { words } = await req.json();
    if (!words || typeof words !== 'string') {
      return Response.json({ error: 'words is required (e.g. "filled.count.soap")' }, { status: 400 });
    }

    const apiKey = Deno.env.get('WHAT3WORDS_API_KEY');
    if (!apiKey) {
      return Response.json({ error: 'what3words API key not configured' }, { status: 500 });
    }

    // Strip a leading /// if the user pasted the full format
    const clean = words.trim().replace(/^\/+/, '');

    const url = `https://api.what3words.com/v3/convert-to-coordinates?words=${encodeURIComponent(clean)}&key=${apiKey}`;
    const res = await fetch(url);
    const data = await res.json();

    if (!res.ok || data.error) {
      return Response.json({
        error: data.error?.message || 'Could not resolve that what3words address.',
      }, { status: 400 });
    }

    if (!data.coordinates) {
      return Response.json({ error: 'No coordinates returned for that address.' }, { status: 400 });
    }

    return Response.json({
      success: true,
      words: data.words || clean,
      lat: data.coordinates.lat,
      lng: data.coordinates.lng,
      nearestPlace: data.nearestPlace || '',
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});