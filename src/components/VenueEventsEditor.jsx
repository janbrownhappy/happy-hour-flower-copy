import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, Calendar, Clock, Edit2, X, Check } from 'lucide-react';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';

const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
const EVENT_TYPES = ['Happy Hour','Live Music','Trivia Night','Karaoke','DJ Night','Comedy Night','Sports Viewing','Wine Tasting','Other'];

const emptyEvent = {
  title: '',
  description: '',
  event_type: 'Other',
  event_date: '',
  start_time: '',
  end_time: '',
  recurrence_days: [],
};

export default function VenueEventsEditor({ venueId, canEdit }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyEvent);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadEvents();
  }, [venueId]);

  const loadEvents = async () => {
    setLoading(true);
    const records = await base44.entities.VenueEvent.filter({ venue_id: String(venueId) });
    // Ensure recurrence_days is always an array
    setEvents(records.map(e => ({ ...e, recurrence_days: e.recurrence_days || [] })));
    setLoading(false);
  };

  const openNew = () => {
    setForm(emptyEvent);
    setEditingId(null);
    setShowForm(true);
  };

  const openEdit = (event) => {
    setForm({
      title: event.title || '',
      description: event.description || '',
      event_type: event.event_type || 'Other',
      event_date: event.event_date || '',
      start_time: event.start_time || '',
      end_time: event.end_time || '',
      recurrence_days: event.recurrence_days || [],
    });
    setEditingId(event.id);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const payload = { ...form, venue_id: String(venueId), recurrence_days: form.recurrence_days || [] };
      if (editingId) {
        await base44.entities.VenueEvent.update(editingId, payload);
      } else {
        await base44.entities.VenueEvent.create(payload);
      }
      setShowForm(false);
      setEditingId(null);
      loadEvents();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this event?')) return;
    await base44.entities.VenueEvent.delete(id);
    loadEvents();
  };

  const toggleDay = (day) => {
    setForm(prev => ({
      ...prev,
      recurrence_days: prev.recurrence_days.includes(day)
        ? prev.recurrence_days.filter(d => d !== day)
        : [...prev.recurrence_days, day],
    }));
  };

  const setField = (field, val) => setForm(prev => ({ ...prev, [field]: val }));

  return (
    <div className="space-y-4">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-white font-semibold flex items-center gap-2">
              <Calendar className="w-4 h-4 text-amber-500" /> Events
            </p>
            <p className="text-slate-400 text-xs mt-0.5">Manage recurring events and special occasions</p>
          </div>
          {canEdit && !showForm && (
            <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-white" onClick={openNew}>
              <Plus className="w-4 h-4 mr-1" /> Add Event
            </Button>
          )}
        </div>

        {/* Event Form */}
        {showForm && canEdit && (
          <div className="bg-slate-700/50 border border-slate-600 rounded-xl p-4 mb-4 space-y-3">
            <p className="text-white font-medium text-sm">{editingId ? 'Edit Event' : 'New Event'}</p>

            <div>
              <Label className="text-slate-400 text-xs">Event Title *</Label>
              <Input value={form.title} onChange={e => setField('title', e.target.value)}
                className="bg-slate-700 border-slate-600 text-white mt-1 h-11" placeholder="e.g., Trivia Night" />
            </div>

            <div>
              <Label className="text-slate-400 text-xs">Event Type</Label>
              <Select value={form.event_type} onValueChange={val => setField('event_type', val)}>
                <SelectTrigger className="w-full mt-1 h-11 bg-slate-700 border-slate-600 text-white">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {EVENT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-slate-400 text-xs">Description</Label>
              <Textarea value={form.description} onChange={e => setField('description', e.target.value)}
                className="bg-slate-700 border-slate-600 text-white mt-1" rows={2}
                placeholder="Optional details about this event..." />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-slate-400 text-xs">Start Time</Label>
                <Input type="time" value={form.start_time} onChange={e => setField('start_time', e.target.value)}
                  className="bg-slate-700 border-slate-600 text-white mt-1 h-11" />
              </div>
              <div>
                <Label className="text-slate-400 text-xs">End Time</Label>
                <Input type="time" value={form.end_time} onChange={e => setField('end_time', e.target.value)}
                  className="bg-slate-700 border-slate-600 text-white mt-1 h-11" />
              </div>
            </div>

            <div>
              <Label className="text-slate-400 text-xs mb-2 block">Recurring Days (optional)</Label>
              <div className="flex flex-wrap gap-1.5">
                {DAYS.map(day => (
                  <button key={day}
                    onClick={() => toggleDay(day)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                      form.recurrence_days.includes(day)
                        ? 'bg-amber-500 text-white'
                        : 'bg-slate-600 text-slate-300 hover:bg-slate-500'
                    }`}
                  >
                    {day.slice(0, 3)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-slate-400 text-xs">One-time Date (optional)</Label>
              <Input type="date" value={form.event_date} onChange={e => setField('event_date', e.target.value)}
                className="bg-slate-700 border-slate-600 text-white mt-1 h-11" />
            </div>

            <div className="flex gap-2 pt-1">
              <Button onClick={handleSave} disabled={saving || !form.title.trim()}
                className="flex-1 bg-amber-500 hover:bg-amber-600 text-white">
                {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><Check className="w-4 h-4 mr-1" /> Save</>}
              </Button>
              <Button variant="outline" onClick={() => { setShowForm(false); setEditingId(null); }}
                className="border-slate-600 text-slate-300 hover:bg-slate-700">
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Events List */}
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-3xl mb-2">📅</p>
            <p className="text-slate-400 text-sm">No events scheduled yet</p>
            {canEdit && <p className="text-slate-500 text-xs mt-1">Click "Add Event" to create your first event</p>}
          </div>
        ) : (
          <div className="space-y-3">
            {events.map(event => (
              <div key={event.id} className="bg-slate-700/50 border border-slate-600 rounded-xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-white font-medium text-sm">{event.title}</span>
                      <span className="text-xs text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">
                        {event.event_type}
                      </span>
                    </div>
                    {event.description && (
                      <p className="text-slate-400 text-xs mt-1">{event.description}</p>
                    )}
                    <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                      {(event.start_time || event.end_time) && (
                        <span className="text-slate-400 text-xs flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {event.start_time}{event.end_time ? ` – ${event.end_time}` : ''}
                        </span>
                      )}
                      {event.event_date && (
                        <span className="text-slate-400 text-xs flex items-center gap-1">
                          <Calendar className="w-3 h-3" /> {event.event_date}
                        </span>
                      )}
                      {event.recurrence_days?.length > 0 && (
                        <span className="text-slate-400 text-xs">
                          {event.recurrence_days.map(d => d.slice(0,3)).join(', ')}
                        </span>
                      )}
                    </div>
                  </div>
                  {canEdit && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => openEdit(event)}
                        className="p-1.5 rounded-lg hover:bg-slate-600 text-slate-400 hover:text-white transition-colors">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDelete(event.id)}
                        className="p-1.5 rounded-lg hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}