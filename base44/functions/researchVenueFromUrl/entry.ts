import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { secrets } from 'base44:runtime';
import { researchVenueUrl } from '../../shared/researchVenueUrl.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    const ownerEmails = [secrets.get('ADMIN_EMAIL'), 'jan.brown@happyhourflower.com'].filter(Boolean).map(e => e.toLowerCase());
    const isAdmin = user?.role === 'admin' || ownerEmails.includes((user?.email || '').toLowerCase());
    if (!isAdmin) return Response.json({ error: 'Forbidden' }, { status: 403 });

    const { url } = await req.json();
    if (!url || !/^https?:\/\//i.test(url)) return Response.json({ error: 'Enter a full website or Facebook page URL starting with http(s)://' }, { status: 400 });

    return Response.json(await researchVenueUrl(base44, url));
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}