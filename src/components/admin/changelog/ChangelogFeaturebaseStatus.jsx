import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ExternalLink, AlertTriangle, Upload, Loader2 } from 'lucide-react';

export default function ChangelogFeaturebaseStatus({ entry, pushing, onPush }) {
  if (pushing) {
    return (
      <Badge variant="outline" className="text-xs text-muted-foreground">
        <Loader2 className="w-3 h-3 mr-1 animate-spin" /> Pushing...
      </Badge>
    );
  }

  if (entry.featurebase_push_error) {
    return (
      <div className="flex items-center gap-1.5 flex-wrap">
        <Badge variant="outline" className="text-xs text-destructive border-destructive/40">
          <AlertTriangle className="w-3 h-3 mr-1" /> Push failed
        </Badge>
        <span className="text-xs text-destructive">{entry.featurebase_push_error}</span>
        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onPush(entry)}>
          Re-push to Featurebase
        </Button>
      </div>
    );
  }

  if (entry.featurebase_post_id) {
    return entry.featurebase_url ? (
      <a
        href={entry.featurebase_url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center text-xs text-primary hover:underline"
      >
        <Badge variant="outline" className="text-xs text-primary border-primary/30">
          Draft in Featurebase <ExternalLink className="w-3 h-3 ml-1" />
        </Badge>
      </a>
    ) : (
      <Badge variant="outline" className="text-xs text-primary border-primary/30">
        Draft in Featurebase
      </Badge>
    );
  }

  return (
    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onPush(entry)}>
      <Upload className="w-3 h-3 mr-1" /> Push to Featurebase
    </Button>
  );
}