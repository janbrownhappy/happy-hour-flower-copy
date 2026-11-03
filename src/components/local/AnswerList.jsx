import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Loader2, Flag } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import BlockUserButton from '@/components/BlockUserButton';
import useBlockedUsers from '@/hooks/useBlockedUsers';

// Loads and displays the answers for one question, with an inline reply box.
export default function AnswerList({ question, user, onAnswered }) {
  const [answers, setAnswers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState('');
  const [posting, setPosting] = useState(false);
  const blocked = useBlockedUsers();

  const load = () => {
    base44.entities.LocalAnswer.filter({ question_id: question.id }, 'created_date')
      .then(list => setAnswers(list.filter(a => !a.is_hidden)))
      .catch(() => setAnswers([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [question.id]);

  const handleReply = async () => {
    const trimmed = reply.trim();
    if (!trimmed || posting) return;

    // Optimistically render the reply immediately with a temporary record.
    const tempId = `temp-${Date.now()}`;
    const optimistic = {
      id: tempId,
      question_id: question.id,
      text: trimmed,
      author_name: user?.full_name || 'Anonymous',
      created_date: new Date().toISOString(),
    };
    setAnswers(prev => [...prev, optimistic]);
    setReply('');
    setPosting(true);
    try {
      await base44.entities.LocalAnswer.create({
        question_id: question.id,
        text: trimmed,
        author_name: user?.full_name || 'Anonymous',
      });
      await base44.entities.LocalQuestion.update(question.id, {
        answer_count: (question.answer_count || 0) + 1,
      });
      load(); // reconcile the temp record with the persisted list
      onAnswered?.();
    } catch {
      // Remove the optimistic reply if it failed to persist.
      setAnswers(prev => prev.filter(a => a.id !== tempId));
    } finally {
      setPosting(false);
    }
  };

  const handleReport = async (answer) => {
    await base44.entities.LocalPostReport.create({
      post_type: 'answer',
      post_id: answer.id,
      post_text: answer.text,
      reporter_name: user?.full_name || 'Anonymous',
    });
    alert('Thanks — this answer has been reported to our team.');
  };

  return (
    <div className="mt-3 pt-3 border-t border-border space-y-3">
      {loading ? (
        <div className="flex justify-center py-2"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div>
      ) : answers.length === 0 ? (
        <p className="text-xs text-muted-foreground">No answers yet — be the first to help out.</p>
      ) : (
        answers.filter(a => !blocked.has(a.created_by_id)).map(a => (
          <div key={a.id} className="bg-muted/50 rounded-lg p-3">
            <p className="text-sm text-foreground whitespace-pre-wrap">{a.text}</p>
            <div className="flex items-center justify-between mt-1.5">
              <span className="text-xs text-muted-foreground">
                {a.author_name || 'Anonymous'} · {formatDistanceToNow(new Date(a.created_date), { addSuffix: true })}
              </span>
              <button onClick={() => handleReport(a)} className="text-muted-foreground hover:text-destructive" aria-label="Report answer">
                <Flag className="w-3.5 h-3.5" />
              </button>
              <BlockUserButton authorId={a.created_by_id} authorName={a.author_name} currentUser={user} />
            </div>
          </div>
        ))
      )}

      <div className="flex gap-2">
        <Input
          value={reply}
          onChange={e => setReply(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleReply(); }}
          placeholder="Write an answer…"
          maxLength={500}
        />
        <Button size="icon" onClick={handleReply} disabled={!reply.trim() || posting}>
          {posting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </Button>
      </div>
    </div>
  );
}