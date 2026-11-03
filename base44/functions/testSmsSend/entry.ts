import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { ghlSmsToPhones } from '../../shared/ghlSms.ts';

// Admin-only: sends a test SMS through GoHighLevel.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });
    const { phone, message } = await req.json();
    const sent = await ghlSmsToPhones([phone], message || 'Test message from Happy Hour Flower. SMS is working! Reply STOP to opt out.');
    return Response.json({ ok: sent > 0, sent });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});