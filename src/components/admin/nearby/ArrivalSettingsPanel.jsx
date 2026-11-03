import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/use-toast';

const FIELDS = [
  ['departure_radius_meters', 'Departure radius (m)', '150'],
  ['required_arrival_readings', 'Required arrival readings', '2'],
  ['required_departure_readings', 'Required departure readings', '2'],
  ['max_arrival_accuracy_meters', 'Max arrival GPS accuracy (m)', '100'],
  ['arrival_notification_cooldown_hours', 'Cooldown per venue (hours)', '12'],
  ['max_arrival_notifications_per_24h', 'Max notifications per user / 24h', '3'],
  ['despia_location_movement_meters', 'Despia movement threshold (m) — NOT the arrival radius', '500'],
  ['despia_location_buffer_seconds', 'Despia buffer (seconds)', '60'],
  ['location_history_retention_hours', 'Despia location history retention (hours)', '24'],
  ['diagnostic_nearest_venue_radius_meters', 'Diagnostic closest-venue lookup radius (m) — diagnostics only', '2000'],
];

// Central Phase 3 arrival settings (AppSetting). Arrival radius = Phase 2 production radius above.
export default function ArrivalSettingsPanel() {
  const { toast } = useToast();
  const [rows, setRows] = useState({});
  const [vals, setVals] = useState({});
  const [enabled, setEnabled] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    base44.entities.AppSetting.filter({ key: { $in: [...FIELDS.map((f) => f[0]), 'arrival_notifications_enabled'] } }).then((list) => {
      const byKey = Object.fromEntries(list.map((r) => [r.key, r]));
      setRows(byKey);
      setVals(Object.fromEntries(FIELDS.map(([k, , d]) => [k, byKey[k]?.value_string || d])));
      setEnabled(byKey.arrival_notifications_enabled?.value_bool === true);
    });
  }, []);

  const upsert = (key, data) => rows[key] ? base44.entities.AppSetting.update(rows[key].id, data) : base44.entities.AppSetting.create({ key, ...data });

  const save = async () => {
    if (FIELDS.some(([k]) => !(Number(vals[k]) > 0))) return toast({ title: 'All values must be positive numbers', variant: 'destructive' });
    setSaving(true);
    const saved = await Promise.all([...FIELDS.map(([k]) => upsert(k, { value_string: String(Number(vals[k])) })), upsert('arrival_notifications_enabled', { value_bool: enabled })]);
    setRows(Object.fromEntries(saved.map((r) => [r.key, r])));
    setSaving(false);
    toast({ title: 'Arrival settings saved' });
  };

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-3">
      <div>
        <p className="font-semibold text-sm">Arrival Engine settings (Phase 3)</p>
        <p className="text-xs text-muted-foreground">Arrival radius uses the production detection radius above.</p>
      </div>
      <div className="flex items-center justify-between rounded-lg bg-muted p-3">
        <div>
          <p className="text-sm font-medium">Arrival push notifications: <b>{rows.arrival_notifications_enabled?.value_bool ? 'ENABLED' : 'DISABLED'}</b></p>
          <p className="text-xs text-muted-foreground">When disabled, eligible events are still created but no push is sent.</p>
        </div>
        <Switch checked={enabled} onCheckedChange={setEnabled} />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {FIELDS.map(([k, label]) => (
          <div key={k}><Label className="text-xs">{label}</Label><Input type="number" value={vals[k] || ''} onChange={(e) => setVals({ ...vals, [k]: e.target.value })} /></div>
        ))}
      </div>
      <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save arrival settings'}</Button>
    </div>
  );
}