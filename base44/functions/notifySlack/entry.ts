import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { requireAutomationCaller } from '../../shared/automationAuth.ts';

const APP_URL = 'https://happyhourflower.app';
const DEFAULT_ICON = 'https://media.base44.com/images/public/6a1f45eb9cf7513caebbab49/65d765106_HappyHourFlowerLogo.png';

function buildText(event, d) {
  d = d || {};
  switch (event) {
    case 'claim_created':
      return `:inbox_tray: New ${d.request_type === 'add' ? 'business submission' : 'venue claim'}: *${d.venue_name || 'Unknown venue'}* by ${d.claimant_name || '?'} (${d.claimant_email || 'no email'}) via ${d.source || 'app'}\nCategory: *${d.proposed_category}*\n<${APP_URL}/admin|Review in admin>`;
    case 'claim_status':
      return `:white_check_mark: Claim for *${d.venue_name || 'Unknown venue'}* is now *${d.status}* (${d.claimant_email || ''})`;
    case 'venue_created':
      return `:new: New venue: *${d.name}* ${d.city ? `in ${d.city}` : ''} (status: ${d.status || 'active'})\nCategory: *${d.category}*\n<${APP_URL}/venue/${d.id}|View venue>`;
    case 'venue_updated':
      return `:pencil2: Venue updated: *${d.name}* — changed: ${(d.changed_fields || []).join(', ') || 'details'}\n<${APP_URL}/venue/${d.id}|View venue>`;
    case 'venue_signup':
      return `:tada: New ${['premium', 'platinum'].includes(d.subscription_tier) ? `PAID (${d.subscription_tier})` : 'FREE'} venue: *${d.name}*${d.city ? ` in ${d.city}` : ''}\nCategory: *${d.category}*\n<${APP_URL}/venue/${d.id}|View venue>`;
    case 'user_signup':
      return `:wave: New FREE consumer signup: ${d.full_name || ''} ${d.email || ''} (${d.auth_method || 'unknown'})`;
    case 'consumer_paid':
      return `:moneybag: New PAID consumer: ${d.display_name || ''} ${d.email || ''} upgraded to *${d.subscription_tier}*`;
    case 'demo_setup':
      return `:test_tube: Demo account setup: ${d.summary || 'completed'}`;
    default:
      return d.text || event;
  }
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const denied = await requireAutomationCaller(base44, req);
    if (denied) return denied;

    const { category, event, data } = await req.json();
    if (!['claims', 'venues', 'accounts', 'paid', 'free', 'venue_free', 'venue_paid'].includes(category)) {
      return Response.json({ error: 'Invalid category' }, { status: 400 });
    }

    const svc = base44.asServiceRole;
    const settings = await svc.entities.AppSetting.filter({ key: { $in: [`slack_channel_${category}`, 'slack_bot_name', 'slack_bot_icon'] } });
    const get = (k) => settings.find((s) => s.key === k)?.value_string?.trim();
    const channel = get(`slack_channel_${category}`);
    if (!channel) return Response.json({ skipped: 'No destination configured' });

    const icon = get('slack_bot_icon') || DEFAULT_ICON;
    const body = {
      channel,
      text: buildText(event, data),
      username: get('slack_bot_name') || 'Happy Hour Flower',
      ...(icon.startsWith(':') ? { icon_emoji: icon } : { icon_url: icon }),
    };

    const { accessToken } = await svc.connectors.getConnection('slackbot');
    const res = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10000),
    });
    const json = await res.json();
    if (!json.ok) {
      const hint = ['not_in_channel', 'channel_not_found'].includes(json.error) ? ' — invite the bot to this channel in Slack' : '';
      return Response.json({ error: `Slack: ${json.error}${hint}` }, { status: 502 });
    }
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}