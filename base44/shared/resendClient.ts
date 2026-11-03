import { Resend } from 'npm:resend';

// Single source of truth for every outbound Resend email.
export const EMAIL_FROM = 'Happy Hour Flower <happy@updates.happyhourflower.com>';
export const EMAIL_REPLY_TO = 'jan.brown@happyhourflower.com';

// Removes emoji / pictographs from a subject line and tidies the spacing.
export const stripEmoji = (s: string) => String(s || '')
  .replace(/[\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}\u{FE0F}\u{200D}\u{20E3}]/gu, '')
  .replace(/\s{2,}/g, ' ')
  .trim();

// Points any old app hosts at happyhourflower.com.
const fixLinks = (html: string) => html
  .replace(/https?:\/\/(happyhourflower\.base44\.app|app\.happyhourflower\.com|www\.happyhourflower\.com)/gi, 'https://happyhourflower.com');

// Plain-text version of the HTML with links written out as full URLs.
export const htmlToText = (html: string) => html
  .replace(/<(style|script|head)[\s\S]*?<\/\1>/gi, '')
  .replace(/<a [^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, (_m, href, label) => {
    const t = label.replace(/<[^>]+>/g, '').trim();
    return t && t !== href ? `${t} (${href})` : href;
  })
  .replace(/<br\s*\/?>/gi, '\n')
  .replace(/<\/(p|div|h[1-6]|li|tr|table)>/gi, '\n')
  .replace(/<[^>]+>/g, '')
  .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&#39;|&rsquo;|&lsquo;/g, "'").replace(/&quot;|&ldquo;|&rdquo;/g, '"').replace(/&mdash;/g, '—').replace(/&middot;/g, '·')
  .replace(/[ \t]+/g, ' ')
  .replace(/\n[ \t]+/g, '\n')
  .replace(/\n{3,}/g, '\n\n')
  .trim();

// Drop-in replacement for `new Resend(key)` that enforces sender, reply-to,
// emoji-free subject, happyhourflower.com links and a plain-text part.
export function createResend(apiKey?: string) {
  const resend = new Resend(apiKey);
  const send = resend.emails.send.bind(resend.emails);
  resend.emails.send = ((payload: any, opts?: any) => {
    const html = payload.html ? fixLinks(payload.html) : payload.html;
    const { replyTo: _r, reply_to: _r2, ...rest } = payload;
    return send({
      ...rest,
      from: EMAIL_FROM,
      replyTo: EMAIL_REPLY_TO,
      subject: stripEmoji(payload.subject),
      ...(html ? { html, text: htmlToText(html) } : {}),
    }, opts);
  }) as any;
  return resend;
}