import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { consumeDailyQuota } from '../../shared/dailyLimit.ts';

// Notifies the Happy Hour Flower team that the signed-in user asked for a Premium upgrade.
// Recipient and wording are fixed server-side; the caller only says where the request came from.
const ADMIN_INBOX = 'admin@happyhourflower.com';

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // One request email per user per day is plenty; extra taps succeed silently.
    if (!(await consumeDailyQuota(base44.asServiceRole, 'premium_request', user.id, 1))) {
      return Response.json({ success: true });
    }
    const { source } = await req.json().catch(() => ({}));
    const who = `${user.full_name || ''} (${user.email})`.trim();
    const isVenue = source === 'venue_setup';

    await base44.asServiceRole.integrations.Core.SendEmail({
      to: ADMIN_INBOX,
      category: 'transactional',
      subject: isVenue ? `Premium Upgrade Request — ${user.email}` : `Premium request from ${user.full_name || user.email}`,
      body: isVenue
        ? `Venue owner ${who} has requested a Premium upgrade from the venue setup wizard.`
        : `User ${who} has requested premium access. Please review and activate in the Admin Dashboard > Users tab.`,
    });
    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}