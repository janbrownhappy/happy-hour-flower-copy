import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { StickyNote, Lock, Crown, Pencil, Check, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useSubscription } from '@/lib/SubscriptionContext';

export default function VenueNoteCard({ venueId, venueName }) {
  const navigate = useNavigate();
  const { isPremium } = useSubscription();
  const [user, setUser] = useState(null);
  const [record, setRecord] = useState(null);
  const [text, setText] = useState('');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const authed = await base44.auth.isAuthenticated();
        if (!authed) { setLoading(false); return; }
        const me = await base44.auth.me();
        setUser(me);
        const notes = await base44.entities.VenueNote.filter({ venue_id: venueId, user_id: me.id });
        if (notes[0]) {
          setRecord(notes[0]);
          setText(notes[0].note || '');
        }
      } catch (_) {
        // non-critical
      }
      setLoading(false);
    };
    load();
  }, [venueId]);

  const save = async () => {
    if (!user) return;
    setSaving(true);
    try {
      if (record) {
        const updated = await base44.entities.VenueNote.update(record.id, { note: text });
        setRecord(updated);
      } else {
        const created = await base44.entities.VenueNote.create({ venue_id: venueId, user_id: user.id, note: text });
        setRecord(created);
      }
      setEditing(false);
    } catch (_) {}
    setSaving(false);
  };

  const remove = async () => {
    if (!record) return;
    setSaving(true);
    try {
      await base44.entities.VenueNote.delete(record.id);
      setRecord(null);
      setText('');
      setEditing(false);
    } catch (_) {}
    setSaving(false);
  };

  if (loading) return null;

  // Locked state for free consumers
  if (!isPremium) {
    return (
      <div>
        <h2 className="font-semibold mb-2 flex items-center gap-2">
          <StickyNote className="w-4 h-4" /> My Note
          <Badge />
        </h2>
        <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center flex-shrink-0">
            <Lock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-900">Add a private note</p>
            <p className="text-xs text-amber-700">Upgrade to Premium to save personal notes on venues</p>
          </div>
          <Button size="sm" className="flex-shrink-0 bg-amber-500 hover:bg-amber-600 text-white" onClick={() => navigate('/plans/consumer')}>
            <Crown className="w-3.5 h-3.5 mr-1" /> Upgrade
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="font-semibold mb-2 flex items-center gap-2">
        <StickyNote className="w-4 h-4" /> My Note
      </h2>
      {editing || !record ? (
        <div className="space-y-2">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={`Add a private note about ${venueName || 'this venue'}…`}
            rows={3}
            className="resize-none"
          />
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={save} disabled={saving || !text.trim()}>
              <Check className="w-3.5 h-3.5 mr-1" /> {saving ? 'Saving…' : 'Save'}
            </Button>
            {record && (
              <Button size="sm" variant="ghost" onClick={() => { setText(record.note || ''); setEditing(false); }}>
                Cancel
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="p-3 bg-card border border-border rounded-xl">
          <p className="text-sm whitespace-pre-wrap leading-relaxed">{record.note}</p>
          <div className="flex items-center gap-2 mt-2">
            <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
              <Pencil className="w-3.5 h-3.5 mr-1" /> Edit
            </Button>
            <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={remove} disabled={saving}>
              <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function Badge() {
  return (
    <span className="bg-amber-500 text-white text-xs flex items-center gap-1 px-2 py-0.5 rounded-md font-semibold">
      <Crown className="w-3 h-3" /> Premium
    </span>
  );
}