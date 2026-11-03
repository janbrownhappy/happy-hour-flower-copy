import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { isAppAdmin } from '../../shared/automationAuth.ts';

// Admin-only: short-lived link to a venue claim's private proof document.
// Only files actually attached to a claim can be opened.
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!isAppAdmin(user)) return Response.json({ error: 'Forbidden' }, { status: 403 });

    const { file_uri } = await req.json().catch(() => ({}));
    if (!file_uri || typeof file_uri !== 'string') return Response.json({ error: 'file_uri is required' }, { status: 400 });

    const svc = base44.asServiceRole;
    const claims = await svc.entities.VenueClaimRequest.filter({ proof_url: file_uri }, '-created_date', 1);
    if (!claims.length) return Response.json({ error: 'Not found' }, { status: 404 });

    const { signed_url } = await svc.integrations.Core.CreateFileSignedUrl({ file_uri, expires_in: 600 });
    return Response.json({ signed_url });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}