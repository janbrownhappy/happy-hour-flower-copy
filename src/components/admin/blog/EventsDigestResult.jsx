import { CheckCircle2 } from 'lucide-react';

function VenueChips({ label, names, tone }) {
  if (!names.length) return null;
  return (
    <div>
      <p className="text-sm font-medium mb-1.5">{label} ({names.length})</p>
      <div className="flex flex-wrap gap-1.5">
        {names.map((n) => (
          <span key={n} className={`text-xs px-2 py-1 rounded-full ${tone}`}>{n}</span>
        ))}
      </div>
    </div>
  );
}

export default function EventsDigestResult({ result }) {
  return (
    <div className="mt-4 p-4 rounded-lg bg-muted/50 border border-border space-y-3">
      <p className="text-sm text-green-700 inline-flex items-center gap-2 font-medium">
        <CheckCircle2 className="w-4 h-4" />
        {result.updated ? 'Draft updated' : 'Draft created'}: “{result.title}”
      </p>
      <p className="text-sm text-muted-foreground">
        {result.event_count} events across {result.day_count} days · {result.special_count} special events.
        Review and publish it from the Articles tab.
      </p>
      <VenueChips
        label="Linked to your venues"
        names={result.matched_venues || []}
        tone="bg-primary/10 text-primary"
      />
      <VenueChips
        label="Not on Happy Hour Flower yet — outreach prospects"
        names={result.unmatched_venues || []}
        tone="bg-secondary text-secondary-foreground"
      />
    </div>
  );
}