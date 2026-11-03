import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';

// Production detection radius, stored in AppSetting `nearby_radius_meters`.
export default function NearbyRadiusSetting({ onLoaded }) {
  const { toast } = useToast();
  const [row, setRow] = useState(null);
  const [value, setValue] = useState('50');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    base44.entities.AppSetting.filter({ key: 'nearby_radius_meters' }).then((rows) => {
      const r = rows[0] || null;
      setRow(r);
      const v = r?.value_string || '50';
      setValue(v);
      onLoaded?.(Number(v));
    });
  }, []);

  const save = async () => {
    const n = Number(value);
    if (!Number.isFinite(n) || n <= 0) return toast({ title: 'Enter a positive number of meters', variant: 'destructive' });
    setSaving(true);
    const saved = row
      ? await base44.entities.AppSetting.update(row.id, { value_string: String(n) })
      : await base44.entities.AppSetting.create({ key: 'nearby_radius_meters', value_string: String(n) });
    setRow(saved);
    setSaving(false);
    onLoaded?.(n);
    toast({ title: `Production radius saved: ${n} m` });
  };

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <p className="font-semibold text-sm">Production detection radius</p>
      <p className="text-xs text-muted-foreground mb-3">Used by the live app. Currently <b>{row?.value_string || 50} meters</b>.</p>
      <div className="flex gap-2 max-w-xs">
        <Input type="number" value={value} onChange={(e) => setValue(e.target.value)} />
        <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
      </div>
    </div>
  );
}