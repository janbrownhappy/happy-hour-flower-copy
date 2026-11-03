import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { notifySlack } from '@/functions/notifySlack';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Send } from 'lucide-react';
import { toast } from 'sonner';

const FIELDS = [
  { key: 'slack_channel_claims', label: 'Venue claims destination', category: 'claims', hint: 'Channel ID (C…) or #name, or a user ID (U…) for DMs' },
  { key: 'slack_channel_venues', label: 'Venue changes destination', category: 'venues' },
  { key: 'slack_channel_accounts', label: 'Account activity destination', category: 'accounts' },
  { key: 'slack_channel_venue_free', label: 'Venue-free destination', category: 'venue_free', hint: 'New free-tier venue signups' },
  { key: 'slack_channel_venue_paid', label: 'Venue-paid destination', category: 'venue_paid', hint: 'New paid-tier venue signups and upgrades' },
  { key: 'slack_channel_free', label: 'Free consumer signups destination', category: 'free' },
  { key: 'slack_channel_paid', label: 'Paid consumer signups destination', category: 'paid' },
  { key: 'slack_bot_name', label: 'Bot display name', hint: 'Default: Happy Hour Flower' },
  { key: 'slack_bot_icon', label: 'Bot icon', hint: 'Emoji like :tulip: or an image URL. Default: app logo' },
];

export default function SlackNotificationSettings() {
  const [values, setValues] = useState({});
  const [records, setRecords] = useState({});
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(null);

  useEffect(() => {
    base44.entities.AppSetting.filter({ key: { $in: FIELDS.map((f) => f.key) } }).then((rows) => {
      setRecords(Object.fromEntries(rows.map((r) => [r.key, r])));
      setValues(Object.fromEntries(rows.map((r) => [r.key, r.value_string || ''])));
    });
  }, []);

  const save = async () => {
    setSaving(true);
    const next = { ...records };
    for (const f of FIELDS) {
      const v = (values[f.key] || '').trim();
      if (next[f.key]) await base44.entities.AppSetting.update(next[f.key].id, { value_string: v });
      else if (v) next[f.key] = await base44.entities.AppSetting.create({ key: f.key, value_string: v });
    }
    setRecords(next);
    setSaving(false);
    toast.success('Slack settings saved');
  };

  const test = async (category) => {
    setTesting(category);
    try {
      const res = await notifySlack({ category, event: 'test', data: { text: `:sparkles: Test alert for ${category}` } });
      res.data.skipped ? toast.error('Save a destination first') : toast.success('Test message sent');
    } catch (e) {
      toast.error(e?.response?.data?.error || e.message);
    }
    setTesting(null);
  };

  return (
    <div className="max-w-xl space-y-5">
      <div>
        <h2 className="text-xl font-heading font-bold">Slack Notifications</h2>
        <p className="text-sm text-muted-foreground mt-1">Alerts post from the Slack Bot. For private channels, invite the bot first.</p>
      </div>
      {FIELDS.map((f) => (
        <div key={f.key} className="space-y-1.5">
          <Label>{f.label}</Label>
          <div className="flex gap-2">
            <Input value={values[f.key] || ''} onChange={(e) => setValues({ ...values, [f.key]: e.target.value })} />
            {f.category && (
              <Button variant="outline" onClick={() => test(f.category)} disabled={testing === f.category}>
                {testing === f.category ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            )}
          </div>
          {f.hint && <p className="text-xs text-muted-foreground">{f.hint}</p>}
        </div>
      ))}
      <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save settings'}</Button>
    </div>
  );
}