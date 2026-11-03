import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { requireAutomationCaller } from '../../shared/automationAuth.ts';
import { esc } from '../../shared/htmlEscape.ts';

// Build a base64url-encoded RFC 2822 message for the Gmail API.
function buildMessage({ to, subject, html }: { to: string; subject: string; html: string }) {
  const encodedSubject = `=?UTF-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`;
  const lines = [
    `To: ${to}`,
    `Subject: ${encodedSubject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset="UTF-8"',
    'Content-Transfer-Encoding: 8bit',
    '',
    html,
  ];
  const raw = lines.join('\r\n');
  // base64url encode
  return btoa(unescape(encodeURIComponent(raw)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export default async function (req: Request) {
  try {
    const base44 = createClientFromRequest(req);
    const denied = await requireAutomationCaller(base44, req);
    if (denied) return denied;
    const body = await req.json();

    // Always load the stored question — never trust its fields from the request body.
    const questionId = body.event?.entity_id || body.data?.id;
    const question = questionId
      ? await base44.asServiceRole.entities.LocalQuestion.get(questionId).catch(() => null)
      : null;
    if (!question) {
      return Response.json({ skipped: 'no question data' });
    }

    const adminEmail = Deno.env.get('ADMIN_EMAIL');
    if (!adminEmail) {
      return Response.json({ error: 'ADMIN_EMAIL not set' }, { status: 500 });
    }

    const author = esc(question.author_name || 'A user');
    const venue = question.venue_name ? ` (tagged venue: ${esc(question.venue_name)})` : '';
    const subject = `New "Ask a Local" question awaiting review`;
    const html = `
      <div style="font-family: Arial, sans-serif; color: #1a1a1a;">
        <h2 style="margin:0 0 12px;">New question in Ask a Local</h2>
        <p style="margin:0 0 8px;"><strong>${author}</strong> just posted a question${venue}:</p>
        <blockquote style="border-left:3px solid #e0a020;margin:12px 0;padding:8px 14px;background:#faf7f0;">
          ${esc(question.text || '')}
        </blockquote>
        <p style="margin:16px 0 0;font-size:13px;color:#666;">Review it in the Admin → Ask a Local tab.</p>
      </div>
    `;

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('gmail');

    const rawMessage = buildMessage({ to: adminEmail, subject, html });

    const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ raw: rawMessage }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return Response.json({ error: `Gmail send failed: ${errText}` }, { status: 500 });
    }

    return Response.json({ sent: true, to: adminEmail });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}