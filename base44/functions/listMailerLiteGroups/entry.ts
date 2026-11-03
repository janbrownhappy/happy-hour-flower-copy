import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * Lists the MailerLite account's groups (and their automation potential).
 * Admin-only — used by the admin UI to map app activity triggers to groups.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const apiKey = Deno.env.get('MAILERLITE_API_KEY');
    if (!apiKey) return Response.json({ error: 'MAILERLITE_API_KEY not configured' }, { status: 500 });

    const res = await fetch('https://connect.mailerlite.com/api/groups?limit=100', {
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      return Response.json({ error: body?.message || 'Failed to fetch groups', status: res.status }, { status: res.status });
    }

    const groups = (body.data || []).map((g) => ({
      id: g.id,
      name: g.name,
      active_count: g.active_count,
      total_count: g.total,
    }));

    return Response.json({ success: true, groups });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});