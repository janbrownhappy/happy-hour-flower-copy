import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, MapPin, Flag } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import AnswerList from './AnswerList';
import BlockUserButton from '@/components/BlockUserButton';

// A single question in the feed with an expandable answers thread.
export default function QuestionCard({ question, user }) {
  const [expanded, setExpanded] = useState(false);
  const [answerCount, setAnswerCount] = useState(question.answer_count || 0);

  const handleReport = async () => {
    await base44.entities.LocalPostReport.create({
      post_type: 'question',
      post_id: question.id,
      post_text: question.text,
      reporter_name: user?.full_name || 'Anonymous',
    });
    alert('Thanks — this question has been reported to our team.');
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
      <p className="text-foreground whitespace-pre-wrap">{question.text}</p>

      {question.venue_name && (
        <Link to={`/venue/${question.venue_id}`}>
          <Badge variant="secondary" className="mt-2 gap-1">
            <MapPin className="w-3 h-3" /> {question.venue_name}
          </Badge>
        </Link>
      )}

      <div className="flex items-center justify-between mt-3">
        <span className="text-xs text-muted-foreground">
          {question.author_name || 'Anonymous'} · {formatDistanceToNow(new Date(question.created_date), { addSuffix: true })}
        </span>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setExpanded(v => !v)}
            className="flex items-center gap-1 text-xs font-medium text-primary hover:underline tap-target"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            {answerCount} {answerCount === 1 ? 'answer' : 'answers'}
          </button>
          <button onClick={handleReport} className="text-muted-foreground hover:text-destructive" aria-label="Report question">
            <Flag className="w-3.5 h-3.5" />
          </button>
          <BlockUserButton authorId={question.created_by_id} authorName={question.author_name} currentUser={user} />
        </div>
      </div>

      {expanded && (
        <AnswerList
          question={question}
          user={user}
          onAnswered={() => setAnswerCount(c => c + 1)}
        />
      )}
    </div>
  );
}