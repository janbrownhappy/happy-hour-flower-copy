import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { secrets } from 'base44:runtime';

// Reads rows from the SC license Google Sheet and queues them as import jobs
// with the sheet's own data as prefill, so enrichment only fills what's missing.
const clean = (v) => {
  const s = String(v || '').trim();
  if (!s || /^(none( found)?|n\/?a|null|-)$/i.test(s) || s.includes('...')) return '';
  return s;
};
const title = (s) => s.toLowerCase().replace(/\b([a-z])/g, (m) => m.toUpperCase()).replace(/,?\s+(Llc|Inc|Corp|Co)\.?$/i, '').trim();
const url = (s) => { const c = clean(s); if (!c) return ''; try { return new URL(c.startsWith('http') ? c : `https://${c}`).toString(); } catch { return ''; } };

// Licensed businesses that aren't happy-hour venues — skipped before any paid lookup.
const NOT_A_VENUE = /\b(catering|caterers?|stadium|arena|grocery|groceries|mini ?mart|food ?mart|[a-z]*mart|gas|fuel|petro(leum)?|service station|gas station|conv(enience)?|c[- ]?store|one stop|quick ?stop|mini ?stop|stop ?n ?go|kwik|quik|pantry|food ?lion|ingles|publix|kroger|bi-?lo|aldi|lidl|harris teeter|walgreens|cvs|dollar|pharmacy|drug|tobacco|vape|package store|liquor store|tackle|bait|church|cinema|theat(er|re)|country club|sodexo|aramark|hotel supply|distribut(or|ing)|wholesale|warehouse|sam'?s club|costco|circle k|qt|quiktrip|spinx|exxon|shell|bp|marathon|sunoco|citgo|speedway|murphy)\b/i;

function rowToJob(h, r, market) {
  const g = (name, nth = 0) => { let n = -1; for (let i = 0; i < h.length; i++) if (h[i] === name && ++n === nth) return r[i] || ''; return ''; };
  const name = clean(g('Business Name'));
  if (!name || NOT_A_VENUE.test(name)) return null;
  if (market && g('Market Area') !== market) return null;
  const city = clean(g('City')) || clean(g('City', 1));
  let addr = clean(g('Street Address')) || clean(g('Location Address'));
  addr = addr.replace(/\s+USA$/i, '');
  const zip = clean(g('ZIP Code')) || (addr.match(/(\d{5})(-\d{4})?$/) || [])[1] || '';
  addr = addr.replace(/\s+\d{5}(-\d{4})?$/, '').replace(/\s+SC$/i, '');
  if (city && addr.toUpperCase().endsWith(` ${city.toUpperCase()}`)) addr = addr.slice(0, -city.length - 1);
  const license = clean(g('License Number'));
  const prefill = Object.fromEntries(Object.entries({
    name: title(name), address: title(addr), city: city ? title(city) : '', zip_code: zip, state_code: 'SC',
    website: url(g('Website')), facebook_url: url(g('Facebook')), instagram_url: url(g('Instagram')),
    tiktok_url: url(g('TikTok')), x_url: url(g('X')), youtube_url: url(g('YouTube')),
    venue_key: license ? `sc-abl-${license}` : '',
  }).filter(([, v]) => v));
  return { prefill, source_key: prefill.venue_key || '', url: prefill.website || '' };
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    const owners = [secrets.get('ADMIN_EMAIL'), 'jan.brown@happyhourflower.com'].filter(Boolean).map((e) => e.toLowerCase());
    if (!user || !(user.role === 'admin' || owners.includes(user.email.toLowerCase()))) return Response.json({ error: 'Forbidden' }, { status: 403 });

    const { sheet_id, tab = 'All Licenses', start_row = 2, count = 50, publish = false, market = '' } = await req.json();
    const { accessToken } = await base44.asServiceRole.connectors.getConnection('googlesheets');
    const get = async (range) => {
      const r = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheet_id}/values/${encodeURIComponent(`'${tab}'!${range}`)}`, { headers: { Authorization: `Bearer ${accessToken}` } });
      if (!r.ok) throw new Error(`Sheet read failed: ${await r.text()}`);
      return (await r.json()).values || [];
    };
    const [header] = await get('A1:AZ1');
    // A market queues every row in that market; otherwise the given row range.
    const rows = await get(market ? 'A2:AZ20000' : `A${start_row}:AZ${start_row + count - 1}`);
    const batch_label = market ? `Market: ${market}` : `Sheet rows ${start_row}-${start_row + rows.length - 1}`;
    const inScope = market ? rows.filter((r) => header.indexOf('Market Area') >= 0 && r[header.indexOf('Market Area')] === market) : rows;
    const jobs = inScope.map((r) => rowToJob(header, r, market)).filter(Boolean)
      .map((j) => ({ ...j, publish, status: 'queued', attempts: 0, batch_label }));
    for (let i = 0; i < jobs.length; i += 500) await base44.asServiceRole.entities.WebsiteImportJob.bulkCreate(jobs.slice(i, i + 500));
    return Response.json({ queued: jobs.length, excluded: inScope.length - jobs.length, batch_label, next_start_row: market ? null : start_row + rows.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}