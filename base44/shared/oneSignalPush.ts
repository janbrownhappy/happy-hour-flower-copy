// Push one notification to many users (batched, 2000 external ids per request).
export async function pushToUsers(userIds, title, message, data) {
  const appId = Deno.env.get('ONESIGNAL_APP_ID');
  const apiKey = Deno.env.get('ONESIGNAL_REST_API_KEY');
  const ids = [...new Set(userIds.filter(Boolean))];
  if (!appId || !apiKey || !ids.length) return 0;
  let sent = 0;
  for (let i = 0; i < ids.length; i += 2000) {
    const res = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Key ${apiKey}` },
      body: JSON.stringify({
        app_id: appId,
        headings: { en: title },
        contents: { en: message },
        include_external_user_ids: ids.slice(i, i + 2000),
        channel_for_external_user_ids: 'push',
        ...(data?.deep_link ? { url: data.deep_link } : {}),
        ...(data ? { data } : {}),
      }),
    });
    if (res.ok) sent += Math.min(2000, ids.length - i);
  }
  return sent;
}

// Text (SMS) many phone numbers through OneSignal. Callers must only pass users who opted in to SMS.
export async function smsToPhones(phones, message) {
  const appId = Deno.env.get('ONESIGNAL_APP_ID');
  const apiKey = Deno.env.get('ONESIGNAL_REST_API_KEY');
  const toE164 = (raw) => {
    const d = String(raw || '').replace(/\D/g, '');
    if (d.length === 10) return `+1${d}`;
    if (d.length === 11 && d.startsWith('1')) return `+${d}`;
    return null;
  };
  const nums = [...new Set(phones.map(toE164).filter(Boolean))];
  if (!appId || !apiKey || !nums.length) return 0;
  const res = await fetch('https://onesignal.com/api/v1/notifications', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Key ${apiKey}` },
    body: JSON.stringify({ app_id: appId, name: 'Follower SMS', contents: { en: message }, include_phone_numbers: nums }),
  });
  const json = await res.json().catch(() => ({}));
  console.log('SMS send result', res.status, JSON.stringify(json));
  return res.ok && json.id ? nums.length : 0;
}

// Push a notification to a single user via OneSignal external user id.
export async function pushToUser(userId, title, message, data) {
  const appId = Deno.env.get('ONESIGNAL_APP_ID');
  const apiKey = Deno.env.get('ONESIGNAL_REST_API_KEY');
  if (!appId || !apiKey) return false;
  const res = await fetch('https://onesignal.com/api/v1/notifications', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Key ${apiKey}` },
    body: JSON.stringify({
      app_id: appId,
      headings: { en: title },
      contents: { en: message },
      include_external_user_ids: [userId],
      channel_for_external_user_ids: 'push',
      ...(data?.deep_link ? { url: data.deep_link } : {}),
      ...(data ? { data } : {}),
    }),
  });
  return res.ok;
}