import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Sparkles } from 'lucide-react';
import { ALL_AMENITIES } from '@/lib/amenities';

const SLUG_LABEL = Object.fromEntries(ALL_AMENITIES.map((a) => [a.slug, a.label]));

// Review panel for the amenities a research run confirmed, plus any new labels it
// proposed. Every row shows the cited source — an amenity with no source never
// reaches here (the backend drops it).
export default function AmenityResearchSuggestions({
  amenities = [],
  proposals = [],
  droppedCount = 0,
  currentAmenities = [],
  selected = {},
  onToggle,
  acceptProposals = true,
  onToggleProposals,
}) {
  const currentSlugs = new Set(currentAmenities.map((a) => a.slug));
  const hasAnything = amenities.length || proposals.length;

  return (
    <div className="space-y-4 border-t border-border pt-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h4 className="text-sm font-semibold flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" /> Amenities
        </h4>
        <span className="text-xs text-muted-foreground">
          {currentAmenities.length} currently tagged
        </span>
      </div>

      {!hasAnything ? (
        <p className="text-xs text-muted-foreground bg-muted/40 rounded-lg p-3">
          No amenities could be confirmed from a source for this venue. That's a valid result —
          nothing will be tagged rather than guessed.
        </p>
      ) : (
        <>
          {amenities.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                Accepting these replaces every amenity currently on this venue.
              </p>
              {amenities.map((a) => (
                <label
                  key={a.slug}
                  className="flex items-start gap-3 rounded-lg border border-border p-2.5 cursor-pointer hover:bg-muted/40 transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={selected[a.slug] !== false}
                    onChange={(e) => onToggle(a.slug, e.target.checked)}
                    className="accent-primary w-4 h-4 mt-0.5 shrink-0"
                  />
                  <span className="min-w-0">
                    <span className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium">{SLUG_LABEL[a.slug] || a.slug}</span>
                      {currentSlugs.has(a.slug) && (
                        <Badge variant="secondary" className="text-[10px]">Already tagged</Badge>
                      )}
                    </span>
                    <span className="block text-[11px] text-muted-foreground mt-0.5">
                      Source: {a.source}
                      {typeof a.confidence === 'number' && (
                        <> · Confidence: {a.confidence >= 0.85 ? 'High' : a.confidence >= 0.6 ? 'Medium' : 'Low'} ({a.confidence.toFixed(2)})</>
                      )}
                      {a.source_url && (
                        <> · <a href={a.source_url} target="_blank" rel="noopener noreferrer" className="underline" onClick={(e) => e.stopPropagation()}>Source page</a></>
                      )}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          )}

          {proposals.length > 0 && (
            <div className="space-y-2 bg-amber-500/5 rounded-lg p-3">
              <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                <input
                  type="checkbox"
                  checked={acceptProposals}
                  onChange={(e) => onToggleProposals(e.target.checked)}
                  className="accent-primary w-4 h-4"
                />
                Queue {proposals.length} proposed new {proposals.length === 1 ? 'amenity' : 'amenities'} for review
              </label>
              <p className="text-[11px] text-muted-foreground">
                These don't match any existing amenity. Queued for your approval — they aren't tagged
                on the venue until added to the catalog.
              </p>
              {proposals.map((p) => (
                <div key={p.suggested_slug} className="text-xs">
                  <span className="font-medium">{p.label}</span>
                  {p.suggested_category && (
                    <span className="text-muted-foreground"> · {p.suggested_category}</span>
                  )}
                  <span className="block text-[11px] text-muted-foreground">Source: {p.source}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {droppedCount > 0 && (
        <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-500/10 rounded-lg p-2.5">
          <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          {droppedCount} suggested {droppedCount === 1 ? 'amenity was' : 'amenities were'} discarded
          for having no cited source or no matching amenity.
        </div>
      )}
    </div>
  );
}