import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sparkles, Loader2, Wand2, CheckCircle2 } from 'lucide-react';
import BlogTopicCard from '@/components/admin/blog/BlogTopicCard';

export default function BlogTopicSuggester({ onGenerated }) {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [generatingTopic, setGeneratingTopic] = useState(null);
  const [done, setDone] = useState([]);
  const [manual, setManual] = useState('');
  const [error, setError] = useState('');

  const suggest = async () => {
    setLoading(true);
    setError('');
    const res = await base44.functions.invoke('suggestBlogTopics', { count: 6 });
    if (res.data?.error) setError(res.data.error);
    setSuggestions(res.data?.suggestions || []);
    setLoading(false);
  };

  const generate = async (topic, angle) => {
    setGeneratingTopic(topic);
    setError('');
    const res = await base44.functions.invoke('generateBlogArticle', { topic, angle });
    if (res.data?.error) {
      setError(res.data.error);
    } else {
      setDone((d) => [...d, topic]);
      onGenerated?.();
    }
    setGeneratingTopic(null);
  };

  const generateManual = async () => {
    const topic = manual.trim();
    if (!topic) return;
    await generate(topic, '');
    setManual('');
  };

  return (
    <div className="space-y-4">
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Sparkles className="w-4.5 h-4.5 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="font-heading font-bold">AI topic suggestions</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Grounded in your live venues, markets and current local search interest. Pick one and a
              full SEO/AEO draft is written for your review.
            </p>
          </div>
        </div>

        <Button onClick={suggest} disabled={loading} className="mt-4">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          {loading ? 'Thinking...' : suggestions.length ? 'Suggest more topics' : 'Suggest topics'}
        </Button>

        <div className="mt-5 pt-5 border-t border-border">
          <p className="text-sm font-medium mb-2">Or write about your own topic</p>
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              value={manual}
              onChange={(e) => setManual(e.target.value)}
              placeholder="e.g. Best rooftop happy hours in Greenville"
            />
            <Button
              variant="outline"
              onClick={generateManual}
              disabled={!manual.trim() || !!generatingTopic}
            >
              {generatingTopic === manual.trim() ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Wand2 className="w-4 h-4" />
              )}
              Generate draft
            </Button>
          </div>
        </div>

        {error && <p className="text-sm text-destructive mt-4">{error}</p>}
      </div>

      {loading && (
        <div className="grid gap-3 sm:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-36 bg-muted rounded-xl animate-pulse" />
          ))}
        </div>
      )}

      {!loading && suggestions.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {suggestions.map((s, i) => (
            <BlogTopicCard
              key={`${s.topic}-${i}`}
              suggestion={s}
              generating={generatingTopic === s.topic}
              disabled={!!generatingTopic}
              generated={done.includes(s.topic)}
              onGenerate={() => generate(s.topic, s.angle)}
            />
          ))}
        </div>
      )}

      {done.length > 0 && (
        <p className="text-sm text-green-700 inline-flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          {done.length} draft{done.length === 1 ? '' : 's'} created — review them in the Articles tab.
        </p>
      )}
    </div>
  );
}