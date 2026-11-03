import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { secrets } from 'base44:runtime';
import { createResend } from '../../shared/resendClient.ts';
import { requireAutomationCaller } from '../../shared/automationAuth.ts';

const CATEGORY_LABELS = {
  feature: 'New feature',
  fix: 'Fix',
  design: 'Design',
  content: 'Content',
  backend: 'Backend',
  other: 'Other',
};

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);

    const denied = await requireAutomationCaller(base44, req);
    if (denied) return denied;

    const adminEmail = secrets.get('ADMIN_EMAIL');
    if (!adminEmail) {
      return Response.json({ error: 'ADMIN_EMAIL secret is not set' }, { status: 500 });
    }

    // "Today" in the owner's timezone (America/New_York).
    const tz = 'America/New_York';
    const now = new Date();
    const localDate = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(now);

    const all = await base44.asServiceRole.entities.ChangelogEntry.list('-created_date', 500);
    const todays = all.filter((e) => {
      if (!e.change_date && !e.created_date) return false;
      const d = new Intl.DateTimeFormat('en-CA', {
        timeZone: tz,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(new Date(e.change_date || e.created_date));
      return d === localDate;
    });

    const prettyDate = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }).format(now);

    let html;
    if (todays.length === 0) {
      html = `<div style="font-family:Arial,Helvetica,sans-serif;color:#1c1917;max-width:600px">
        <h2 style="margin:0 0 8px">Daily Changelog</h2>
        <p style="color:#78716c;margin:0 0 20px">${prettyDate}</p>
        <p>No changes were logged today.</p>
      </div>`;
    } else {
      const items = todays
        .slice()
        .reverse()
        .map((e) => {
          const time = new Intl.DateTimeFormat('en-US', {
            timeZone: tz,
            hour: 'numeric',
            minute: '2-digit',
          }).format(new Date(e.change_date || e.created_date));
          const label = CATEGORY_LABELS[e.category] || 'Other';
          const desc = e.description
            ? `<div style="color:#57534e;font-size:14px;margin-top:4px">${e.description}</div>`
            : '';
          return `<li style="margin-bottom:14px">
            <div><strong>${e.title}</strong></div>
            <div style="color:#a8a29e;font-size:12px;margin-top:2px">${label} · ${time}${e.source === 'auto' ? ' · auto-logged' : ''}</div>
            ${desc}
          </li>`;
        })
        .join('');

      html = `<div style="font-family:Arial,Helvetica,sans-serif;color:#1c1917;max-width:600px">
        <h2 style="margin:0 0 8px">Daily Changelog</h2>
        <p style="color:#78716c;margin:0 0 20px">${prettyDate} · ${todays.length} change${todays.length === 1 ? '' : 's'}</p>
        <ul style="padding-left:18px;margin:0">${items}</ul>
      </div>`;
    }

    const { error: sendError } = await createResend(Deno.env.get('RESEND_API_KEY')).emails.send({
      to: adminEmail,
      subject: `Daily Changelog — ${prettyDate} (${todays.length} change${todays.length === 1 ? '' : 's'})`,
      html,
    });
    if (sendError) throw new Error(sendError.message);

    return Response.json({ sent: true, count: todays.length, date: localDate });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}