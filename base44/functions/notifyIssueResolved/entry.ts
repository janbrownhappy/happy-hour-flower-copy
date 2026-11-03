import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { createResend } from '../../shared/resendClient.ts';
import { requireAutomationCaller } from '../../shared/automationAuth.ts';
import { esc } from '../../shared/htmlEscape.ts';

const ISSUE_LABELS = {
  incorrect_hours: 'Incorrect Hours',
  wrong_deals: 'Wrong Deals',
  closed_permanently: 'Permanently Closed',
  wrong_location: 'Wrong Location',
  wrong_contact_info: 'Wrong Contact Info',
  other: 'Other',
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const denied = await requireAutomationCaller(base44, req);
    if (denied) return denied;
    const payload = await req.json();

    // Entity automation payload
    const { event, data, old_data, payload_too_large } = payload;
    const entityId = event?.entity_id;

    let issue = data;
    if (payload_too_large && entityId) {
      issue = await base44.asServiceRole.entities.ListingIssue.get(entityId).catch(() => null);
    }
    if (!issue) {
      return Response.json({ skipped: true, reason: 'No issue data' });
    }

    // Only fire when status changed INTO resolved or dismissed
    const isClosed = issue.status === 'resolved' || issue.status === 'dismissed';
    const wasClosed = old_data && (old_data.status === 'resolved' || old_data.status === 'dismissed');
    if (!isClosed || wasClosed) {
      return Response.json({ skipped: true, reason: 'Status did not transition to closed' });
    }

    // Find the reporter's email
    let reporterEmail = null;
    let reporterName = issue.reporter_name || 'there';
    if (issue.reporter_id) {
      const reporter = await base44.asServiceRole.entities.User.get(issue.reporter_id).catch(() => null);
      if (reporter) {
        reporterEmail = reporter.email;
        reporterName = reporter.full_name || reporterName;
      }
    }
    if (!reporterEmail) {
      return Response.json({ skipped: true, reason: 'No reporter email' });
    }

    const resolved = issue.status === 'resolved';
    const issueLabel = ISSUE_LABELS[issue.issue_type] || 'Listing Issue';

    const resend = createResend(Deno.env.get('RESEND_API_KEY'));
    await resend.emails.send({
      from: 'Happy Hour Flower <happy@updates.happyhourflower.com>',
      to: reporterEmail,
      subject: resolved
        ? `✅ Your report about "${issue.venue_name}" has been resolved`
        : `Update on your report about "${issue.venue_name}"`,
      html: `<!DOCTYPE html>
<html>
<body style="font-family:'Nunito',sans-serif;background:#f8f4ef;padding:32px;color:#1a1a1a;">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:16px;padding:32px;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
    <div style="text-align:center;margin-bottom:24px;">
      <img src="https://media.base44.com/images/public/6a1f45eb9cf7513caebbab49/c16180f90_Untitled1024x1024px512x512px256x256px.gif" alt="Happy Hour Flower" style="width:64px;height:64px;border-radius:50%;" />
    </div>
    <p style="color:#666;">Hi ${esc(reporterName)},</p>
    <p>Thank you for helping keep Happy Hour Flower accurate. We've reviewed the issue you reported for <strong>${esc(issue.venue_name)}</strong> (<em>${esc(issueLabel)}</em>).</p>
    ${resolved
      ? `<div style="margin:20px 0;padding:14px 16px;background:#f0fdf4;border-left:3px solid #16a34a;border-radius:4px;"><p style="margin:0;color:#166534;font-size:14px;"><strong>Resolved:</strong> We've updated the listing based on your report.</p></div>`
      : `<div style="margin:20px 0;padding:14px 16px;background:#fffbeb;border-left:3px solid #f5a623;border-radius:4px;"><p style="margin:0;color:#8a6900;font-size:14px;">After reviewing, we determined no change was needed at this time, but we appreciate you flagging it.</p></div>`}
    ${issue.admin_notes ? `<p style="font-size:14px;color:#666;"><strong>Note from our team:</strong> ${esc(issue.admin_notes)}</p>` : ''}
    <p style="margin-top:24px;">Thanks for being part of the community! 🌸</p>
    <hr style="margin:32px 0;border:none;border-top:1px solid #eee;" />
    <p style="font-size:12px;color:#aaa;text-align:center;">Happy Hour Flower · Greenville, SC</p>
  </div>
</body>
</html>`,
    });

    return Response.json({ success: true, sentTo: reporterEmail, status: issue.status });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});