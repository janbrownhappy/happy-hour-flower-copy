// Strips scripts, event handlers and unsafe links from article HTML before it is rendered.
const BLOCKED_TAGS = 'script,style,iframe,object,embed,form,input,button,textarea,select,link,meta,base,frame,frameset,svg,math';
const URL_ATTRS = ['href', 'src', 'xlink:href', 'action', 'formaction', 'poster', 'srcset'];

const isSafeUrl = (value) => {
  const v = String(value || '').trim().replace(/[\u0000-\u001F\s]+/g, '').toLowerCase();
  if (!v) return true;
  if (v.startsWith('data:image/') && !v.startsWith('data:image/svg')) return true;
  return !/^(javascript|vbscript|data|file):/.test(v);
};

export default function sanitizeHtml(html) {
  if (!html || typeof window === 'undefined') return '';
  const doc = new DOMParser().parseFromString(String(html), 'text/html');
  doc.body.querySelectorAll(BLOCKED_TAGS).forEach((el) => el.remove());
  doc.body.querySelectorAll('*').forEach((el) => {
    [...el.attributes].forEach((attr) => {
      const name = attr.name.toLowerCase();
      if (name.startsWith('on') || name === 'style' && /expression|url\s*\(/i.test(attr.value)) {
        el.removeAttribute(attr.name);
      } else if (URL_ATTRS.includes(name) && !isSafeUrl(attr.value)) {
        el.removeAttribute(attr.name);
      }
    });
    if (el.tagName === 'A' && el.getAttribute('target') === '_blank') {
      el.setAttribute('rel', 'noopener noreferrer');
    }
  });
  return doc.body.innerHTML;
}