// Shared footer appended to every consumer-facing email.
// Adds the two required web links so they appear consistently across all consumer emails.

export const CONSUMER_SITE_URL = 'https://happyhourflower.com/';
export const CONSUMER_APP_URL = 'https://happyhourflower.com';

// HTML footer block for rich (Resend / template) emails.
export const consumerEmailFooterHtml = `
  <div style="margin-top:20px;padding-top:14px;border-top:1px solid #eee;font-family:Arial,sans-serif;font-size:13px;color:#888;">
    <p style="margin:0 0 6px;">
      <a href="${CONSUMER_SITE_URL}" style="color:#f59e0b;text-decoration:none;">${CONSUMER_SITE_URL}</a>
      &nbsp;·&nbsp;
      <a href="${CONSUMER_APP_URL}" style="color:#f59e0b;text-decoration:none;">${CONSUMER_APP_URL}</a>
    </p>
  </div>
`;

// Plain-text footer for text-body emails (SendEmail integration).
export const consumerEmailFooterText = `\n\n${CONSUMER_SITE_URL}\n${CONSUMER_APP_URL}`;

// Appends the HTML footer to a full HTML email body.
export function withConsumerFooterHtml(html: string): string {
  return `${html}${consumerEmailFooterHtml}`;
}

// Appends the plain-text footer to a text email body.
export function withConsumerFooterText(text: string): string {
  return `${text}${consumerEmailFooterText}`;
}