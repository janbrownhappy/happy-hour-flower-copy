import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { ArrowLeft, History, Mail } from 'lucide-react';
import ChangelogEntryForm from '@/components/admin/changelog/ChangelogEntryForm';
import ChangelogDayGroup from '@/components/admin/changelog/ChangelogDayGroup';

const dayLabel = (iso) => {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today.getTime() - 86400000);
  const same = (a, b) => a.toDateString() === b.toDateString();
  if (same(d, today)) return 'Today';
  if (same(d, yesterday)) return 'Yesterday';
  return d.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
};

export default function AdminChangelog() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [sentMsg, setSentMsg] = useState('');
  const [pushingId, setPushingId] = useState(null);

  const load = async () => {
    setLoading(true);
    const rows = await base44.entities.ChangelogEntry.list('-created_date', 500);
    setEntries(rows);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const remove = async (entry) => {
    await base44.entities.ChangelogEntry.delete(entry.id);
    load();
  };

  const pushToFeaturebase = async (entry) => {
    setPushingId(entry.id);
    try {
      await base44.functions.invoke('pushChangelogToFeaturebase', { entry_id: entry.id });
    } catch (_e) {
      // The function records the failure on the entry; the row shows it.
    }
    setPushingId(null);
    load();
  };

  const sendNow = async () => {
    setSending(true);
    setSentMsg('');
    const res = await base44.functions.invoke('sendDailyChangelogEmail', {});
    setSentMsg(
      res?.data?.sent
        ? `Sent today's changelog (${res.data.count} change${res.data.count === 1 ? '' : 's'}).`
        : 'Could not send the email.'
    );
    setSending(false);
  };

  // Group by calendar day, newest day first (list is already newest-first).
  const groups = [];
  const when = (e) => e.change_date || e.created_date;
  [...entries].sort((a, b) => new Date(when(b)) - new Date(when(a))).forEach((e) => {
    const key = new Date(when(e)).toDateString();
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.entries.push(e);
    else groups.push({ key, label: dayLabel(when(e)), entries: [e] });
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto p-4 md:p-8">
        <Link
          to="/admin"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Admin
        </Link>

        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
            <History className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <h1 className="font-heading text-2xl font-bold">Changelog</h1>
            <p className="text-sm text-muted-foreground">
              {entries.length} entr{entries.length === 1 ? 'y' : 'ies'} · emailed nightly at 10pm
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 mb-6 mt-3">
          <Button variant="outline" size="sm" onClick={sendNow} disabled={sending}>
            <Mail className="w-3.5 h-3.5" /> {sending ? 'Sending...' : "Email today's list now"}
          </Button>
          {sentMsg && <span className="text-xs text-muted-foreground">{sentMsg}</span>}
        </div>

        <div className="mb-8">
          <ChangelogEntryForm onSaved={load} />
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-muted rounded-xl animate-pulse" />
            ))}
          </div>
        ) : groups.length === 0 ? (
          <div className="text-center py-16 bg-card border border-border rounded-xl">
            <p className="font-heading font-semibold">Nothing logged yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Add your first entry above — it'll show up in tonight's email.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {groups.map((g) => (
              <ChangelogDayGroup
                key={g.key}
                label={g.label}
                entries={g.entries}
                onDelete={remove}
                onPush={pushToFeaturebase}
                pushingId={pushingId}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}