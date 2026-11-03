import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const today = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date().getDay()];

export default function VenueWeeklyCalendar({ venue, events = [], selectedDay = null }) {
  if (!venue) return null;

  // Build a map of day → items (happy hour + recurring events)
  const dayData = DAYS.map(day => {
    const hasHappyHour = venue.days?.includes(day);
    const daySchedule = venue.day_schedules?.[day];
    const startTime = daySchedule?.start || venue.happy_hour_start;

    // Events that recur on this day
    const dayEvents = events.filter(ev =>
      ev.recurrence_days?.includes(day)
    );

    return { day, hasHappyHour, dayEvents, startTime };
  });

  // Filter to selected day if set
  const filteredData = selectedDay
    ? dayData.filter(d => d.day === selectedDay)
    : dayData;

  // The "active" day to highlight — selected day takes priority over today
  const activeDay = selectedDay || today;

  return (
    <div>
      <h2 className="font-semibold mb-3 flex items-center gap-2">
        <Clock className="w-4 h-4" /> Weekly Schedule
      </h2>

      <div className={cn(
        'grid gap-1',
        selectedDay ? 'grid-cols-1' : 'grid-cols-7'
      )}>
        {filteredData.map(({ day, hasHappyHour, dayEvents, startTime }) => {
          const isActive = day === activeDay;
          const hasAnything = hasHappyHour || dayEvents.length > 0;

          return (
            <div
              key={day}
              className={cn(
                'flex flex-col items-center rounded-xl border py-2 px-0.5 min-h-[90px] transition-all',
                isActive
                  ? 'border-primary/50 bg-primary/5'
                  : hasAnything
                  ? 'border-border bg-card'
                  : 'border-border/40 bg-muted/30 opacity-50'
              )}
            >
              {/* Day label */}
              <span
                className={cn(
                  'text-[11px] font-bold mb-1.5',
                  isActive ? 'text-primary' : 'text-muted-foreground'
                )}
              >
                {day}
              </span>

              {/* Happy hour pill */}
              {hasHappyHour && (
                <div className={cn(
                  'w-full px-1 py-1 rounded-md text-center mb-1',
                  isActive ? 'bg-primary text-white' : 'bg-primary/15 text-primary'
                )}>
                  <p className="text-[9px] font-bold leading-none">🍹 HH</p>
                  {startTime && (
                    <p className="text-[8px] leading-tight mt-0.5 opacity-90">
                      {startTime}
                    </p>
                  )}
                </div>
              )}

              {/* Recurring events */}
              {dayEvents.map(ev => (
                <div
                  key={ev.id}
                  className="w-full px-1 py-1 rounded-md text-center bg-accent/15 mb-1"
                  title={ev.title}
                >
                  <p className="text-[9px] font-semibold text-accent-foreground leading-none truncate">
                    {ev.title}
                  </p>
                  {ev.start_time && (
                    <p className="text-[8px] text-muted-foreground leading-tight mt-0.5">
                      {ev.start_time}
                    </p>
                  )}
                </div>
              ))}

              {/* Empty dot for inactive days */}
              {!hasAnything && (
                <div className="w-1.5 h-1.5 rounded-full bg-border mt-auto mb-2" />
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex gap-4 mt-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-primary/15 inline-block" />
          Happy Hour
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-accent/15 inline-block" />
          Recurring Event
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-primary inline-block" />
          Today
        </span>
      </div>
    </div>
  );
}