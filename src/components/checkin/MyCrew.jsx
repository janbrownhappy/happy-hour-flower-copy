import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { sendCrewInvite } from '@/functions/sendCrewInvite';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Users, Mail, Phone, UserPlus, Loader2, Trash2, Check, ChevronDown, ChevronUp } from 'lucide-react';

export default function MyCrew({ userId }) {
  const [crew, setCrew] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [method, setMethod] = useState('email');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [sentMsg, setSentMsg] = useState('');

  const loadCrew = () => {
    base44.entities.CrewMember.filter({ created_by_id: userId }, '-created_date')
      .then(setCrew)
      .finally(() => setLoading(false));
  };

  useEffect(() => { if (userId) loadCrew(); }, [userId]);

  const handleInvite = async () => {
    setError('');
    setSentMsg('');
    if (method === 'email' && !email.trim()) { setError('Please enter an email address.'); return; }
    if (method === 'sms' && !phone.trim()) { setError('Please enter a phone number.'); return; }
    setSending(true);
    try {
      const res = await sendCrewInvite({
        method,
        name: name.trim() || undefined,
        email: method === 'email' ? email.trim() : undefined,
        phone: method === 'sms' ? phone.trim() : undefined,
      });
      if (res.data?.success) {
        await base44.entities.CrewMember.create({
          owner_id: userId,
          name: name.trim() || undefined,
          email: method === 'email' ? email.trim() : undefined,
          phone: method === 'sms' ? phone.trim() : undefined,
          invite_method: method,
          status: 'invited',
        });
        setSentMsg('Invite sent! 🎉');
        setName(''); setEmail(''); setPhone('');
        loadCrew();
      } else {
        setError(res.data?.error || 'Failed to send invite.');
      }
    } catch (e) {
      setError(e.response?.data?.error || e.message || 'Failed to send invite.');
    } finally {
      setSending(false);
    }
  };

  const removeMember = async (id) => {
    setCrew(prev => prev.filter(c => c.id !== id));
    await base44.entities.CrewMember.delete(id).catch(loadCrew);
  };

  return (
    <div className="bg-card border border-border rounded-2xl mb-4 overflow-hidden">
      <button
        onClick={() => setExpanded(p => !p)}
        className="w-full flex items-center justify-between p-4 hover:bg-muted/40 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Users className="w-5 h-5 text-primary" />
          <div className="text-left">
            <p className="font-semibold text-sm">My Crew{crew.length > 0 ? ` (${crew.length})` : ''}</p>
            <p className="text-xs text-muted-foreground">Invite friends & share your check-ins</p>
          </div>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>

      {expanded && (
        <div className="border-t border-border p-4 space-y-4">
          {/* Invite form */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Invite a friend</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setMethod('email')}
                className={`flex items-center justify-center gap-1.5 text-sm py-2 rounded-lg border transition-colors ${method === 'email' ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border text-muted-foreground'}`}
              >
                <Mail className="w-4 h-4" /> Email
              </button>
              <button
                onClick={() => setMethod('sms')}
                className={`flex items-center justify-center gap-1.5 text-sm py-2 rounded-lg border transition-colors ${method === 'sms' ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border text-muted-foreground'}`}
              >
                <Phone className="w-4 h-4" /> SMS
              </button>
            </div>
            <Input placeholder="Friend's name (optional)" value={name} onChange={(e) => setName(e.target.value)} />
            {method === 'email' ? (
              <Input type="email" placeholder="friend@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            ) : (
              <Input type="tel" placeholder="(555) 123-4567" value={phone} onChange={(e) => setPhone(e.target.value)} />
            )}
            {error && <p className="text-xs text-destructive">{error}</p>}
            {sentMsg && <p className="text-xs text-green-600 flex items-center gap-1"><Check className="w-3 h-3" /> {sentMsg}</p>}
            <Button onClick={handleInvite} disabled={sending} className="w-full">
              {sending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending…</> : <><UserPlus className="w-4 h-4 mr-2" /> Send Invite</>}
            </Button>
          </div>

          {/* Crew list */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Your Crew</p>
            {loading ? (
              <div className="space-y-2">{[1,2].map(i => <div key={i} className="h-10 bg-muted rounded-lg animate-pulse" />)}</div>
            ) : crew.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2">No crew members yet. Invite a friend above!</p>
            ) : (
              <div className="space-y-2">
                {crew.map(m => (
                  <div key={m.id} className="flex items-center gap-3 bg-muted/30 rounded-lg p-2.5">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      {m.invite_method === 'sms' ? <Phone className="w-4 h-4 text-primary" /> : <Mail className="w-4 h-4 text-primary" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{m.name || m.email || m.phone}</p>
                      <p className="text-xs text-muted-foreground truncate">{m.email || m.phone}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${m.status === 'joined' ? 'bg-green-100 text-green-700' : 'bg-muted text-muted-foreground'}`}>
                      {m.status === 'joined' ? 'Joined' : 'Invited'}
                    </span>
                    <button onClick={() => removeMember(m.id)} className="text-muted-foreground hover:text-destructive p-1">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}