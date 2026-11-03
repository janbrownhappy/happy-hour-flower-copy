// Blocks javascript:, data: and other non-web links in user/venue-supplied URLs.
export default function safeUrl(value) {
  const s = String(value || '').trim();
  if (!s) return undefined;
  const scheme = s.replace(/[\u0000-\u001F\s]+/g, '').match(/^([a-z][a-z0-9+.-]*):/i);
  if (!scheme) return s;
  return ['http', 'https', 'mailto', 'tel'].includes(scheme[1].toLowerCase()) ? s : undefined;
}