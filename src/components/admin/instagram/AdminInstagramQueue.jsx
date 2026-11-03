import { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Loader2, Instagram } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import InstagramQueueRow from './InstagramQueueRow';

const TABS = [['pending', 'Pending'], ['failed', 'Failed'], ['posted', 'Posted'], ['skipped', 'Skipped']];
const PAGE = 20;

export default function AdminInstagramQueue() {
  const { toast } = useToast();
  const [tab, setTab] = useState('pending');
  const [counts, setCounts] = useState({});
  const [items, setItems] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async (next) => {
    setLoading(true);
    const P = base44.entities.InstagramPost;
    const [page, ...nums] = await Promise.all([
      P.filter({ status: tab }, { sort: tab === 'pending' ? 'queued_at' : '-reviewed_at', limit: PAGE, ...(next ? { cursor: next } : {}) }),
      ...TABS.map(([s]) => P.count({ status: s })),
    ]);
    setCounts(Object.fromEntries(TABS.map(([s], i) => [s, nums[i]])));
    setItems((prev) => (next ? [...prev, ...page.items] : page.items));
    setCursor(page.has_more ? page.next_cursor : null);
    setLoading(false);
  }, [tab]);

  useEffect(() => { load(); }, [load]);

  const decide = async (post, action) => {
    setBusyId(post.id);
    const res = await base44.functions.invoke('postVenueToInstagram', { action, post_id: post.id })
      .then((r) => r.data).catch((e) => ({ error: e?.response?.data?.error || e.message }));
    setBusyId(null);
    if (res.error) toast({ title: 'Could not complete', description: res.error, variant: 'destructive' });
    else toast({ title: action === 'approve' ? `${post.venue_name} posted to Instagram` : `${post.venue_name} skipped` });
    load();
  };

  return (
    <div className="max-w-4xl space-y-5">
      <div>
        <h2 className="text-xl font-semibold flex items-center gap-2"><Instagram className="w-5 h-5" /> Instagram Review Queue</h2>
        <p className="text-sm text-muted-foreground">New imported venues wait here. Approve to post right away, or skip to never post.</p>
      </div>
      <div className="flex gap-2 flex-wrap select-none">
        {TABS.map(([s, label]) => (
          <Button key={s} size="sm" variant={tab === s ? 'default' : 'outline'} onClick={() => setTab(s)}>
            {label} ({counts[s] ?? '…'})
          </Button>
        ))}
      </div>
      {loading && !items.length ? (
        <div className="py-16 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : !items.length ? (
        <p className="py-16 text-center text-muted-foreground">Nothing {tab} right now.</p>
      ) : (
        <div className="space-y-3">
          {items.map((p) => <InstagramQueueRow key={p.id} post={p} busy={busyId === p.id} onDecide={decide} />)}
          {cursor && <Button variant="outline" disabled={loading} onClick={() => load(cursor)} className="w-full">{loading ? 'Loading…' : 'Load more'}</Button>}
        </div>
      )}
    </div>
  );
}