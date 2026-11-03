import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, Save, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';

const KEY = 'sms_tier_limits';
const DEFAULTS = {
  premium: { daily: 1, weekly: 2 },
  platinum: { daily: 2, weekly: 4 },
  platinum_plus: { daily: 3, weekly: 6 },
};
const TIERS = [['premium', 'Premium'], ['platinum', 'Platinum'], ['platinum_plus', 'Platinum Plus']];

export default function SmsTierLimits() {
  const [record, setRecord] = useState(null);
  const [limits, setLimits] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    base44.entities.AppSetting.filter({ key: KEY }).then((rows) => {
      let saved = {};
      try { saved = JSON.parse(rows[0]?.value_string || '{}'); } catch { saved = {}; }
      setRecord(rows[0] || null);
      setLimits(Object.fromEntries(TIERS.map(([t]) => [t, { ...DEFAULTS[t], ...saved[t] }])));
    });
  }, []);

  const set = (tier, period, v) =>
    setLimits((l) => ({ ...l, [tier]: { ...l[tier], [period]: Math.max(0, parseInt(v) || 0) } }));

  const save = async () => {
    setSaving(true);
    const value_string = JSON.stringify(limits);
    const saved = record
      ? await base44.entities.AppSetting.update(record.id, { value_string })
      : await base44.entities.AppSetting.create({ key: KEY, value_string });
    setRecord(saved);
    setSaving(false);
    toast.success('Text limits saved');
  };

  if (!limits) return <div className="p-6"><Loader2 className="w-5 h-5 animate-spin" /></div>;

  return (
    <div className="border rounded-xl p-5 bg-card mb-6">
      <h3 className="font-semibold flex items-center gap-2"><MessageSquare className="w-4 h-4" /> Fan Text (SMS) Limits by Plan</h3>
      <p className="text-sm text-muted-foreground mt-1 mb-4">How many text blasts each paid venue can send to its fans. Free venues can't send texts. Days reset at midnight, weeks on Monday.</p>
      <div className="space-y-3">
        {TIERS.map(([tier, label]) => (
          <div key={tier} className="flex items-end gap-3 flex-wrap">
            <span className="w-28 font-medium pb-2">{label}</span>
            {['daily', 'weekly'].map((p) => (
              <label key={p} className="flex flex-col gap-1 text-xs text-muted-foreground capitalize">
                {p}
                <Input type="number" min={0} value={limits[tier][p]} onChange={(e) => set(tier, p, e.target.value)} className="w-24 h-9" />
              </label>
            ))}
          </div>
        ))}
      </div>
      <Button onClick={save} disabled={saving} className="mt-4">
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save limits
      </Button>
    </div>
  );
}