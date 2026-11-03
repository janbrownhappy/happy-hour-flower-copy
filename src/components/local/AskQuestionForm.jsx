import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Send, Loader2 } from 'lucide-react';

// Compose form for posting a new text-only question, with an optional venue tag.
export default function AskQuestionForm({ user, onPosted }) {
  const [text, setText] = useState('');
  const [venueId, setVenueId] = useState('none');
  const [venues, setVenues] = useState([]);
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    base44.entities.Venue.filter({ status: 'active' }, 'name', 200)
      .then(setVenues)
      .catch(() => setVenues([]));
  }, []);

  const handleSubmit = async () => {
    const trimmed = text.trim();
    if (!trimmed || posting) return;
    setPosting(true);
    const venue = venueId !== 'none' ? venues.find(v => v.id === venueId) : null;
    await base44.entities.LocalQuestion.create({
      text: trimmed,
      author_name: user?.full_name || 'Anonymous',
      venue_id: venue?.id || undefined,
      venue_name: venue?.name || undefined,
      answer_count: 0,
    });
    setText('');
    setVenueId('none');
    setPosting(false);
    onPosted?.();
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-4 shadow-sm space-y-3">
      <Textarea
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="Ask the neighborhood… e.g. What's the best patio for a sunset happy hour?"
        rows={3}
        maxLength={500}
        className="resize-none"
      />
      <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
        <Select value={venueId} onValueChange={setVenueId}>
          <SelectTrigger className="flex-1">
            <SelectValue placeholder="Tag a venue (optional)" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No venue tag</SelectItem>
            {venues.map(v => (
              <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={handleSubmit} disabled={!text.trim() || posting} className="sm:w-auto">
          {posting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          Post Question
        </Button>
      </div>
    </div>
  );
}