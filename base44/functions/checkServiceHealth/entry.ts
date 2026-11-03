import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Admin-only health probe: confirms each outside service accepts our keys. Read-only calls.
async function probe(fn: () => Promise<Response>) {
  try {
    const r = await fn();
    return { ok: r.ok, status: r.status };
  } catch (e) {
    return { ok: false, status: 0, error: (e as Error).message };
  }
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  const ownerEmail = (Deno.env.get('ADMIN_EMAIL') || '').toLowerCase();
  if (!user || (user.role !== 'admin' && user.email?.toLowerCase() !== ownerEmail)) {
    return Response.json({ error: 'Admin only' }, { status: 403 });
  }

  const [resend, ghl, revenuecat, walletwallet] = await Promise.all([
    // Send-only keys can't read anything, so post an empty email: a valid key gets a
    // validation error (422), a bad key gets 401/403. Nothing is sent.
    probe(async () => {
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${Deno.env.get('RESEND_API_KEY')}`, 'Content-Type': 'application/json' },
        body: '{}',
      });
      return new Response(null, { status: r.status === 422 ? 200 : r.status });
    }),
    probe(() => fetch(`https://services.leadconnectorhq.com/contacts/?locationId=${Deno.env.get('GHL_LOCATION_ID')}&limit=1`, {
      headers: { Authorization: `Bearer ${Deno.env.get('GHL_PRIVATE_TOKEN')}`, Version: '2021-07-28', Accept: 'application/json' },
    })),
    probe(() => fetch('https://api.revenuecat.com/v1/subscribers/hhf_health_check', {
      headers: { Authorization: `Bearer ${Deno.env.get('REVENUECAT_SECRET_KEY')}` },
    })),
    // Read-only usage lookup; never issues a pass.
    probe(() => fetch('https://api.walletwallet.dev/api/auth/usage', {
      headers: { Authorization: `Bearer ${Deno.env.get('WALLETWALLET_API_KEY')}` },
    })),
  ]);

  return Response.json({ resend, ghl, revenuecat, walletwallet });
});