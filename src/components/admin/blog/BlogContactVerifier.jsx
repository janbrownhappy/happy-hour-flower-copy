import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, Loader2, Check } from 'lucide-react';

const VERDICT_STYLES = {
  correct: 'bg-green-100 text-green-800 border-green-200',
  incorrect: 'bg-destructive/10 text-destructive border-destructive/20',
  unverifiable: 'bg-amber-100 text-amber-800 border-amber-200',
};

export default function BlogContactVerifier({ articleId, onApplyCorrection }) {
  const [running, setRunning] = useState(false);
  const [findings, setFindings] = useState(null);
  const [error, setError] = useState('');
  const [applied, setApplied] = useState([]);

  const [failed, setFailed] = useState([]);

  // Rebuild the flagged block with the corrected wording, keeping its original tag
  // (<p>, <li>, <h2>...) so the article markup stays intact.
  const rebuild = (blockHtml, text) => {
    const m = blockHtml.match(/^\s*<([a-z0-9]+)([^>]*)>/i);
    if (!m) return text;
    return `<${m[1]}${m[2]}>${text}</${m[1]}>`;
  };

  const apply = (f, i) => {
    const target = f.original_html;
    if (!target) {
      setFailed((prev) => [...prev, i]);
      return;
    }
    const replaced = onApplyCorrection(target, rebuild(target, f.corrected_text));
    if (replaced === false) setFailed((prev) => [...prev, i]);
    else setApplied((prev) => [...prev, i]);
  };

  const run = async () => {
    setRunning(true);
    setError('');
    try {
      const res = await base44.functions.invoke('verifyBlogArticleContacts', { article_id: articleId });
      setFindings(res?.data?.findings || []);
      setApplied([]);
      setFailed([]);
    } catch (e) {
      setError(e?.message || 'Verification failed. Please try again.');
    }
    setRunning(false);
  };

  return (
    <div className="space-y-3">
      <Button type="button" variant="outline" onClick={run} disabled={running}>
        {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
        {running ? 'Researching contact details...' : 'Verify contact details with AI'}
      </Button>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {findings && findings.length === 0 && (
        <p className="text-sm text-muted-foreground">Nothing left to verify in this article.</p>
      )}

      {findings?.length > 0 && (
        <div className="bg-muted rounded-lg p-3 space-y-2">
          <p className="text-sm">
            Nothing has changed in the article yet — reviewing only. Apply a correction to write it
            into the body, then press <span className="font-semibold">Save changes</span> to keep it.
          </p>
          <p className="text-xs text-muted-foreground">
            {applied.length} of {findings.filter((f) => f.verdict !== 'correct' && f.corrected_text).length} corrections applied
          </p>
          <Button
            type="button"
            size="sm"
            onClick={() =>
              findings.forEach((f, i) => {
                if (f.verdict !== 'correct' && f.corrected_text && !applied.includes(i)) apply(f, i);
              })
            }
          >
            Apply all corrections
          </Button>
        </div>
      )}

      {findings?.map((f, i) => (
        <div key={i} className="bg-card border border-border rounded-lg p-3 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className={`${VERDICT_STYLES[f.verdict] || ''} hover:bg-inherit`}>{f.verdict}</Badge>
            {f.business_name && <span className="text-sm font-semibold">{f.business_name}</span>}
          </div>
          <p className="text-xs text-muted-foreground">{f.original}…</p>
          {(f.verified_address || f.verified_phone || f.verified_website) && (
            <p className="text-sm">
              {[f.verified_address, f.verified_phone, f.verified_website].filter(Boolean).join(' · ')}
            </p>
          )}
          {f.notes && <p className="text-xs text-muted-foreground">{f.notes}</p>}
          {f.source && <p className="text-xs text-muted-foreground">Source: {f.source}</p>}
          {f.verdict !== 'correct' && f.corrected_text && (
            <>
              <p className="text-sm bg-muted rounded-md p-2">{f.corrected_text}</p>
              {applied.includes(i) ? (
                <p className="text-xs text-green-700 flex items-center gap-1">
                  <Check className="w-3 h-3" /> Applied to the article — save to keep it
                </p>
              ) : failed.includes(i) ? (
                <p className="text-xs text-destructive">
                  Couldn't locate this passage automatically — edit it on the HTML tab.
                </p>
              ) : (
                <Button size="sm" variant="outline" onClick={() => apply(f, i)}>
                  Apply correction
                </Button>
              )}
            </>
          )}
        </div>
      ))}
    </div>
  );
}