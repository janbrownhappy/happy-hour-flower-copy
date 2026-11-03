// Escape a value before interpolating it into HTML (emails, etc.).
export function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Return the URL only when it is a plain http(s) link, otherwise ''.
export function safeHttpUrl(value) {
  const s = String(value ?? '').trim();
  return /^https?:\/\//i.test(s) ? s : '';
}