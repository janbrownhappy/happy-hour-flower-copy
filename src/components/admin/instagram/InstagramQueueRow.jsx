import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Check, X, ExternalLink } from 'lucide-react';

const STATUS = {
  pending: 'bg-amber-100 text-amber-800',
  publishing: 'bg-blue-100 text-blue-800',
  posted: 'bg-emerald-100 text-emerald-800',
  skipped: 'bg-stone-100 text-stone-600',
  failed: 'bg-red-100 text-red-700',
};

export default function InstagramQueueRow({ post, busy, onDecide }) {
  const canAct = post.status === 'pending' || post.status === 'failed';
  return (
    <div className="flex flex-col sm:flex-row gap-4 p-4 border rounded-xl bg-card">
      {post.image_url
        ? <img src={post.image_url} alt={post.venue_name} className="w-full sm:w-32 h-32 object-cover rounded-lg flex-shrink-0" />
        : <div className="w-full sm:w-32 h-32 rounded-lg bg-muted flex items-center justify-center text-xs text-muted-foreground flex-shrink-0">No photo</div>}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="font-semibold">{post.venue_name}</h3>
          <Badge className={`${STATUS[post.status]} border-0 capitalize`}>{post.status}</Badge>
          <a href={`/venue/${post.venue_id}`} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground"><ExternalLink className="w-4 h-4" /></a>
        </div>
        {post.venue_city && <p className="text-sm text-muted-foreground">{post.venue_city}</p>}
        <p className="mt-2 text-sm whitespace-pre-line line-clamp-6">{post.caption}</p>
        {post.error && <p className="mt-2 text-sm text-red-600">{post.error}</p>}
        {post.reviewed_by && <p className="mt-2 text-xs text-muted-foreground">Reviewed {new Date(post.reviewed_at).toLocaleString()}</p>}
      </div>
      {canAct && (
        <div className="flex sm:flex-col gap-2 sm:w-36 flex-shrink-0 select-none">
          <Button disabled={busy} onClick={() => onDecide(post, 'approve')} className="flex-1 sm:flex-none min-h-[44px]">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4 mr-1" />}
            {busy ? 'Posting' : post.status === 'failed' ? 'Retry' : 'Approve & post'}
          </Button>
          <Button disabled={busy} variant="outline" onClick={() => onDecide(post, 'skip')} className="flex-1 sm:flex-none min-h-[44px]">
            <X className="w-4 h-4 mr-1" /> Skip
          </Button>
        </div>
      )}
    </div>
  );
}