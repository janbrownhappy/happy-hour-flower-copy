import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { addCrewCheckInToCalendar } from '@/functions/addCrewCheckInToCalendar';
import { getCrewCheckIns } from '@/functions/getCrewCheckIns';
import { Link } from 'react-router-dom';
import { MapPin, Sparkles, ChevronDown, ChevronUp, ChevronRight, Users, CalendarPlus, Loader2, Check } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const CALENDAR_CONNECTOR_ID = '6a3ab5990d62e026281b855e';

// Premium feed: shows shared check-ins from the user's crew members (friends who have joined).
export default function CrewActivityFeed({ userId }) {
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [syncing, setSyncing] = useState(null); // check-in id currently syncing
  const [synced, setSynced] = useState({}); // { [checkInId]: true }
  const [syncError, setSyncError] = useState('');

  const syncToCalendar = async (checkIn) => {
    setSyncError('');
    setSyncing(checkIn.id);
    try {
      await addCrewCheckInToCalendar({ check_in_id: checkIn.id });
      setSynced(prev => ({ ...prev, [checkIn.id]: true }));
    } catch (e) {
      // 412 => user hasn't connected their Google Calendar yet; open OAuth popup then retry.
      if (e.response?.status === 412) {
        try {
          const url = await base44.connectors.connectAppUser(CALENDAR_CONNECTOR_ID);
          const popup = window.open(url, '_blank');
          const timer = setInterval(async () => {
            if (!popup || popup.closed) {
              clearInterval(timer);
              try {
                await addCrewCheckInToCalendar({ check_in_id: checkIn.id });
                setSynced(prev => ({ ...prev, [checkIn.id]: true }));
              } catch {
                setSyncError('Could not add to your calendar. Please try again.');
              }
              setSyncing(null);
            }
          }, 500);
          return;
        } catch {
          setSyncError('Could not connect your Google Calendar.');
        }
      } else {
        setSyncError(e.response?.data?.error || 'Could not add to your calendar.');
      }
    } finally {
      if (syncing === checkIn.id) setSyncing(null);
    }
  };

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      try {
        // Crew check-ins are resolved server-side (service role) to avoid a
        // cross-user RLS subquery that fails when the crew set is empty.
        const { data } = await getCrewCheckIns({});
        if (!cancelled) setActivity(data?.check_ins || []);
      } catch {
        if (!cancelled) setActivity([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [userId]);

  return (
    <div className="bg-card border border-border rounded-2xl mb-4 overflow-hidden">
      <button
        onClick={() => setExpanded(p => !p)}
        className="w-full flex items-center justify-between p-4 hover:bg-muted/40 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Sparkles className="w-5 h-5 text-primary" />
          <div className="text-left">
            <p className="font-semibold text-sm">Crew Activity{activity.length > 0 ? ` (${activity.length})` : ''}</p>
            <p className="text-xs text-muted-foreground">Where your friends are checking in</p>
          </div>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>

      {expanded && (
        <div className="border-t border-border p-4">
          {loading ? (
            <div className="space-y-2">{[1, 2].map(i => <div key={i} className="h-12 bg-muted rounded-lg animate-pulse" />)}</div>
          ) : activity.length === 0 ? (
            <p className="text-xs text-muted-foreground py-2 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" /> No crew activity yet. When friends join your crew and share check-ins, they'll show up here.
            </p>
          ) : (
            <div className="space-y-2">
              {syncError && <p className="text-xs text-destructive">{syncError}</p>}
              {activity.map(c => (
                <div key={c.id} className="flex items-center gap-3 bg-muted/30 rounded-lg p-2.5">
                  <Link to={`/venue/${c.venue_id}`} className="flex items-center gap-3 flex-1 min-w-0 hover:opacity-80 transition-opacity">
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <MapPin className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        <span className="text-primary">{c.user_name || 'A friend'}</span> checked in at {c.venue_name || 'a venue'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {c.checked_in_at ? formatDistanceToNow(new Date(c.checked_in_at), { addSuffix: true }) : ''}
                      </p>
                      {c.note && <p className="text-xs text-muted-foreground italic truncate mt-0.5">"{c.note}"</p>}
                    </div>
                  </Link>
                  <button
                    onClick={() => syncToCalendar(c)}
                    disabled={syncing === c.id || synced[c.id]}
                    title="Add to my Google Calendar"
                    className="flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors disabled:opacity-60"
                  >
                    {syncing === c.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : synced[c.id] ? (
                      <Check className="w-4 h-4 text-green-600" />
                    ) : (
                      <CalendarPlus className="w-4 h-4" />
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}