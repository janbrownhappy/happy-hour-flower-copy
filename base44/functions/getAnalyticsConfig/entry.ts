import { secrets } from 'base44:runtime';

// Returns the public-safe Amplitude browser key. No auth: the key ships to every browser anyway.
export default async function(req) {
  try {
    return Response.json({ amplitude_api_key: secrets.get('AMPLITUDE_API_KEY') || '' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}