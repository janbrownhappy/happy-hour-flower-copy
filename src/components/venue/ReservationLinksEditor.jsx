import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Plus, Trash2, CalendarCheck, Save, CheckCircle } from 'lucide-react';

const PLATFORMS = ['OpenTable', 'Resy', 'Tock', 'SevenRooms', 'Yelp Reservations', 'Eventbrite', 'Toast Tables', 'Other'];

const POLICIES = [
  { value: 'none', label: 'Walk-ins only', desc: 'We do not take reservations.' },
  { value: 'accepted', label: 'Reservations accepted', desc: 'Reservations welcome, but walk-ins are fine too.' },
  { value: 'required', label: 'Reservations required', desc: 'Reservations only — walk-ins are not accepted.' },
];

export default function ReservationLinksEditor({ venue, canEdit, onPolicySaved }) {
  const venueId = venue.id;
  const [policy, setPolicy] = useState(venue.reservation_policy || 'none');
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [newPlatform, setNewPlatform] = useState('OpenTable');
  const [newCustom, setNewCustom] = useState('');
  const [newUrl, setNewUrl] = useState('');

  useEffect(() => {
    base44.entities.VenueReservationLink.filter({ venue_id: venueId }, 'sort_order')
      .then(setLinks)
      .catch(() => setLinks([]))
      .finally(() => setLoading(false));
  }, [venueId]);

  const savePolicy = async (val) => {
    setPolicy(val);
    setSaving(true);
    await base44.entities.Venue.update(venueId, { reservation_policy: val });
    onPolicySaved?.(val);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const addLink = async () => {
    const platform = newPlatform === 'Other' ? newCustom.trim() : newPlatform;
    const url = newUrl.trim();
    if (!url) return;
    const created = await base44.entities.VenueReservationLink.create({
      venue_id: venueId,
      platform_name: platform || 'Reservations',
      url,
      sort_order: links.length,
    });
    setLinks([...links, created]);
    setNewPlatform('OpenTable');
    setNewCustom('');
    setNewUrl('');
  };

  const removeLink = async (linkId) => {
    await base44.entities.VenueReservationLink.delete(linkId);
    setLinks(links.filter(l => l.id !== linkId));
  };

  if (loading) {
    return <div className="flex justify-center py-10"><div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-4">
      {/* Policy */}
      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5 space-y-4">
        <div>
          <p className="text-white font-semibold flex items-center gap-2">
            <CalendarCheck className="w-4 h-4 text-amber-500" /> Reservation Policy
          </p>
          <p className="text-slate-400 text-xs mt-0.5">Let customers know how you handle reservations.</p>
        </div>
        <div className="space-y-2">
          {POLICIES.map(p => (
            <button
              key={p.value}
              type="button"
              disabled={!canEdit || saving}
              onClick={() => savePolicy(p.value)}
              className={`w-full text-left p-3 rounded-xl border transition-colors disabled:opacity-60 ${
                policy === p.value
                  ? 'bg-amber-500/15 border-amber-500 text-white'
                  : 'bg-slate-700 border-slate-600 text-slate-300 hover:border-amber-500/50'
              }`}
            >
              <p className="text-sm font-semibold flex items-center gap-2">
                {p.label}
                {policy === p.value && saved && <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">{p.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Links — only relevant when reservations are accepted or required */}
      {policy !== 'none' && (
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5 space-y-4">
          <div>
            <p className="text-white font-semibold flex items-center gap-2">
              <CalendarCheck className="w-4 h-4 text-amber-500" /> Reservation Links
            </p>
            <p className="text-slate-400 text-xs mt-0.5">Add booking links for any systems you use. These appear on your public page.</p>
          </div>

          {links.length > 0 ? (
            <div className="space-y-2">
              {links.map(l => (
                <div key={l.id} className="flex items-center gap-3 bg-slate-700 border border-slate-600 rounded-xl px-3 py-2.5">
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{l.platform_name}</p>
                    <p className="text-slate-400 text-xs truncate">{l.url}</p>
                  </div>
                  {canEdit && (
                    <button onClick={() => removeLink(l.id)} className="p-1.5 rounded-lg hover:bg-red-500/20 transition-colors shrink-0">
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-500 text-sm text-center py-4">No reservation links yet.</p>
          )}

          {canEdit && (
            <div className="space-y-2 pt-2 border-t border-slate-700">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-slate-400 text-xs uppercase tracking-wide">Platform</Label>
                  <Select value={newPlatform} onValueChange={setNewPlatform}>
                    <SelectTrigger className="w-full mt-1 h-9 rounded-md bg-slate-700 border-slate-600 text-white text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PLATFORMS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                {newPlatform === 'Other' && (
                  <div>
                    <Label className="text-slate-400 text-xs uppercase tracking-wide">Name</Label>
                    <Input value={newCustom} onChange={e => setNewCustom(e.target.value)}
                      className="bg-slate-700 border-slate-600 text-white mt-1" placeholder="System name" />
                  </div>
                )}
              </div>
              <div>
                <Label className="text-slate-400 text-xs uppercase tracking-wide">Booking URL</Label>
                <div className="flex gap-2 mt-1">
                  <Input value={newUrl} onChange={e => setNewUrl(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addLink(); } }}
                    className="bg-slate-700 border-slate-600 text-white flex-1" placeholder="https://…" />
                  <Button onClick={addLink} disabled={!newUrl.trim()} className="bg-amber-500 hover:bg-amber-600 text-white shrink-0">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}