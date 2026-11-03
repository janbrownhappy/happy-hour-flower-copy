import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { CheckCircle2, AlertTriangle, XCircle, MessageSquare, Search } from 'lucide-react';
import { format } from 'date-fns';
import { useAdminLocation, venueInTerritory, hasTerritory } from '@/lib/AdminLocationContext';

const STATUS_CONFIG = {
  sent: {
    label: 'Delivered',
    icon: CheckCircle2,
    className: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  },
  partial: {
    label: 'Partial',
    icon: AlertTriangle,
    className: 'bg-amber-100 text-amber-700 border-amber-200',
  },
  failed: {
    label: 'Failed',
    icon: XCircle,
    className: 'bg-red-100 text-red-700 border-red-200',
  },
};

export default function AdminMessageLog() {
  const { locationFilter } = useAdminLocation();
  const [search, setSearch] = useState('');

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['venue-message-logs'],
    queryFn: () => base44.entities.VenueMessageLog.list('-created_date', 200),
  });

  const { data: venues = [] } = useQuery({
    queryKey: ['venues-for-msg-log'],
    queryFn: () => base44.entities.Venue.list(),
  });

  const territoryVenueIds = hasTerritory(locationFilter)
    ? new Set(venues.filter(v => venueInTerritory(v, locationFilter)).map(v => v.id))
    : null;
  const territoryLogs = territoryVenueIds ? logs.filter(l => territoryVenueIds.has(l.venue_id)) : logs;

  const filtered = territoryLogs.filter(log => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      log.venue_name?.toLowerCase().includes(q) ||
      log.message?.toLowerCase().includes(q) ||
      log.sent_by_name?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-6 max-w-5xl">
      <div className="mb-6">
        <h2 className="text-2xl font-bold">Message Log</h2>
        <p className="text-muted-foreground text-sm mt-1">
          All fan messages sent by venue owners, with delivery status.
        </p>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by venue, message, or sender…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground border border-dashed rounded-xl">
          <MessageSquare className="w-8 h-8 mx-auto mb-3 opacity-40" />
          {search ? 'No messages match your search.' : 'No messages have been sent yet.'}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(log => {
            const statusCfg = STATUS_CONFIG[log.status] || STATUS_CONFIG.sent;
            const Icon = statusCfg.icon;
            return (
              <div key={log.id} className="border rounded-xl p-4 bg-card">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-semibold text-sm">{log.venue_name || 'Unknown Venue'}</span>
                      {(log.channels || []).map(ch => (
                        <Badge key={ch} variant="outline" className="text-xs capitalize">{ch}</Badge>
                      ))}
                    </div>
                    <p className="text-sm text-foreground line-clamp-2">{log.message}</p>
                    {log.error_details && (
                      <p className="text-xs text-red-600 mt-1 italic">{log.error_details}</p>
                    )}
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground flex-wrap">
                      {log.sent_by_name && <span>Sent by {log.sent_by_name}</span>}
                      {log.recipient_count > 0 && <span>{log.recipient_count} recipient{log.recipient_count !== 1 ? 's' : ''}</span>}
                      <span>{format(new Date(log.created_date), 'MMM d, yyyy h:mm a')}</span>
                    </div>
                  </div>
                  <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium shrink-0 ${statusCfg.className}`}>
                    <Icon className="w-3.5 h-3.5" />
                    {statusCfg.label}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {filtered.length > 0 && (
        <p className="text-xs text-muted-foreground mt-4 text-right">
          Showing {filtered.length} message{filtered.length !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  );
}