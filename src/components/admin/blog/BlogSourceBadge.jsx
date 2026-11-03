import { Badge } from '@/components/ui/badge';
import { Sparkles, AlertTriangle } from 'lucide-react';

export default function BlogSourceBadge({ article }) {
  if (article.source === 'wordpress') {
    return (
      <>
        <Badge variant="outline" className="text-xs text-sky-700 border-sky-300">WordPress</Badge>
        {['flagged', 'error'].includes(article.wordpress_sync_status) && (
          <Badge variant="outline" className="text-xs text-amber-700 border-amber-300" title={article.wordpress_sync_note}>
            <AlertTriangle className="w-3 h-3 mr-1" />
            {article.wordpress_sync_status === 'flagged' ? 'Needs review' : 'Sync error'}
          </Badge>
        )}
      </>
    );
  }
  if (article.source === 'wix' || article.external_post_id) {
    return <Badge variant="outline" className="text-xs">Imported</Badge>;
  }
  return (
    <Badge variant="outline" className="text-xs text-violet-700 border-violet-300">
      <Sparkles className="w-3 h-3 mr-1" /> AI draft
    </Badge>
  );
}