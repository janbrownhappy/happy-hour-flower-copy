// WalletWallet: one call issues Apple + Google Wallet passes; PUT updates them on every phone.
const BASE = 'https://api.walletwallet.dev/api/passes';

const headers = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${Deno.env.get('WALLETWALLET_API_KEY')}`,
});

// Pass content built from the venue's template + this customer's pass.
export function buildPassBody(tpl: any, inst: any) {
  const isLoyalty = tpl.pass_type === 'loyalty_card';
  const statusText = inst.status === 'redeemed' ? 'Redeemed' : inst.status === 'expired' ? 'Expired' : inst.status === 'voided' ? 'Voided' : 'Active';
  const primary = isLoyalty
    ? [{ label: tpl.loyalty_points_label || 'Points', value: `${inst.loyalty_points || 0} / ${tpl.loyalty_max_points || 10}`, changeMessage: 'You now have %@' }]
    : [{ label: 'OFFER', value: tpl.discount_value || tpl.title, changeMessage: '%@' }];
  const secondary = [
    { label: isLoyalty ? 'REWARD' : 'DEAL', value: (isLoyalty ? tpl.loyalty_reward_description : tpl.title) || tpl.title },
    { label: 'STATUS', value: statusText, changeMessage: 'Your pass is now %@' },
  ];
  const back = [
    tpl.description && { label: 'Details', value: tpl.description },
    tpl.terms && { label: 'Terms', value: tpl.terms },
    { label: 'Code', value: inst.redemption_code },
  ].filter(Boolean);
  const body: any = {
    barcodeValue: inst.redemption_code,
    barcodeFormat: 'QR',
    barcodeAltText: inst.redemption_code,
    logoText: (tpl.venue_name || 'Happy Hour Flower').slice(0, 64),
    organizationName: (tpl.venue_name || 'Happy Hour Flower').slice(0, 64),
    description: (tpl.title || 'Pass').slice(0, 128),
    colorPreset: 'dark',
    primaryFields: primary,
    secondaryFields: secondary,
    backFields: back,
  };
  // Pro branding: venue's own color and logo
  if (/^#[0-9a-f]{6}$/i.test(tpl.background_color || '')) { body.color = tpl.background_color; delete body.colorPreset; }
  if ((tpl.logo_url || '').startsWith('https://')) body.logoURL = tpl.logo_url;
  if (inst.expires_at && new Date(inst.expires_at) > new Date()) {
    body.expirationDate = new Date(inst.expires_at).toISOString().replace(/\.\d{3}Z$/, 'Z');
  }
  return body;
}

async function call(url: string, method: string, body?: any) {
  const r = await fetch(url, { method, headers: headers(), body: body ? JSON.stringify(body) : undefined });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`WalletWallet ${r.status}: ${data.error || 'request failed'}`);
  return data;
}

export const createPass = (body: any) => call(BASE, 'POST', body);
export const updatePass = (serial: string, body: any) => call(`${BASE}/${serial}`, 'PUT', body);
export const voidPass = (serial: string) => call(`${BASE}/${serial}`, 'DELETE');