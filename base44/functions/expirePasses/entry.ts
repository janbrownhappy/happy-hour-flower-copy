import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { requireAutomationCaller } from '../../shared/automationAuth.ts';

// Scheduled sweep: flips any issued PassInstance whose expires_at is in the past
// to "expired", so the wallet pass page and "My Passes" list always show current
// status without waiting for a redeem attempt. Admin-only when invoked directly.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const denied = await requireAutomationCaller(base44, req);
    if (denied) return denied;

    const svc = base44.asServiceRole;
    const nowIso = new Date().toISOString();

    // Only issued passes that carry an expiry can expire.
    const candidates = await svc.entities.PassInstance.filter(
      { status: 'issued', expires_at: { $lte: nowIso } },
      '-expires_at',
      500,
    );

    let expired = 0;
    for (const p of candidates) {
      await svc.entities.PassInstance.update(p.id, { status: 'expired' });
      expired += 1;
    }

    return Response.json({ success: true, expired, checked_at: nowIso });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});