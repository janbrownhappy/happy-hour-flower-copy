// Sends SMS through GoHighLevel: upserts a contact by phone, then posts an SMS message.
const BASE = 'https://services.leadconnectorhq.com';

function toE164(raw) {
  const d = String(raw || '').replace(/\D/g, '');
  if (d.length === 10) return `+1${d}`;
  if (d.length === 11 && d.startsWith('1')) return `+${d}`;
  return null;
}

export async function ghlSmsToPhones(phones, message) {
  const token = Deno.env.get('GHL_PRIVATE_TOKEN');
  const locationId = Deno.env.get('GHL_LOCATION_ID');
  if (!token || !locationId) return 0;
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Accept: 'application/json' };
  const list = [...new Set((phones || []).map(toE164).filter(Boolean))];
  let sent = 0;
  for (const phone of list) {
    const c = await fetch(`${BASE}/contacts/upsert`, {
      method: 'POST', headers: { ...headers, Version: '2021-07-28' },
      body: JSON.stringify({ locationId, phone, source: 'Happy Hour Flower' }),
    });
    const contactId = (await c.json().catch(() => ({})))?.contact?.id;
    if (!contactId) { console.error('GHL upsert failed', c.status); continue; }
    const m = await fetch(`${BASE}/conversations/messages`, {
      method: 'POST', headers: { ...headers, Version: '2021-04-15' },
      body: JSON.stringify({ type: 'SMS', contactId, message, fromNumber: '+18644326740' }),
    });
    if (m.ok) sent++; else console.error('GHL SMS failed', m.status, await m.text());
  }
  return sent;
}