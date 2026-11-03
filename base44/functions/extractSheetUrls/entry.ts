import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { isAppAdmin } from '../../shared/automationAuth.ts';

// Admin-only: reads every website URL out of a privately uploaded Excel sheet
// for the bulk website import tool.
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!isAppAdmin(user)) return Response.json({ error: 'Forbidden' }, { status: 403 });

    const { file_uri } = await req.json().catch(() => ({}));
    if (!file_uri || typeof file_uri !== 'string') return Response.json({ error: 'file_uri is required' }, { status: 400 });

    const core = base44.asServiceRole.integrations.Core;
    const { signed_url } = await core.CreateFileSignedUrl({ file_uri, expires_in: 600 });
    const res = await core.ExtractDataFromUploadedFile({
      file_url: signed_url,
      json_schema: { type: 'object', properties: { urls: { type: 'array', items: { type: 'string' }, description: 'Every website URL found in any cell' } } },
    });
    if (res.status !== 'success') return Response.json({ error: res.details || 'Could not read the Excel file' }, { status: 422 });
    const urls = (res.output?.urls || []).filter((u) => typeof u === 'string');
    return Response.json({ urls });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}