// Programmatic fact-check for AI-generated blog HTML.
// Rule: any block (paragraph / list item / heading) that states a phone number,
// website URL, or street address must state it for the SAME venue our database
// has it on. If the detail belongs to a different venue — or to no venue we can
// identify — the whole block is removed. Prompt rules are advisory; this is enforcement.

const PHONE_RE = /(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/g;
const URL_RE = /https?:\/\/[^\s"'<>)]+/gi;
// "40 W Broad St", "601 S Main Street", "18 N Main Ave" ...
const ADDRESS_RE =
  /\b\d{1,6}\s+(?:[A-Za-z0-9.'-]+\s+){0,4}(?:St|Street|Ave|Avenue|Rd|Road|Blvd|Boulevard|Dr|Drive|Ln|Lane|Way|Pl|Place|Ct|Court|Hwy|Highway|Pkwy|Parkway|Sq|Square|Ter|Trail|Trl)\b\.?/gi;

const BRAND_HOSTS = ['happyhourflower.com'];

const digits = (s) => String(s || '').replace(/\D/g, '').slice(-10);

const host = (u) => {
  const m = String(u || '').match(/^https?:\/\/([^/?#]+)/i);
  return m ? m[1].toLowerCase().replace(/^www\./, '') : '';
};

const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

function splitBlocks(html) {
  // Keep each closing block tag with its block so re-joining preserves the markup.
  return String(html || '').split(/(?<=<\/(?:p|li|h2|h3|ul|ol)>)/i).filter((b) => b.trim());
}

function textOf(block) {
  return block.replace(/<[^>]+>/g, ' ');
}

/**
 * @param {string} html generated body HTML
 * @param {Array} venues verified venue records ({ name, address, phone, website })
 * @returns {{ html: string, removed: string[] }}
 */
export function sanitizeArticleHtml(html, venues = []) {
  const records = venues
    .filter((v) => v?.name)
    .map((v) => ({
      name: v.name,
      nameNorm: norm(v.name),
      phone: digits(v.phone),
      host: host(v.website),
      address: norm(v.address),
    }));

  const removed = [];
  // The raw HTML of each removed block, index-aligned with `removed`, so callers
  // can locate and rewrite the exact markup in the article body.
  const removedBlocks = [];

  const kept = splitBlocks(html).filter((block) => {
    const text = textOf(block);
    const textNorm = norm(text);

    const phones = (text.match(PHONE_RE) || []).map(digits).filter(Boolean);
    const urls = (block.match(URL_RE) || [])
      .map(host)
      .filter((h) => h && !BRAND_HOSTS.includes(h));
    const addresses = (text.match(ADDRESS_RE) || []).map(norm).filter(Boolean);

    if (!phones.length && !urls.length && !addresses.length) return true;

    // Which of our venues are named in this block?
    const named = records.filter((r) => r.nameNorm && textNorm.includes(r.nameNorm));
    if (!named.length) {
      removed.push(text.trim().slice(0, 160));
      removedBlocks.push(block);
      return false;
    }

    const ok =
      phones.every((p) => named.some((r) => r.phone && r.phone === p)) &&
      urls.every((h) => named.some((r) => r.host && r.host === h)) &&
      addresses.every((a) => named.some((r) => r.address && r.address.includes(a)));

    if (!ok) {
      removed.push(text.trim().slice(0, 160));
      removedBlocks.push(block);
    }
    return ok;
  });

  return { html: kept.join(''), removed, removedBlocks };
}