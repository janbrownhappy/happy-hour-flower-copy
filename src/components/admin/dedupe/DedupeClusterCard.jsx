import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Crown, ChevronDown, ChevronRight, Trash2, MapPin } from 'lucide-react';

export default function DedupeClusterCard({ cluster, checked, onToggle }) {
  const [open, setOpen] = useState(false);
  const mergeFields = Object.keys(cluster.merge_preview || {});

  return (
    <div className="border border-border rounded-xl bg-card p-3 space-y-2">
      <div className="flex items-start gap-3">
        <Checkbox checked={checked} onCheckedChange={onToggle} className="mt-1" />
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <MapPin className="w-3 h-3 shrink-0" />
            <span className="truncate">{cluster.matched_address}{cluster.city ? ` · ${cluster.city}` : ''}</span>
          </p>

          <div className="mt-2 flex items-center gap-2 text-sm">
            <Crown className="w-4 h-4 text-primary shrink-0" />
            <span className="font-semibold truncate">{cluster.survivor.name}</span>
            <Badge variant="secondary" className="shrink-0 text-[10px]">keep · {cluster.survivor.score}</Badge>
          </div>
          <p className="text-xs text-muted-foreground ml-6">
            {cluster.survivor.items} deals · {cluster.survivor.amenities} amenities
          </p>

          {cluster.duplicates.map((d) => (
            <div key={d.id} className="mt-1.5 ml-6">
              <div className="flex items-center gap-2 text-sm">
                <Trash2 className="w-3.5 h-3.5 text-destructive shrink-0" />
                <span className="truncate line-through text-muted-foreground">{d.name}</span>
                <Badge variant="outline" className="shrink-0 text-[10px]">{d.score}</Badge>
              </div>
              <p className="text-xs text-muted-foreground ml-5">
                {d.items} deals · {d.amenities} amenities
              </p>
            </div>
          ))}

          <Button
            variant="ghost"
            size="sm"
            className="mt-1 h-7 px-2 text-xs text-muted-foreground"
            onClick={() => setOpen((o) => !o)}
          >
            {open ? <ChevronDown className="w-3 h-3 mr-1" /> : <ChevronRight className="w-3 h-3 mr-1" />}
            {mergeFields.length ? `${mergeFields.length} fields merge in` : 'Nothing to merge in'}
          </Button>

          {open && (
            <div className="mt-1 rounded-lg bg-muted/50 p-2 space-y-1">
              {mergeFields.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  The surviving record already has everything the duplicates hold. All attached
                  deals, amenities, reviews and favorites still move over before deletion.
                </p>
              ) : (
                mergeFields.map((f) => (
                  <p key={f} className="text-xs">
                    <span className="font-medium">{f}</span>
                    <span className="text-muted-foreground"> → {formatValue(cluster.merge_preview[f])}</span>
                  </p>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function formatValue(v) {
  if (Array.isArray(v)) return `${v.length} item(s)`;
  if (v && typeof v === 'object') return Object.keys(v).join(', ');
  const s = String(v);
  return s.length > 80 ? `${s.slice(0, 80)}…` : s;
}