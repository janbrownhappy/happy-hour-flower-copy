import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { withConsumerFooterText } from '../../shared/consumerEmailFooter.ts';
import { createResend } from '../../shared/resendClient.ts';
import { requireAutomationCaller } from '../../shared/automationAuth.ts';

const resend = createResend(Deno.env.get('RESEND_API_KEY'));

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const denied = await requireAutomationCaller(base44, req);
    if (denied) return denied;
    const body = await req.json();
    const { data, changed_fields } = body;

    // Only care about happy hour schedule or deals changes
    const relevantFields = ['happy_hour_start', 'happy_hour_end', 'days', 'deals', 'deals_by_day', 'day_schedules'];
    const hasRelevantChange = changed_fields?.some(f => relevantFields.includes(f));

    if (!hasRelevantChange) {
      return Response.json({ skipped: true, reason: 'No relevant fields changed' });
    }

    const venueId = data?.id;
    const venueName = data?.name || 'A venue you favorited';

    // Find all favorites for this venue
    const allFavorites = await base44.asServiceRole.entities.Favorite.list();
    const venueFavorites = allFavorites.filter(
      f => f.venue_id === venueId || f.venue_id?.toString() === venueId?.toString()
    );

    if (venueFavorites.length === 0) {
      return Response.json({ skipped: true, reason: 'No favorites for this venue' });
    }

    // Get all users
    const allUsers = await base44.asServiceRole.entities.User.list();
    const usersById = Object.fromEntries(allUsers.map(u => [u.id, u]));

    // Build change summary
    const changes = [];
    if (changed_fields?.includes('happy_hour_start') || changed_fields?.includes('happy_hour_end')) {
      changes.push(`Hours updated to ${data.happy_hour_start || '?'} – ${data.happy_hour_end || '?'}`);
    }
    if (changed_fields?.includes('days')) {
      changes.push(`Available days: ${data.days?.join(', ')}`);
    }
    if (changed_fields?.includes('deals') || changed_fields?.includes('deals_by_day')) {
      changes.push('New deals have been added');
    }
    if (changed_fields?.includes('day_schedules')) {
      changes.push('Weekly schedule updated');
    }

    const changeSummary = changes.join(' · ');
    const notifTitle = `${venueName} updated their happy hour`;
    const notifMessage = changeSummary || 'Check out their latest deals and hours.';

    let sent = 0;
    let feedCreated = 0;

    for (const fav of venueFavorites) {
      const recipientUserId = fav.user_id || fav.created_by_id;
      if (!recipientUserId) continue;

      // Always create an in-app feed notification
      await base44.asServiceRole.entities.VenueNotification.create({
        user_id: recipientUserId,
        venue_id: venueId,
        venue_name: venueName,
        type: changed_fields?.some(f => ['deals', 'deals_by_day'].includes(f))
          ? 'deals_updated'
          : 'happy_hour_updated',
        title: notifTitle,
        message: notifMessage,
        is_read: false,
      });
      feedCreated++;

      // Also send email if user opted into venue comms
      if (fav.receive_venue_comms) {
        const user = usersById[recipientUserId];
        if (user?.email) {
          const text = withConsumerFooterText(`Hi ${user.full_name || 'there'},\n\n${venueName}, one of your favorited spots, just updated their happy hour:\n\n${changeSummary}\n\nOpen the app to see the latest details.\n\n— Happy Hour Flower`);
          await resend.emails.send({
            to: user.email,
            subject: `${venueName} updated their happy hour!`,
            html: text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/\n/g, '<br>'),
          });
          sent++;
        }
      }
    }

    return Response.json({ success: true, feed_created: feedCreated, emails_sent: sent });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});