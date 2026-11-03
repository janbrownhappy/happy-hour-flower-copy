import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DESTINATIONS } from './qrConstants';

const sel = 'w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm';

// Venue / special / event association + destination picker.
export default function QrDestinationFields({ form, set, venues }) {
  const [specials, setSpecials] = useState([]);
  const [events, setEvents] = useState([]);

  useEffect(() => {
    if (!form.venue_id) { setSpecials([]); setEvents([]); return; }
    base44.entities.HappyHourItem.filter({ venue_id: form.venue_id }).then(setSpecials).catch(() => setSpecials([]));
    base44.entities.VenueEvent.filter({ venue_id: form.venue_id }).then(setEvents).catch(() => setEvents([]));
  }, [form.venue_id]);

  const t = form.destination_type;
  return (
    <div className="grid sm:grid-cols-2 gap-3">
      <div><Label>Venue</Label>
        <select className={sel} value={form.venue_id || ''} onChange={(e) => set({ venue_id: e.target.value, special_id: '', event_id: '' })}>
          <option value="">— None —</option>
          {venues.map((v) => <option key={v.id} value={v.id}>{v.name}{v.city ? ` (${v.city})` : ''}</option>)}
        </select>
      </div>
      <div><Label>Special</Label>
        <select className={sel} value={form.special_id || ''} onChange={(e) => set({ special_id: e.target.value })} disabled={!form.venue_id}>
          <option value="">— None —</option>
          {specials.map((s) => <option key={s.id} value={s.id}>{s.label || s.item_category}{s.day ? ` · ${s.day}` : ''}</option>)}
        </select>
      </div>
      <div><Label>Destination</Label>
        <select className={sel} value={t} onChange={(e) => set({ destination_type: e.target.value })}>
          {DESTINATIONS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
        </select>
      </div>
      {t === 'event' && (
        <div><Label>Event</Label>
          <select className={sel} value={form.event_id || ''} onChange={(e) => set({ event_id: e.target.value })} disabled={!form.venue_id}>
            <option value="">— Select —</option>
            {events.map((ev) => <option key={ev.id} value={ev.id}>{ev.title}</option>)}
          </select>
        </div>
      )}
      {t === 'url' && (
        <div><Label>Same-site path</Label><Input placeholder="/explore" value={form.destination_url || ''} onChange={(e) => set({ destination_url: e.target.value })} /></div>
      )}
    </div>
  );
}