import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { listMailerLiteGroups } from '@/functions/listMailerLiteGroups';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Mail, RefreshCw, CheckCircle2, AlertTriangle } from 'lucide-react';

const TRIGGERS = [
  { key: 'consumer_signup', label: 'Consumer Sign-Up', desc: 'A new consumer completes onboarding (free tier).' },
  { key: 'consumer_premium', label: 'Consumer Goes Premium', desc: 'A consumer upgrades to a paid tier.' },
  { key: 'waitlist_signup', label: 'Waitlist Sign-Up', desc: 'Someone joins the waitlist from the landing page.' },
  { key: 'lead_consumer', label: 'Lead — Consumer', desc: 'A consumer lead is captured.' },
  { key: 'lead_venue_owner', label: 'Lead — Venue Owner', desc: 'A venue-owner lead is captured.' },
  { key: 'venue_active', label: 'Venue Becomes Active', desc: 'A venue is created or activated.' },
];

export default function MailerLiteIntegration() {
  const [groups, setGroups] = useState([]);
  const [maps, setMaps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [savingKey, setSavingKey] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [groupsRes, mapsRes] = await Promise.all([
        listMailerLiteGroups(),
        base44.entities.MailerLiteGroupMap.list(),
      ]);
      setGroups(groupsRes?.data?.groups || []);
      setMaps(mapsRes || []);
    } catch (e) {
      setError(e?.response?.data?.error || e.message || 'Failed to load MailerLite data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const mapFor = (key) => maps.find(m => m.trigger_key === key);

  const handleGroupChange = async (triggerKey, groupId) => {
    setSavingKey(triggerKey);
    try {
      const existing = mapFor(triggerKey);
      const group = groups.find(g => String(g.id) === String(groupId));
      if (!groupId) {
        if (existing) await base44.entities.MailerLiteGroupMap.delete(existing.id);
      } else if (existing) {
        await base44.entities.MailerLiteGroupMap.update(existing.id, { group_id: groupId, group_name: group?.name || '' });
      } else {
        await base44.entities.MailerLiteGroupMap.create({ trigger_key: triggerKey, group_id: groupId, group_name: group?.name || '', is_active: true });
      }
      const mapsRes = await base44.entities.MailerLiteGroupMap.list();
      setMaps(mapsRes || []);
    } finally {
      setSavingKey('');
    }
  };

  const handleToggle = async (triggerKey, isActive) => {
    const existing = mapFor(triggerKey);
    if (!existing) return;
    setSavingKey(triggerKey);
    try {
      await base44.entities.MailerLiteGroupMap.update(existing.id, { is_active: isActive });
      const mapsRes = await base44.entities.MailerLiteGroupMap.list();
      setMaps(mapsRes || []);
    } finally {
      setSavingKey('');
    }
  };

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <Mail className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-heading font-bold leading-tight">MailerLite Automation</h2>
            <p className="text-xs text-muted-foreground">Route user activity into MailerLite groups to trigger email sequences.</p>
          </div>
        </div>
        <Button size="sm" variant="outline" className="gap-1.5" onClick={load} disabled={loading}>
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {error && (
        <div className="flex items-start gap-2 p-3 mt-3 bg-destructive/10 border border-destructive/30 rounded-lg text-sm text-destructive">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {!error && !loading && (
        <p className="text-xs text-muted-foreground mt-3 mb-1">
          {groups.length} group{groups.length !== 1 ? 's' : ''} found in your MailerLite account. Assign a group to each app event below — when the event fires, the subscriber is added to that group, which can start any MailerLite automation tied to it.
        </p>
      )}

      <div className="mt-4 space-y-2.5">
        {TRIGGERS.map((t) => {
          const m = mapFor(t.key);
          const busy = savingKey === t.key;
          return (
            <div key={t.key} className="border border-border rounded-xl p-3.5 bg-card">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm">{t.label}</p>
                    {m?.group_id && m?.is_active && <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{t.desc}</p>
                </div>
                {m?.group_id && (
                  <Switch
                    checked={!!m.is_active}
                    onCheckedChange={(v) => handleToggle(t.key, v)}
                    disabled={busy}
                  />
                )}
              </div>
              <div className="mt-2.5">
                <select
                  value={m?.group_id || ''}
                  onChange={(e) => handleGroupChange(t.key, e.target.value)}
                  disabled={busy || loading}
                  className="w-full h-9 px-3 text-sm bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
                >
                  <option value="">— No group (skip) —</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}{typeof g.active_count === 'number' ? ` (${g.active_count})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}