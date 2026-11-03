import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Switch } from '@/components/ui/switch';
import { Star, Loader2 } from 'lucide-react';

const SETTING_KEY = 'reviews_enabled';

export default function AdminReviewsToggle() {
  const [record, setRecord] = useState(null);
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    base44.entities.AppSetting.filter({ key: SETTING_KEY })
      .then(rows => {
        setRecord(rows[0] || null);
        setEnabled(!!rows[0]?.value_bool);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const toggle = async (next) => {
    setSaving(true);
    setEnabled(next);
    try {
      if (record) {
        const updated = await base44.entities.AppSetting.update(record.id, { value_bool: next });
        setRecord(updated);
      } else {
        const created = await base44.entities.AppSetting.create({ key: SETTING_KEY, value_bool: next });
        setRecord(created);
      }
    } catch (err) {
      setEnabled(!next); // revert on failure
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-5">
      <div>
        <h2 className="font-heading font-bold text-xl flex items-center gap-2">
          <Star className="w-5 h-5 text-primary" /> Reviews
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Turn the reviews feature on or off across the whole app. When off, review sections are hidden from venue pages and the Reviews tab is removed — no data is deleted, so you can switch it back on anytime.
        </p>
      </div>

      <div className="bg-card border border-border rounded-2xl p-4 flex items-center justify-between gap-4">
        <div>
          <p className="font-semibold text-sm">Reviews enabled</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {enabled ? 'Reviews are visible throughout the app.' : 'Reviews are currently hidden everywhere.'}
          </p>
        </div>
        {loading ? (
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        ) : (
          <div className="flex items-center gap-2">
            {saving && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
            <Switch checked={enabled} onCheckedChange={toggle} disabled={saving} />
          </div>
        )}
      </div>
    </div>
  );
}