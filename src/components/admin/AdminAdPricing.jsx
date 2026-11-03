import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Loader2, Save, Check } from 'lucide-react';

// Admin-editable ad pricing. Two one-time tiers (weekday/weekend), each mapped
// to a Stripe Price id used by createAdCheckout.
export default function AdminAdPricing() {
  const [pricing, setPricing] = useState(null);
  const [form, setForm] = useState({ weekday_price: '', weekend_price: '', weekday_stripe_price_id: '', weekend_stripe_price_id: '', is_active: true });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    base44.entities.AdPricing.list().then(list => {
      const p = list[0];
      if (p) {
        setPricing(p);
        setForm({
          weekday_price: p.weekday_price ?? '',
          weekend_price: p.weekend_price ?? '',
          weekday_stripe_price_id: p.weekday_stripe_price_id || '',
          weekend_stripe_price_id: p.weekend_stripe_price_id || '',
          is_active: p.is_active !== false,
        });
      }
      setLoading(false);
    });
  }, []);

  const save = async () => {
    setSaving(true);
    setSaved(false);
    const data = {
      weekday_price: Number(form.weekday_price) || 0,
      weekend_price: Number(form.weekend_price) || 0,
      weekday_stripe_price_id: form.weekday_stripe_price_id.trim(),
      weekend_stripe_price_id: form.weekend_stripe_price_id.trim(),
      is_active: form.is_active,
    };
    if (pricing) {
      await base44.entities.AdPricing.update(pricing.id, data);
    } else {
      const created = await base44.entities.AdPricing.create(data);
      setPricing(created);
    }
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  if (loading) return <div className="py-12 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-5 max-w-xl">
      <div>
        <h2 className="text-xl font-heading font-bold">Ad Pricing</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Set one-time prices for ad placements. Each tier needs a Stripe Price id (one-time) so checkout can charge it.
        </p>
      </div>

      <div className="flex items-center justify-between border border-border rounded-xl p-4 bg-card">
        <div>
          <p className="font-medium text-sm">Ad sales enabled</p>
          <p className="text-xs text-muted-foreground">Turn off to stop accepting new ad purchases.</p>
        </div>
        <Switch checked={form.is_active} onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="border border-border rounded-xl p-4 bg-card space-y-3">
          <p className="font-semibold text-sm">Weekday (Mon–Fri)</p>
          <div className="space-y-1.5">
            <Label className="text-xs">Price (USD)</Label>
            <Input type="number" value={form.weekday_price} onChange={e => setForm(f => ({ ...f, weekday_price: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Stripe Price ID</Label>
            <Input value={form.weekday_stripe_price_id} onChange={e => setForm(f => ({ ...f, weekday_stripe_price_id: e.target.value }))} placeholder="price_..." />
          </div>
        </div>

        <div className="border border-border rounded-xl p-4 bg-card space-y-3">
          <p className="font-semibold text-sm">Weekend (Sat–Sun)</p>
          <div className="space-y-1.5">
            <Label className="text-xs">Price (USD)</Label>
            <Input type="number" value={form.weekend_price} onChange={e => setForm(f => ({ ...f, weekend_price: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Stripe Price ID</Label>
            <Input value={form.weekend_stripe_price_id} onChange={e => setForm(f => ({ ...f, weekend_stripe_price_id: e.target.value }))} placeholder="price_..." />
          </div>
        </div>
      </div>

      <Button onClick={save} disabled={saving} className="gap-2">
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
        {saved ? 'Saved' : 'Save Pricing'}
      </Button>
    </div>
  );
}