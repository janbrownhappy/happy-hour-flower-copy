import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { EyeOff, Eye, Trash2, Loader2, ChevronDown, ChevronRight } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

// Expandable list of a question's answers with hide/show and delete moderation.
export default function AskLocalAnswers({ questionId, answerCount }) {
  const [expanded, setExpanded] = useState(false);
  const [answers, setAnswers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(null);

  const load = () => {
    setLoading(true);
    base44.entities.LocalAnswer.filter({ question_id: questionId }, '-created_date', 200)
      .then(setAnswers)
      .catch(() => setAnswers([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (expanded && answers.length === 0) load();
  }, [expanded]);

  const toggleHide = async (a) => {
    setBusy(a.id);
    await base44.entities.LocalAnswer.update(a.id, { is_hidden: !a.is_hidden });
    setBusy(null);
    load();
  };

  const remove = async (a) => {
    if (!confirm('Delete this answer permanently?')) return;
    setBusy(a.id);
    await base44.entities.LocalAnswer.delete(a.id);
    setBusy(null);
    load();
  };

  return (
    <div className="mt-3 border-t border-border pt-3">
      <button
        onClick={() => setExpanded(v => !v)}
        className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        {expanded ? 'Hide' : 'Review'} {answerCount || 0} {(answerCount === 1) ? 'answer' : 'answers'}
      </button>

      {expanded && (
        <div className="mt-2 space-y-2 pl-2">
          {loading ? (
            <div className="flex items-center py-3"><Loader2 className="w-4 h-4 animate-spin text-primary" /></div>
          ) : answers.length === 0 ? (
            <p className="text-xs text-muted-foreground py-2">No answers to review.</p>
          ) : (
            answers.map(a => (
              <div key={a.id} className={`rounded-lg border p-3 ${a.is_hidden ? 'border-amber-300 opacity-70' : 'border-border'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm text-foreground whitespace-pre-wrap">{a.text}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {a.author_name || 'Anonymous'} · {formatDistanceToNow(new Date(a.created_date), { addSuffix: true })}
                      {a.is_hidden ? ' · Hidden' : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button size="sm" variant="outline" disabled={busy === a.id} onClick={() => toggleHide(a)} className="gap-1.5">
                      {a.is_hidden ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                      {a.is_hidden ? 'Show' : 'Hide'}
                    </Button>
                    <Button size="sm" variant="ghost" disabled={busy === a.id} onClick={() => remove(a)} className="text-destructive hover:text-destructive">
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}