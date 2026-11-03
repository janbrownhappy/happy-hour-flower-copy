// Shared helpers for the public blog pages and the admin blog manager.

export function stripHtml(html) {
  if (!html) return '';
  return String(html).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

// Rough read-time estimate at 200 words per minute.
export function readTimeMinutes(html) {
  const words = stripHtml(html).split(' ').filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

export function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

// Detect Q&A pairs in the body so we can emit FAQPage structured data for AI answer engines.
// A heading that ends in a question mark, followed by content, counts as an FAQ entry.
export function extractFaqs(html) {
  if (!html) return [];
  const faqs = [];
  const re = /<h[2-4][^>]*>(.*?)<\/h[2-4]>([\s\S]*?)(?=<h[2-4][^>]*>|$)/gi;
  let match;
  while ((match = re.exec(html)) !== null) {
    const question = stripHtml(match[1]);
    const answer = stripHtml(match[2]);
    if (question.endsWith('?') && answer.length > 20) {
      faqs.push({ question, answer: answer.slice(0, 1200) });
    }
  }
  return faqs;
}

export function articleUrl(slug) {
  return `https://happyhourflower.com/blog/${slug}`;
}