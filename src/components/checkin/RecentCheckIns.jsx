import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { MapPin, Users, ChevronDown, ChevronUp, ChevronRight } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function RecentCheckIns({ userId }) {
  const [checkIns, setCheckIns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!userId) return;
    base44.entities.CheckIn.filter({ created_by_id: userId }, '-checked_in_at', 50)
      .then(setCheckIns)
      .finally(() => setLoading(false));
  }, [userId]);

  return (
    <div className="bg-card border border-border rounded-2xl mb-4 overflow-hidden">
      <button
        onClick={() => setExpanded(p => !p)}
        className="w-full flex items-center justify-between p-4 hover:bg-muted/40 transition-colors"
      >
        <div className="flex items-center gap-3">
          <MapPin className="w-5 h-5 text-green-600" />
          <div className="text-left">
            <p className="font-semibold text-sm">My Check-Ins{checkIns.length > 0 ? ` (${checkIns.length})` : ''}</p>
            <p className="text-xs text-muted-foreground">Places you've checked in</p>
          </div>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>

      {expanded && (
        <div className="border-t border-border p-4">
          {loading ? (
            <div className="space-y-2">{[1,2].map(i => <div key={i} className="h-12 bg-muted rounded-lg animate-pulse" />)}</div>
          ) : checkIns.length === 0 ? (
            <p className="text-xs text-muted-foreground py-2">No check-ins yet. Check in at a venue to see it here!</p>
          ) : (
            <div className="space-y-2">
              {checkIns.map(c => (
                <Link key={c.id} to={`/venue/${c.venue_id}`} className="flex items-center gap-3 bg-muted/30 rounded-lg p-2.5 hover:bg-muted/50 transition-colors">
                  <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-4 h-4 text-green-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{c.venue_name || 'Venue'}</p>
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-muted-foreground">
                        {c.checked_in_at ? formatDistanceToNow(new Date(c.checked_in_at), { addSuffix: true }) : ''}
                      </p>
                      {c.shared_with_crew && (
                        <span className="text-xs text-primary flex items-center gap-0.5"><Users className="w-3 h-3" /> Shared</span>
                      )}
                    </div>
                    {c.note && <p className="text-xs text-muted-foreground italic truncate mt-0.5">"{c.note}"</p>}
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}