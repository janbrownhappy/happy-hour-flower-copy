import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Trash2, Sparkles } from 'lucide-react';
import ChangelogFeaturebaseStatus from './ChangelogFeaturebaseStatus';

const CATEGORY_STYLES = {
  feature: 'bg-green-100 text-green-800 border-green-200',
  fix: 'bg-red-100 text-red-800 border-red-200',
  design: 'bg-violet-100 text-violet-800 border-violet-200',
  content: 'bg-blue-100 text-blue-800 border-blue-200',
  backend: 'bg-slate-100 text-slate-800 border-slate-200',
  other: 'bg-amber-100 text-amber-800 border-amber-200',
};

export default function ChangelogDayGroup({ label, entries, onDelete, onPush, pushingId }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <h3 className="font-heading font-semibold text-sm">{label}</h3>
        <span className="text-xs text-muted-foreground">
          {entries.length} change{entries.length === 1 ? '' : 's'}
        </span>
      </div>
      {entries.map((e) => (
        <div
          key={e.id}
          className="bg-card border border-border rounded-xl p-3 flex items-start gap-3"
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className={`${CATEGORY_STYLES[e.category] || CATEGORY_STYLES.other} hover:bg-inherit`}>
                {e.category || 'other'}
              </Badge>
              {e.source === 'auto' && (
                <Badge variant="outline" className="text-xs text-violet-700 border-violet-300">
                  <Sparkles className="w-3 h-3 mr-1" /> auto
                </Badge>
              )}
              <span className="text-xs text-muted-foreground">
                {new Date(e.change_date || e.created_date).toLocaleTimeString([], {
                  hour: 'numeric',
                  minute: '2-digit',
                })}
              </span>
            </div>
            <p className="font-medium text-foreground mt-1.5">{e.title}</p>
            {e.description && (
              <p className="text-sm text-muted-foreground mt-1 whitespace-pre-line">
                {e.description}
              </p>
            )}
            <div className="mt-2">
              <ChangelogFeaturebaseStatus
                entry={e}
                pushing={pushingId === e.id}
                onPush={onPush}
              />
            </div>
          </div>
          <Button
            size="sm"
            variant="ghost"
            className="text-destructive hover:text-destructive"
            onClick={() => onDelete(e)}
            aria-label="Delete entry"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      ))}
    </div>
  );
}