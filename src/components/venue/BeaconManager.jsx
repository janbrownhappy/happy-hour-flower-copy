import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { proximityEvent } from '@/functions/proximityEvent';
import {
  Bluetooth, Plus, Trash2, Loader2, Zap, CheckCircle, Tag, Radio, Nfc, Copy, Check,
} from 'lucide-react';

const ZONES = [
  { value: 'entrance', label: 'Entrance' },
  { value: 'bar', label: 'Bar' },
  { value: 'wait_zone', label: 'Wait Zone' },
  { value: 'exit', label: 'Exit' },
  { value: 'other', label: 'Other' },
];

const EMPTY = { beacon_uid: '', label: '', zone: 'entrance', range_yards: 20, wallet_pass_id: '' };

// Lets a venue owner register BLE beacons, link each to a coupon template, and test the
// trigger path. A detected beacon fires the proximityEvent engine which surfaces the coupon.
export default function BeaconManager({ venueId, venueName, canEdit }) {
  const [beacons, setBeacons] = useState([]);
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [testingId, setTestingId] = useState(null);
  const [testResult, setTestResult] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  const nfcUrl = (beacon) => `${window.location.origin}/nfc?beacon=${encodeURIComponent(beacon.beacon_uid)}`;

  const handleCopyNfc = async (beacon) => {
    try {
      await navigator.clipboard.writeText(nfcUrl(beacon));
      setCopiedId(beacon.id);
      setTimeout(() => setCopiedId((c) => (c === beacon.id ? null : c)), 2000);
    } catch {
      // Clipboard may be blocked — no-op
    }
  };

  const load = async () => {
    setLoading(true);
    const [b, c] = await Promise.all([
      base44.entities.Beacon.filter({ venue_id: String(venueId) }, '-created_date'),
      base44.entities.WalletPass.filter({ venue_id: String(venueId), pass_type: 'coupon', status: 'active' }),
    ]);
    setBeacons(b);
    setCoupons(c);
    setLoading(false);
  };

  useEffect(() => { load(); }, [venueId]);

  const set = (field, val) => setForm(prev => ({ ...prev, [field]: val }));

  const handleAdd = async () => {
    if (!form.beacon_uid.trim()) return;
    setSaving(true);
    try {
      await base44.entities.Beacon.create({
        venue_id: String(venueId),
        venue_name: venueName,
        beacon_uid: form.beacon_uid.trim(),
        label: form.label.trim(),
        zone: form.zone,
        range_yards: Number(form.range_yards) || 20,
        wallet_pass_id: form.wallet_pass_id || '',
        is_active: true,
        trigger_count: 0,
      });
      setForm(EMPTY);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (beacon) => {
    await base44.entities.Beacon.update(beacon.id, { is_active: !beacon.is_active });
    setBeacons(prev => prev.map(b => b.id === beacon.id ? { ...b, is_active: !b.is_active } : b));
  };

  const handleLinkCoupon = async (beacon, walletPassId) => {
    const val = walletPassId === '__none__' ? '' : walletPassId;
    await base44.entities.Beacon.update(beacon.id, { wallet_pass_id: val });
    setBeacons(prev => prev.map(b => b.id === beacon.id ? { ...b, wallet_pass_id: val } : b));
  };

  const handleDelete = async (beacon) => {
    if (!confirm(`Delete beacon "${beacon.label || beacon.beacon_uid}"?`)) return;
    await base44.entities.Beacon.delete(beacon.id);
    setBeacons(prev => prev.filter(b => b.id !== beacon.id));
  };

  const handleTest = async (beacon) => {
    setTestingId(beacon.id);
    setTestResult(null);
    try {
      const res = await proximityEvent({ event_type: 'beacon_detected', beacon_uid: beacon.beacon_uid });
      const data = res?.data;
      setTestResult({
        beaconId: beacon.id,
        ok: !!data?.success,
        message: data?.success
          ? (data.action === 'coupon_surfaced'
              ? `Coupon surfaced (${data.segment || 'segment'}${data.discount_value ? ` · ${data.discount_value}` : ''}).`
              : (data.reason || 'Beacon fired — no coupon linked.'))
          : (data?.error || 'Trigger failed.'),
      });
      await load();
    } catch (err) {
      setTestResult({ beaconId: beacon.id, ok: false, message: err?.response?.data?.error || 'Trigger failed.' });
    } finally {
      setTestingId(null);
    }
  };

  const couponName = (id) => coupons.find(c => c.id === id)?.title;

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 text-amber-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5 space-y-1">
        <p className="text-white font-semibold flex items-center gap-2">
          <Bluetooth className="w-4 h-4 text-amber-500" /> Beacons
        </p>
        <p className="text-slate-400 text-xs">
          Register Bluetooth beacons placed inside or near your venue. When a customer's device detects
          a beacon, it surfaces the linked coupon — perfect for door welcomes, bar specials, and come-back offers.
        </p>
      </div>

      {/* Add beacon form */}
      {canEdit && (
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5 space-y-4">
          <p className="text-white font-medium text-sm flex items-center gap-2">
            <Plus className="w-4 h-4 text-amber-500" /> Register a Beacon
          </p>
          <div>
            <Label className="text-slate-400 text-xs uppercase tracking-wide">Beacon UID</Label>
            <Input
              value={form.beacon_uid}
              onChange={(e) => set('beacon_uid', e.target.value)}
              className="bg-slate-700 border-slate-600 text-white mt-1.5 h-11 font-mono"
              placeholder="e.g. E2C56DB5-DFFB-48D2-B060-D0F5A71096E0"
            />
            <p className="text-slate-500 text-xs mt-1">The hardware UID / serial printed on the beacon.</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-slate-400 text-xs uppercase tracking-wide">Label</Label>
              <Input
                value={form.label}
                onChange={(e) => set('label', e.target.value)}
                className="bg-slate-700 border-slate-600 text-white mt-1.5 h-11"
                placeholder="e.g. Front Bar"
              />
            </div>
            <div>
              <Label className="text-slate-400 text-xs uppercase tracking-wide">Zone</Label>
              <Select value={form.zone} onValueChange={(v) => set('zone', v)}>
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white mt-1.5 h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ZONES.map(z => <SelectItem key={z.value} value={z.value}>{z.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-slate-400 text-xs uppercase tracking-wide">Range (yards)</Label>
              <Input
                type="number"
                min={5}
                max={50}
                value={form.range_yards}
                onChange={(e) => set('range_yards', e.target.value)}
                className="bg-slate-700 border-slate-600 text-white mt-1.5 h-11"
              />
            </div>
            <div>
              <Label className="text-slate-400 text-xs uppercase tracking-wide">Linked Coupon</Label>
              <Select value={form.wallet_pass_id || '__none__'} onValueChange={(v) => set('wallet_pass_id', v === '__none__' ? '' : v)}>
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white mt-1.5 h-11">
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None (welcome only)</SelectItem>
                  {coupons.map(c => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          {coupons.length === 0 && (
            <p className="text-slate-500 text-xs">
              No active coupons yet — create one in the Wallet Designer to link it here.
            </p>
          )}
          <Button
            onClick={handleAdd}
            disabled={saving || !form.beacon_uid.trim()}
            className="w-full bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl py-3"
          >
            {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Adding…</> : <><Plus className="w-4 h-4 mr-2" /> Add Beacon</>}
          </Button>
        </div>
      )}

      {/* Beacon list */}
      {beacons.length === 0 ? (
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 text-center">
          <Radio className="w-8 h-8 text-slate-600 mx-auto mb-2" />
          <p className="text-slate-400 text-sm">No beacons registered yet.</p>
          <p className="text-slate-500 text-xs mt-1">Add your first beacon above to start triggering in-venue offers.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {beacons.map(beacon => (
            <div key={beacon.id} className="bg-slate-800 border border-slate-700 rounded-2xl p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-white font-medium text-sm truncate">{beacon.label || 'Unnamed beacon'}</p>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700 text-slate-300 capitalize">
                      {(beacon.zone || 'other').replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-slate-500 text-xs font-mono truncate mt-0.5">{beacon.beacon_uid}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Switch checked={beacon.is_active} onCheckedChange={() => handleToggle(beacon)} disabled={!canEdit} />
                  {canEdit && (
                    <button onClick={() => handleDelete(beacon)} className="p-1.5 rounded-lg hover:bg-red-500/15 transition-colors">
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </button>
                  )}
                </div>
              </div>

              {/* Linked coupon */}
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-amber-500 shrink-0" />
                {canEdit ? (
                  <Select value={beacon.wallet_pass_id || '__none__'} onValueChange={(v) => handleLinkCoupon(beacon, v)}>
                    <SelectTrigger className="bg-slate-700 border-slate-600 text-white h-9 text-xs flex-1">
                      <SelectValue placeholder="No coupon linked" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">No coupon (welcome only)</SelectItem>
                      {coupons.map(c => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-slate-300 text-xs">{couponName(beacon.wallet_pass_id) || 'No coupon linked'}</p>
                )}
              </div>

              {/* NFC tap-to-unlock link */}
              <div className="flex items-center gap-2 bg-slate-900/60 border border-slate-700 rounded-lg px-3 py-2">
                <Nfc className="w-4 h-4 text-amber-500 shrink-0" />
                <span className="text-slate-400 text-xs font-mono truncate flex-1">{nfcUrl(beacon)}</span>
                <button
                  onClick={() => handleCopyNfc(beacon)}
                  className="p-1.5 rounded-lg hover:bg-slate-700 transition-colors shrink-0"
                  title="Copy NFC tap-to-unlock link"
                >
                  {copiedId === beacon.id
                    ? <Check className="w-4 h-4 text-emerald-400" />
                    : <Copy className="w-4 h-4 text-slate-300" />}
                </button>
              </div>

              {/* Stats + test */}
              <div className="flex items-center justify-between gap-3 pt-1 border-t border-slate-700">
                <p className="text-slate-500 text-xs pt-2">
                  {beacon.range_yards || 20} yd range · {beacon.trigger_count || 0} trigger{beacon.trigger_count === 1 ? '' : 's'}
                  {beacon.last_triggered_at && ` · last ${new Date(beacon.last_triggered_at).toLocaleDateString()}`}
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleTest(beacon)}
                  disabled={testingId === beacon.id}
                  className="border-slate-600 text-amber-400 hover:bg-slate-700 mt-1"
                >
                  {testingId === beacon.id
                    ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Testing…</>
                    : <><Zap className="w-3.5 h-3.5 mr-1.5" /> Test Trigger</>}
                </Button>
              </div>

              {testResult?.beaconId === beacon.id && (
                <div className={`flex items-start gap-2 rounded-lg px-3 py-2 text-xs ${testResult.ok ? 'bg-emerald-500/10 text-emerald-300' : 'bg-red-500/10 text-red-300'}`}>
                  <CheckCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>{testResult.message}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}