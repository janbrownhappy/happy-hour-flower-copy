import { useState, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, addMonths, subMonths, getDay } from 'date-fns';
import { ChevronLeft, ChevronRight, Clock, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';

export default function CalendarView({ venues, events }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(new Date());

  const days = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  // Day name of week for the first day (0=Sun) — for grid offset
  const startOffset = getDay(startOfMonth(currentMonth));

  // Map day-of-week abbreviation to index (Sun=0)
  const dayIndexMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

  // Build a map: dateString -> list of items (venue happy hours + events)
  const itemsByDate = useMemo(() => {
    const map = {};

    // Add venue happy hours for days in current month
    venues.forEach(venue => {
      if (!venue.days?.length) return;
      days.forEach(day => {
        const dayName = format(day, 'EEE'); // Mon, Tue, etc.
        if (venue.days.includes(dayName)) {
          const key = format(day, 'yyyy-MM-dd');
          if (!map[key]) map[key] = [];
          map[key].push({ type: 'happyhour', venue, day });
        }
      });
    });

    // Add VenueEvents
    events.forEach(evt => {
      if (!evt.event_date) return;
      const key = evt.event_date.slice(0, 10);
      if (!map[key]) map[key] = [];
      map[key].push({ type: 'event', event: evt });
    });

    return map;
  }, [venues, events, days]);

  const selectedKey = format(selectedDay, 'yyyy-MM-dd');
  const selectedItems = itemsByDate[selectedKey] || [];

  // Group happy hours and dedupe venues for the selected day
  const selectedHappyHours = selectedItems
    .filter(i => i.type === 'happyhour')
    .reduce((acc, i) => {
      if (!acc.find(x => x.venue.id === i.venue.id)) acc.push(i);
      return acc;
    }, []);
  const selectedEvents = selectedItems.filter(i => i.type === 'event');

  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="space-y-4">
      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setCurrentMonth(m => subMonths(m, 1))}
          className="p-2 rounded-lg hover:bg-muted transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <h3 className="font-heading font-bold text-base">{format(currentMonth, 'MMMM yyyy')}</h3>
        <button
          onClick={() => setCurrentMonth(m => addMonths(m, 1))}
          className="p-2 rounded-lg hover:bg-muted transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 text-center mb-1">
        {dayLabels.map(d => (
          <div key={d} className="text-xs font-semibold text-muted-foreground py-1">{d}</div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-0.5">
        {/* Empty cells for offset */}
        {Array(startOffset).fill(null).map((_, i) => (
          <div key={`offset-${i}`} />
        ))}

        {days.map(day => {
          const key = format(day, 'yyyy-MM-dd');
          const items = itemsByDate[key] || [];
          const hasHH = items.some(i => i.type === 'happyhour');
          const hasEvent = items.some(i => i.type === 'event');
          const isSelected = isSameDay(day, selectedDay);
          const isTodayDay = isToday(day);

          return (
            <button
              key={key}
              onClick={() => setSelectedDay(day)}
              className={`relative flex flex-col items-center py-1.5 rounded-lg transition-colors ${
                isSelected
                  ? 'bg-primary text-white'
                  : isTodayDay
                  ? 'bg-primary/10 text-primary font-bold'
                  : 'hover:bg-muted text-foreground'
              }`}
            >
              <span className="text-sm leading-none">{format(day, 'd')}</span>
              {/* Dot indicators */}
              <div className="flex gap-0.5 mt-1 h-1.5">
                {hasHH && (
                  <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-primary'}`} />
                )}
                {hasEvent && (
                  <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white/80' : 'bg-accent'}`} />
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-primary inline-block" /> Happy Hour</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-accent inline-block" /> Special Event</span>
      </div>

      {/* Selected day detail */}
      <div className="space-y-2">
        <p className="text-sm font-semibold text-foreground">
          {isToday(selectedDay) ? 'Today' : format(selectedDay, 'EEEE, MMMM d')}
          <span className="ml-2 text-xs font-normal text-muted-foreground">
            {selectedHappyHours.length + selectedEvents.length} happening
          </span>
        </p>

        {selectedHappyHours.length === 0 && selectedEvents.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">Nothing scheduled on this day</p>
        ) : (
          <>
            {selectedHappyHours.map(({ venue }) => (
              <Link
                key={venue.id}
                to={`/venue/${venue.id}`}
                className="flex items-center gap-3 p-3 bg-card border border-border rounded-xl hover:border-primary/40 transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Clock className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{venue.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {venue.happy_hour_start} – {venue.happy_hour_end}
                    {venue.neighborhood && <span className="ml-1">· {venue.neighborhood.split(' ').slice(1).join(' ')}</span>}
                  </p>
                </div>
                <Badge variant="secondary" className="text-xs flex-shrink-0">{venue.category}</Badge>
              </Link>
            ))}

            {selectedEvents.map(({ event }) => (
              <div
                key={event.id}
                className="flex items-center gap-3 p-3 bg-accent/5 border border-accent/20 rounded-xl"
              >
                <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-4 h-4 text-accent" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{event.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {event.start_time && `${event.start_time}${event.end_time ? ` – ${event.end_time}` : ''}`}
                    {event.description && <span className="ml-1">· {event.description}</span>}
                  </p>
                </div>
                {event.event_type && <Badge className="bg-accent text-white text-xs flex-shrink-0">{event.event_type}</Badge>}
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}