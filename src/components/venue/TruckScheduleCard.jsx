import { Truck, MapPin, Navigation } from 'lucide-react';
import useTruckStops from '@/hooks/useTruckStops';
import { stopPhase, stopLabel, formatStopTime, directionsUrl } from '@/lib/truckStops';

const TONE = { serving: 'text-green-600', scheduled_now: 'text-amber-600' };

// "Where to Find Us" — the truck's live and upcoming dated stops.
export default function TruckScheduleCard({ venue }) {
  const { stops, now, loading } = useTruckStops({ venueId: venue.id, pastDays: 1 });
  const shown = stops
    .filter((s) => ['serving', 'scheduled_now', 'upcoming'].includes(stopPhase(s, now)))
    .slice(0, 10);

  return (
    <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4">
      <h2 className="font-semibold flex items-center gap-2 mb-3 text-orange-700">
        <Truck className="w-4 h-4" /> Where to Find Us
      </h2>
      {loading ? null : shown.length === 0 ? (
        <p className="text-sm text-orange-800/80">No upcoming location posted. Check back soon.</p>
      ) : (
        <ul className="space-y-2">
          {shown.map((s) => {
            const phase = stopPhase(s, now);
            const f = formatStopTime(s);
            return (
              <li key={s.id} className={`rounded-xl px-3 py-2.5 bg-white border ${TONE[phase] ? 'border-orange-400 shadow-sm' : 'border-orange-100'}`}>
                <p className="text-xs font-bold text-orange-700 uppercase tracking-wide">{f.day} · {f.hours}</p>
                <p className="font-semibold text-sm mt-0.5">{s.location_name}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3" />{s.address}</p>
                {s.instructions && <p className="text-xs text-muted-foreground mt-0.5">{s.instructions}</p>}
                {TONE[phase] && <p className={`text-xs font-semibold mt-1 ${TONE[phase]}`}>{stopLabel(s, now).text}</p>}
                <a href={directionsUrl(s)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary font-semibold mt-1">
                  <Navigation className="w-3 h-3" /> Directions
                </a>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}