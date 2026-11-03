import { AlertTriangle } from 'lucide-react';
import sanitizeHtml from '@/lib/sanitizeHtml';

// Wraps each flagged passage found in the article body with a highlight mark.
function highlight(html, issues) {
  let out = html || '';
  (issues || []).forEach((issue) => {
    const snippet = (issue || '').trim();
    if (!snippet) return;
    const idx = out.indexOf(snippet);
    if (idx === -1) return;
    out =
      out.slice(0, idx) +
      `<mark class="bg-amber-200 text-amber-950 rounded px-0.5">${snippet}</mark>` +
      out.slice(idx + snippet.length);
  });
  return out;
}

export default function BlogRenderedReview({ html, issues }) {
  const flagged = (issues || []).filter(Boolean);

  return (
    <div className="space-y-3">
      {flagged.length > 0 && (
        <div className="flex items-start gap-2 text-sm bg-destructive/5 border border-destructive/20 rounded-lg p-3">
          <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
          <p className="text-foreground">
            {flagged.length} unverified contact detail{flagged.length === 1 ? '' : 's'} highlighted
            below. Switch to the HTML tab to correct them.
          </p>
        </div>
      )}
      <div
        className="prose prose-sm max-w-none allow-select bg-card border border-border rounded-xl p-4"
        dangerouslySetInnerHTML={{ __html: sanitizeHtml(highlight(html, flagged)) }}
      />
    </div>
  );
}