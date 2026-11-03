import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';

const PAGE_SIZE = 30;

const ACTION_STYLES = {
  created: 'bg-green-100 text-green-700',
  updated: 'bg-blue-100 text-blue-700',
  deleted: 'bg-red-100 text-red-700',
  settings_changed: 'bg-purple-100 text-purple-700',
  deals_updated: 'bg-yellow-100 text-yellow-700',
  photos_updated: 'bg-indigo-100 text-indigo-700',
  amenities_updated: 'bg-pink-100 text-pink-700',
  favorited: 'bg-rose-100 text-rose-700',
  unfavorited: 'bg-muted text-muted-foreground',
  deal_viewed: 'bg-amber-100 text-amber-700',
  venue_viewed: 'bg-slate-100 text-slate-700',
};

export default function AdminActivityLog() {
  const [logs, setLogs] = useState([]);
  const [venues, setVenues] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [page, setPage] = useState(1);

  useEffect(() => {
    Promise.all([
      base44.entities.ActivityLog.list('-created_date', 500),
      base44.entities.Venue.list(),
    ]).then(([logData, venueData]) => {
      setLogs(logData);
      setVenues(Object.fromEntries(venueData.map(v => [v.id, v.name])));
    }).finally(() => setLoading(false));
  }, []);

  const filtered = logs.filter(l => {
    const matchSearch = !search ||
      l.user_name?.toLowerCase().includes(search.toLowerCase()) ||
      l.description?.toLowerCase().includes(search.toLowerCase()) ||
      venues[l.venue_id]?.toLowerCase().includes(search.toLowerCase());
    const matchAction = actionFilter === 'all' || l.action === actionFilter;
    return matchSearch && matchAction;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const allActions = [...new Set(logs.map(l => l.action).filter(Boolean))].sort();

  if (loading) return <div className="space-y-2">{[1,2,3,4,5].map(i => <div key={i} className="h-12 bg-muted rounded-lg animate-pulse" />)}</div>;

  return (
    <div>
      <div className="flex gap-2 mb-3 flex-wrap">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search by user, venue, description…" className="pl-9" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <Select value={actionFilter} onValueChange={v => { setActionFilter(v); setPage(1); }}>
          <SelectTrigger className="w-44"><SelectValue placeholder="All Actions" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actions</SelectItem>
            {allActions.map(a => (
              <SelectItem key={a} value={a} className="capitalize">{a.replace('_', ' ')}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <p className="text-xs text-muted-foreground mb-2">{filtered.length} log entries</p>

      <div className="space-y-1.5">
        {paginated.map(log => (
          <div key={log.id} className="flex items-start gap-3 p-3 bg-card border border-border rounded-xl">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className={`text-xs py-0 border-0 capitalize ${ACTION_STYLES[log.action] || 'bg-muted text-muted-foreground'}`}>
                  {log.action?.replace('_', ' ')}
                </Badge>
                {log.venue_id && (
                  <span className="text-xs font-medium truncate">
                    {venues[log.venue_id] || 'Unknown Venue'}
                  </span>
                )}
              </div>
              {log.description && (
                <p className="text-xs text-muted-foreground mt-1">{log.description}</p>
              )}
              {log.user_name && (
                <p className="text-xs text-muted-foreground mt-0.5">by {log.user_name}</p>
              )}
            </div>
            <div className="text-right text-xs text-muted-foreground flex-shrink-0">
              {log.created_date && (
                <>
                  <p>{new Date(log.created_date).toLocaleDateString()}</p>
                  <p>{new Date(log.created_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                </>
              )}
            </div>
          </div>
        ))}
        {paginated.length === 0 && <p className="text-center text-muted-foreground text-sm py-8">No activity log entries found.</p>}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-4">
          <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm text-muted-foreground">{page} / {totalPages}</span>
          <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}