import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UserPlus, Trash2, ShieldCheck, ExternalLink, UserCheck, Clock } from 'lucide-react';

export default function StaffManager({ venueId, venueName }) {
  const [staffList, setStaffList] = useState([]);
  const [pendingStaff, setPendingStaff] = useState([]);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [assigning, setAssigning] = useState(null);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    loadStaff();
  }, [venueId]);

  const loadStaff = async () => {
    setLoading(true);
    // User.list() only succeeds for admins; venue owners get a permission error.
    // Fall back to an empty list so the page never crashes.
    const users = await base44.entities.User.list().catch(() => []);
    // Assigned to this venue
    const staff = users.filter(u => u.role === 'venue_staff' && u.venue_id === venueId);
    // Registered as venue_staff but not yet assigned to any venue
    const pending = users.filter(u => u.role === 'venue_staff' && !u.venue_id);
    setStaffList(staff);
    setPendingStaff(pending);
    setLoading(false);
  };

  const handleAssign = async (staffUser) => {
    setAssigning(staffUser.id);
    await base44.entities.User.update(staffUser.id, { venue_id: venueId });
    await loadStaff();
    setAssigning(null);
  };

  const handleInvite = async () => {
    if (!email.trim()) return;
    setInviting(true);
    setMessage(null);
    try {
      await base44.users.inviteUser(email.trim(), 'venue_staff');
      setMessage({ type: 'success', text: `Invite sent to ${email}. Ask them to check their email and sign in — then assign their venue below.` });
      setEmail('');
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to send invite.' });
    }
    setInviting(false);
  };

  const handleRemove = async (staffUser) => {
    if (!confirm(`Remove ${staffUser.full_name || staffUser.email} from staff?`)) return;
    await base44.entities.User.update(staffUser.id, { role: 'user', venue_id: null });
    loadStaff();
  };

  const staffRedeemUrl = `${window.location.origin}/staff-redeem/${venueId}`;

  return (
    <div className="space-y-5">
      {/* Staff Redeem Link */}
      <div className="bg-amber-500/10 border border-amber-500/25 rounded-xl p-4">
        <p className="text-amber-300 text-xs font-semibold uppercase tracking-wide mb-1">Staff Validator URL</p>
        <p className="text-slate-300 text-xs mb-2">Share this link with your staff so they can access the pass validator.</p>
        <div className="flex items-center gap-2">
          <code className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-amber-400 font-mono truncate">
            {staffRedeemUrl}
          </code>
          <Button
            size="sm"
            variant="outline"
            className="border-slate-600 text-slate-300 hover:bg-slate-700 shrink-0"
            onClick={() => window.open(staffRedeemUrl, '_blank')}
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Invite new staff */}
      <div>
        <Label className="text-slate-400 text-xs uppercase tracking-wide">Invite Staff Member</Label>
        <div className="flex gap-2 mt-2">
          <Input
            type="email"
            placeholder="staff@yourvenue.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleInvite()}
            className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500"
          />
          <Button
            onClick={handleInvite}
            disabled={inviting || !email.trim()}
            className="bg-amber-500 hover:bg-amber-600 text-white shrink-0"
          >
            <UserPlus className="w-4 h-4 mr-1" />
            {inviting ? 'Sending…' : 'Invite'}
          </Button>
        </div>
        {message && (
          <p className={`text-xs mt-2 ${message.type === 'success' ? 'text-emerald-400' : 'text-red-400'}`}>
            {message.text}
          </p>
        )}
        <p className="text-slate-500 text-xs mt-2">
          Staff members can only access the pass validator — they cannot edit venue details or view customer data.
        </p>
      </div>

      {/* Pending assignment */}
      {pendingStaff.length > 0 && (
        <div>
          <Label className="text-slate-400 text-xs uppercase tracking-wide flex items-center gap-1.5">
            <Clock className="w-3 h-3 text-amber-400" />
            Pending Assignment ({pendingStaff.length})
          </Label>
          <p className="text-slate-500 text-xs mt-1 mb-2">These staff members signed up but haven't been assigned to a venue yet. Tap "Assign" to grant them access to this venue's validator.</p>
          <div className="mt-2 space-y-2">
            {pendingStaff.map(s => (
              <div key={s.id} className="flex items-center justify-between bg-amber-500/5 border border-amber-500/20 rounded-xl px-4 py-3">
                <div>
                  <p className="text-white text-sm font-medium">{s.full_name || '—'}</p>
                  <p className="text-slate-500 text-xs">{s.email}</p>
                </div>
                <Button
                  size="sm"
                  onClick={() => handleAssign(s)}
                  disabled={assigning === s.id}
                  className="bg-amber-500 hover:bg-amber-600 text-white shrink-0"
                >
                  <UserCheck className="w-3.5 h-3.5 mr-1" />
                  {assigning === s.id ? 'Assigning…' : 'Assign'}
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Current staff list */}
      <div>
        <Label className="text-slate-400 text-xs uppercase tracking-wide">
          Current Staff ({loading ? '…' : staffList.length})
        </Label>
        {loading ? (
          <div className="mt-2 space-y-2">
            {[1, 2].map(i => <div key={i} className="h-12 bg-slate-700/40 rounded-xl animate-pulse" />)}
          </div>
        ) : staffList.length === 0 ? (
          <div className="mt-2 border border-dashed border-slate-700 rounded-xl py-6 text-center">
            <ShieldCheck className="w-6 h-6 text-slate-600 mx-auto mb-2" />
            <p className="text-slate-500 text-sm">No staff members yet</p>
          </div>
        ) : (
          <div className="mt-2 space-y-2">
            {staffList.map(s => (
              <div key={s.id} className="flex items-center justify-between bg-slate-800 border border-slate-700 rounded-xl px-4 py-3">
                <div>
                  <p className="text-white text-sm font-medium">{s.full_name || '—'}</p>
                  <p className="text-slate-500 text-xs">{s.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    Staff
                  </span>
                  <button
                    onClick={() => handleRemove(s)}
                    className="p-1.5 rounded-lg hover:bg-red-500/15 text-red-400 transition-colors"
                    title="Remove staff"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}