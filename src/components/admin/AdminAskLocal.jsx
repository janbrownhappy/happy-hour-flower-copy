import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MessagesSquare, Flag, EyeOff, Eye, Trash2, Check, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import AskLocalAnswers from '@/components/admin/AskLocalAnswers';

// Admin moderation for the "Ask a Local" community feed: review reports, hide/show
// or delete questions and answers.
export default function AdminAskLocal() {
  const [reports, setReports] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);

  const load = () => {
    setLoading(true);
    Promise.all([
      base44.entities.LocalPostReport.list('-created_date', 200).catch(() => []),
      base44.entities.LocalQuestion.list('-created_date', 500).catch(() => []),
    ]).then(([r, q]) => {
      setReports(r);
      setQuestions(q);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const resolveReport = async (report) => {
    setBusy(report.id);
    await base44.entities.LocalPostReport.update(report.id, { status: 'resolved' });
    setBusy(null);
    load();
  };

  const toggleHideQuestion = async (q) => {
    setBusy(q.id);
    await base44.entities.LocalQuestion.update(q.id, { is_hidden: !q.is_hidden });
    setBusy(null);
    load();
  };

  const deleteQuestion = async (q) => {
    if (!confirm('Delete this question permanently? Its answers will remain but be orphaned.')) return;
    setBusy(q.id);
    await base44.entities.LocalQuestion.delete(q.id);
    setBusy(null);
    load();
  };

  const openReports = reports.filter(r => r.status === 'open');

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-7 h-7 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-heading font-bold flex items-center gap-2">
          <MessagesSquare className="w-5 h-5 text-primary" /> Ask a Local
        </h2>
        <p className="text-sm text-muted-foreground">Moderate the community Q&A feed and review reported posts.</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-2xl font-bold leading-none">{questions.length}</p>
          <p className="text-xs text-muted-foreground mt-1">Questions</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-2xl font-bold leading-none flex items-center gap-1.5"><Flag className="w-4 h-4 text-red-500" />{openReports.length}</p>
          <p className="text-xs text-muted-foreground mt-1">Open Reports</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-2xl font-bold leading-none flex items-center gap-1.5"><EyeOff className="w-4 h-4 text-amber-500" />{questions.filter(q => q.is_hidden).length}</p>
          <p className="text-xs text-muted-foreground mt-1">Hidden</p>
        </div>
      </div>

      {/* Open reports */}
      <div className="space-y-3">
        <h3 className="font-heading font-bold text-sm">Reported Posts ({openReports.length})</h3>
        {openReports.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-6 text-center text-sm text-muted-foreground">
            No open reports — the feed is clean.
          </div>
        ) : (
          openReports.map(r => (
            <div key={r.id} className="bg-card border border-red-200 rounded-xl p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Badge variant="secondary" className="capitalize mb-1.5">{r.post_type}</Badge>
                  <p className="text-sm text-foreground whitespace-pre-wrap">"{r.post_text}"</p>
                  <p className="text-xs text-muted-foreground mt-1.5">
                    Reported by {r.reporter_name || 'Anonymous'} · {formatDistanceToNow(new Date(r.created_date), { addSuffix: true })}
                  </p>
                </div>
                <Button size="sm" variant="outline" disabled={busy === r.id} onClick={() => resolveReport(r)} className="shrink-0 gap-1.5">
                  {busy === r.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  Resolve
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* All questions */}
      <div className="space-y-3">
        <h3 className="font-heading font-bold text-sm">All Questions ({questions.length})</h3>
        {questions.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-6 text-center text-sm text-muted-foreground">
            No questions posted yet.
          </div>
        ) : (
          questions.map(q => (
            <div key={q.id} className={`bg-card border rounded-xl p-4 ${q.is_hidden ? 'border-amber-300 opacity-70' : 'border-border'}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm text-foreground whitespace-pre-wrap">{q.text}</p>
                  <p className="text-xs text-muted-foreground mt-1.5">
                    {q.author_name || 'Anonymous'} · {q.answer_count || 0} answers
                    {q.venue_name ? ` · ${q.venue_name}` : ''}
                    {q.is_hidden ? ' · Hidden' : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button size="sm" variant="outline" disabled={busy === q.id} onClick={() => toggleHideQuestion(q)} className="gap-1.5">
                    {q.is_hidden ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    {q.is_hidden ? 'Show' : 'Hide'}
                  </Button>
                  <Button size="sm" variant="ghost" disabled={busy === q.id} onClick={() => deleteQuestion(q)} className="text-destructive hover:text-destructive">
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
              {(q.answer_count || 0) > 0 && <AskLocalAnswers questionId={q.id} answerCount={q.answer_count} />}
            </div>
          ))
        )}
      </div>
    </div>
  );
}