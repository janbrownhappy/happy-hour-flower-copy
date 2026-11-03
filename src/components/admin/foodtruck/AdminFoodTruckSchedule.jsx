import { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Truck, RefreshCw, CalendarDays, AlertTriangle, CheckCircle, UserPlus, Radio } from 'lucide-react';
import { useAdminLocation } from '@/lib/AdminLocationContext';
import { foodTruckTypeIds, isFoodTruck } from '@/lib/truckSchedule';
import useTruckStops from '@/hooks/useTruckStops';
import { stopPhase, formatStopTime } from '@/lib/truckStops';
import MySchedule from '@/components/venue/schedule/MySchedule';

const STATUS = {
  serving: { label: 'Serving now', className: 'bg-emerald-100 text-emerald-800', Icon: Radio },
  pending: { label: 'Scheduled now — not checked in', className: 'bg-amber-100 text-amber-800', Icon: AlertTriangle },
  confirmed: { label: 'Upcoming stops', className: 'bg-sky-100 text-sky-800', Icon: CheckCircle },
  stale: { label: 'No upcoming stops', className: 'bg-muted text-muted-foreground', Icon: Truck },
};
const LIVE = ['serving', 'scheduled_now', 'upcoming'];

export default function AdminFoodTruckSchedule() {
  const { locationFilter } = useAdminLocation();
  const [trucks, setTrucks] = useState([]);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [managing, setManaging] = useState(null);
  const { stopsByVenue, now, reload } = useTruckStops();

  const load = async () => {
    setLoading(true);
    const [venues, types, feedLeads] = await Promise.all([
      base44.entities.Venue.list('name', 5000).catch(() => []),
      base44.entities.VenueType.list('sort_order', 200).catch(() => []),
      base44.entities.Lead.filter({ source: '864foodtrucks' }, '-created_date', 1000).catch(() => []),
    ]);
    const truckTypeIds = foodTruckTypeIds(types);
    setTrucks(venues.filter((v) => isFoodTruck(v, truckTypeIds)));
    setLeads(feedLeads);
    setLoading(false);
    reload();
  };

  useEffect(() => { load(); }, []);

  const scoped = useMemo(() => trucks.filter((v) => {
    if (locationFilter?.state_code && v.state_code !== locationFilter.state_code) return false;
    if (locationFilter?.market_id && v.market_id !== locationFilter.market_id) return false;
    if (locationFilter?.area && v.area !== locationFilter.area) return false;
    return true;
  }), [trucks, locationFilter]);

  const liveStops = (v) => (stopsByVenue[v.id] || []).filter((s) => LIVE.includes(stopPhase(s, now)));
  const statusOf = (v) => {
    const phases = liveStops(v).map((s) => stopPhase(s, now));
    if (phases.includes('serving')) return 'serving';
    if (phases.includes('scheduled_now')) return 'pending';
    return phases.length ? 'confirmed' : 'stale';
  };

  const counts = { serving: 0, pending: 0, confirmed: 0, stale: 0 };
  scoped.forEach((v) => { counts[statusOf(v)] += 1; });
  const newLeads = leads.filter((l) => l.status === 'new').length;

  if (loading) {
    return <div className="flex justify-center py-20"><div className="w-7 h-7 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-heading font-bold flex items-center gap-2">
            <Truck className="w-5 h-5 text-primary" /> Food Truck Schedules ({scoped.length})
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">Trucks appear on the map at their posted stops. Open a truck to manage its stops.</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} className="gap-1.5"><RefreshCw className="w-3.5 h-3.5" /> Refresh</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'Serving now', value: counts.serving },
          { label: 'Scheduled now, not checked in', value: counts.pending },
          { label: 'Upcoming only', value: counts.confirmed },
          { label: 'No upcoming stops', value: counts.stale },
          { label: 'Prospect leads (new)', value: newLeads },
        ].map((s) => (
          <div key={s.label} className="bg-card border border-border rounded-xl p-3">
            <p className="text-2xl font-bold">{s.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-card border border-border rounded-xl p-3 flex items-center gap-2 text-sm">
        <UserPlus className="w-4 h-4 text-primary flex-shrink-0" />
        <span className="text-muted-foreground">{leads.length} truck{leads.length === 1 ? '' : 's'} from the 864FoodTrucks feed have no listing yet and are tracked as prospect leads.</span>
      </div>

      {scoped.length === 0 ? (
        <div className="text-center py-14 text-muted-foreground">
          <Truck className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="font-semibold">No food trucks yet</p>
          <p className="text-sm mt-1">Tag a venue with the “Food Truck” type and it will show up here.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {scoped.map((v) => {
            const meta = STATUS[statusOf(v)];
            const upcoming = liveStops(v);
            const next = upcoming[0];
            return (
              <div key={v.id} className="border border-border rounded-xl p-3 bg-card flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold truncate">{v.name}</p>
                    <Badge className={`${meta.className} gap-1 text-xs`}><meta.Icon className="w-3 h-3" /> {meta.label}</Badge>
                    {!v.owner_id && <Badge variant="outline" className="text-xs">Unclaimed</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {upcoming.length} upcoming stop{upcoming.length === 1 ? '' : 's'}
                    {next ? ` · next: ${formatStopTime(next).day} at ${next.location_name}` : ' · nothing posted'}
                  </p>
                </div>
                <Button size="sm" variant="outline" className="gap-1.5 text-xs flex-shrink-0" onClick={() => setManaging(v)}>
                  <CalendarDays className="w-3.5 h-3.5" /> Manage stops
                </Button>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={!!managing} onOpenChange={(o) => !o && setManaging(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto bg-slate-900 border-slate-700">
          {managing && <MySchedule venue={managing} canEdit />}
        </DialogContent>
      </Dialog>
    </div>
  );
}