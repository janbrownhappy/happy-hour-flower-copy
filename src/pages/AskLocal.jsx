import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { MessagesSquare, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import AskQuestionForm from '@/components/local/AskQuestionForm';
import QuestionCard from '@/components/local/QuestionCard';
import PullToRefresh from '@/components/PullToRefresh';
import useBlockedUsers from '@/hooks/useBlockedUsers';

const PAGE_SIZE = 20;

// "Ask a Local" — a free-for-all, text-only community Q&A feed that lives in the app.
export default function AskLocal() {
  const [user, setUser] = useState(null);
  const [allQuestions, setQuestions] = useState([]);
  const blocked = useBlockedUsers();
  const questions = allQuestions.filter(q => !blocked.has(q.created_by_id));
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  const load = () => {
    base44.entities.LocalQuestion.list('-created_date', 500)
      .then(list => setQuestions(list.filter(q => !q.is_hidden)))
      .catch(() => setQuestions([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
    load();
  }, []);

  const totalPages = Math.max(1, Math.ceil(questions.length / PAGE_SIZE));
  const start = (page - 1) * PAGE_SIZE;
  const pageItems = questions.slice(start, start + PAGE_SIZE);

  return (
    <PullToRefresh onRefresh={async () => { setLoading(true); load(); }}>
    <div className="max-w-2xl mx-auto px-4 py-5 space-y-5">
      <div className="flex items-center gap-2">
        <MessagesSquare className="w-6 h-6 text-primary" />
        <div>
          <h1 className="text-2xl font-heading font-bold">Ask a Local</h1>
          <p className="text-sm text-muted-foreground">
            {questions.length} {questions.length === 1 ? 'question' : 'questions'} from the neighborhood
          </p>
        </div>
      </div>

      <AskQuestionForm user={user} onPosted={() => { setPage(1); load(); }} />

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : questions.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-10 text-center">
          <MessagesSquare className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">No questions yet. Be the first to ask the neighborhood!</p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {pageItems.map(q => (
              <QuestionCard key={q.id} question={q} user={user} />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 pt-2">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
                <ChevronLeft className="w-4 h-4" /> Prev
              </Button>
              <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
              <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>
                Next <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
    </PullToRefresh>
  );
}