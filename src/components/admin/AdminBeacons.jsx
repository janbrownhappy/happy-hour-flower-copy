import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Bluetooth, Plus, Pencil, Trash2, Loader2, Radio, Search } from 'lucide-react';
import { useAdminLocation, venueInTerritory, hasTerritory } from '@/lib/AdminLocationContext';

const ZONES = [
  { value: 'entrance', label: 'Entrance' },
  { value: 'bar', label: 'Bar' },
  { value: 'wait_zone', label: 'Wait Zone' },
  { value: 'exit', label: 'Exit' },
  { value: 'other', label: 'Other' },
];

const EMPTY = { venue_id: '', beacon_uid: '', label: '', zone: 'entrance', range_yards: 20, wallet_pass_id: '', is_active: true };

// Admin-wide beacon manager: add, update, and remove physical beacons across all venues.
export default function AdminBeacons() {
  const { locationFilter } = useAdminLocation();
  const [beacons, setBeacons] = useState([]);
  const [venues, setVenues] = useState([]);
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null); // null = adding, object = editing
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const [b, v, c] = await Promise.all([
      base44.entities.Beacon.list('-created_date'),
      base44.entities.Venue.list('name'),
      base44.entities.WalletPass.filter({ pass_type: 'coupon', status: 'active' }),
    ]);
    setBeacons(b);
    setVenues(v);
    setCoupons(c);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const venueName = (id) => venues.find(v => v.id === id)?.name || 'Unknown venue';
  const couponName = (id) => coupons.find(c => c.id === id)?.title;
  const couponsForVenue = (venueId) => coupons.filter(c => c.venue_id === venueId);

  const set = (field, val) => setForm(prev => ({ ...prev, [field]: val }));

  const openAdd = () => {
    setEditing(null);
    setForm(EMPTY);
    setDialogOpen(true);
  };

  const openEdit = (beacon) => {
    setEditing(beacon);
    setForm({
      venue_id: beacon.venue_id || '',
      beacon_uid: beacon.beacon_uid || '',
      label: beacon.label || '',
      zone: beacon.zone || 'other',
      range_yards: beacon.range_yards || 20,
      wallet_pass_id: beacon.wallet_pass_id || '',
      is_active: beacon.is_active !== false,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.venue_id || !form.beacon_uid.trim()) return;
    setSaving(true);
    try {
      const payload = {
        venue_id: form.venue_id,
        venue_name: venueName(form.venue_id),
        beacon_uid: form.beacon_uid.trim(),
        label: form.label.trim(),
        zone: form.zone,
        range_yards: Number(form.range_yards) || 20,
        wallet_pass_id: form.wallet_pass_id || '',
        is_active: form.is_active,
      };
      if (editing) {
        await base44.entities.Beacon.update(editing.id, payload);
      } else {
        await base44.entities.Beacon.create({ ...payload, trigger_count: 0 });
      }
      setDialogOpen(false);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (beacon) => {
    await base44.entities.Beacon.update(beacon.id, { is_active: !beacon.is_active });
    setBeacons(prev => prev.map(b => b.id === beacon.id ? { ...b, is_active: !b.is_active } : b));
  };

  const handleDelete = async (beacon) => {
    if (!confirm(`Delete beacon "${beacon.label || beacon.beacon_uid}"? This cannot be undone.`)) return;
    await base44.entities.Beacon.delete(beacon.id);
    setBeacons(prev => prev.filter(b => b.id !== beacon.id));
  };

  const territoryVenueIds = hasTerritory(locationFilter)
    ? new Set(venues.filter(v => venueInTerritory(v, locationFilter)).map(v => v.id))
    : null;
  const territoryBeacons = territoryVenueIds
    ? beacons.filter(b => territoryVenueIds.has(b.venue_id))
    : beacons;

  const filtered = territoryBeacons.filter(b => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (b.label || '').toLowerCase().includes(q) ||
      (b.beacon_uid || '').toLowerCase().includes(q) ||
      venueName(b.venue_id).toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-xl font-heading font-bold flex items-center gap-2">
            <Bluetooth className="w-5 h-5 text-primary" /> Beacons
            <Badge variant="outline">{territoryBeacons.length}</Badge>
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage physical Bluetooth beacons for proximity detection across all venues.
          </p>
        </div>
        <Button onClick={openAdd} className="gap-1.5">
          <Plus className="w-4 h-4" /> Add Beacon
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by label, UID, or venue…"
          className="pl-9"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 text-primary animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="border border-border rounded-xl p-10 text-center bg-card">
          <Radio className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-muted-foreground text-sm">
            {beacons.length === 0 ? 'No beacons registered yet.' : 'No beacons match your search.'}
          </p>
          {beacons.length === 0 && (
            <p className="text-muted-foreground text-xs mt-1">Click "Add Beacon" to register your first device.</p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(beacon => (
            <div key={beacon.id} className="border border-border rounded-xl p-4 bg-card flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold truncate">{beacon.label || 'Unnamed beacon'}</p>
                  <Badge variant="secondary" className="capitalize">{(beacon.zone || 'other').replace('_', ' ')}</Badge>
                  {!beacon.is_active && <Badge variant="outline" className="text-muted-foreground">Inactive</Badge>}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {venueName(beacon.venue_id)} · <span className="font-mono">{beacon.beacon_uid}</span>
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {beacon.range_yards || 20} yd · {beacon.trigger_count || 0} trigger{beacon.trigger_count === 1 ? '' : 's'}
                  {beacon.wallet_pass_id && couponName(beacon.wallet_pass_id) ? ` · Coupon: ${couponName(beacon.wallet_pass_id)}` : ' · No coupon'}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Switch checked={beacon.is_active !== false} onCheckedChange={() => handleToggle(beacon)} />
                <Button size="icon" variant="ghost" onClick={() => openEdit(beacon)}>
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => handleDelete(beacon)} className="text-destructive hover:text-destructive">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Beacon' : 'Add Beacon'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Venue</Label>
              <Select value={form.venue_id} onValueChange={(v) => set('venue_id', v)}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Select a venue" />
                </SelectTrigger>
                <SelectContent>
                  {venues.map(v => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Beacon UID</Label>
              <Input
                value={form.beacon_uid}
                onChange={(e) => set('beacon_uid', e.target.value)}
                className="mt-1.5 font-mono"
                placeholder="E2C56DB5-DFFB-48D2-B060-D0F5A71096E0"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">Label</Label>
                <Input value={form.label} onChange={(e) => set('label', e.target.value)} className="mt-1.5" placeholder="Front Bar" />
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">Zone</Label>
                <Select value={form.zone} onValueChange={(v) => set('zone', v)}>
                  <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ZONES.map(z => <SelectItem key={z.value} value={z.value}>{z.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">Range (yards)</Label>
                <Input type="number" min={5} max={50} value={form.range_yards} onChange={(e) => set('range_yards', e.target.value)} className="mt-1.5" />
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">Linked Coupon</Label>
                <Select value={form.wallet_pass_id || '__none__'} onValueChange={(v) => set('wallet_pass_id', v === '__none__' ? '' : v)}>
                  <SelectTrigger className="mt-1.5"><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None (welcome only)</SelectItem>
                    {couponsForVenue(form.venue_id).map(c => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center justify-between border border-border rounded-lg px-4 py-3">
              <div>
                <p className="text-sm font-medium">Active</p>
                <p className="text-xs text-muted-foreground">Fire proximity events when detected.</p>
              </div>
              <Switch checked={form.is_active} onCheckedChange={(v) => set('is_active', v)} />
            </div>
            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button className="flex-1" onClick={handleSave} disabled={saving || !form.venue_id || !form.beacon_uid.trim()}>
                {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving…</> : (editing ? 'Save Changes' : 'Add Beacon')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}