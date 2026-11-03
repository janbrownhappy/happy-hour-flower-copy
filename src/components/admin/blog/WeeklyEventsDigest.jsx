import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { CalendarDays, Loader2, Wand2 } from 'lucide-react';
import EventsDigestResult from '@/components/admin/blog/EventsDigestResult';

export default function WeeklyEventsDigest({ onGenerated }) {
  const [raw, setRaw] = useState('');
  const [author, setAuthor] = useState('Jan Brown');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const generate = async () => {
    setLoading(true);
    setError('');
    setResult(null);
    const res = await base44.functions
      .invoke('generateEventsDigest', { raw_text: raw, author })
      .catch((e) => ({ data: { error: e?.response?.data?.error || e.message } }));
    if (res.data?.error) {
      setError(res.data.error);
    } else {
      setResult(res.data);
      onGenerated?.();
    }
    setLoading(false);
  };

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <CalendarDays className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1">
          <h3 className="font-heading font-bold">Weekly events digest</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Paste this week's food & drink event list. A draft article is built with events grouped by
            day, special events highlighted, and venues linked to their listings.
          </p>
        </div>
      </div>

      <Textarea
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
        placeholder={'Tue 9/22\n- Trivia Tuesday — 13 Stripes Brewery\n- **Oktoberfest at The Landing — Saluda Lake Landing**\n...'}
        className="mt-4 min-h-[200px] font-mono text-xs"
      />
      <div className="flex flex-col sm:flex-row gap-2 mt-3">
        <Input
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
          placeholder="Author"
          className="sm:max-w-[220px]"
        />
        <Button onClick={generate} disabled={!raw.trim() || loading}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
          {loading ? 'Building draft...' : 'Generate digest draft'}
        </Button>
      </div>

      {error && <p className="text-sm text-destructive mt-4">{error}</p>}
      {result && <EventsDigestResult result={result} />}
    </div>
  );
}