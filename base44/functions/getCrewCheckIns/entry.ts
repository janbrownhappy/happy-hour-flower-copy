import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Crew members THIS user has invited who have joined and matched a real account.
    const crew = await base44.asServiceRole.entities.CrewMember.filter({ owner_id: user.id });
    const friendIds = crew
      .filter((c) => c.status === 'joined' && c.member_user_id)
      .map((c) => c.member_user_id);

    if (friendIds.length === 0) {
      return Response.json({ check_ins: [] });
    }

    // Shared check-ins from those friends. Service role avoids evaluating a
    // cross-user RLS subquery that fails when the crew set is empty.
    const shared = await base44.asServiceRole.entities.CheckIn.filter(
      { shared_with_crew: true },
      '-checked_in_at',
      100,
    );
    const fromFriends = shared.filter(
      (c) => friendIds.includes(c.user_id) && c.user_id !== user.id,
    );

    return Response.json({ check_ins: fromFriends });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});