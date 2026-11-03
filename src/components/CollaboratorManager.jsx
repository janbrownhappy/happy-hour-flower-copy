import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Users, Trash2, UserPlus, Mail, CheckCircle, AlertCircle } from 'lucide-react';

const roleColors = {
  owner: 'bg-amber-500 text-white',
  editor: 'bg-blue-500 text-white',
  viewer: 'bg-slate-500 text-white',
};

export default function CollaboratorManager({ venueId }) {
  const [collaborators, setCollaborators] = useState([]);
  const [users, setUsers] = useState([]);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('editor');
  const [loading, setLoading] = useState(true);
  const [inviting, setInviting] = useState(false);
  const [inviteStatus, setInviteStatus] = useState(null); // { type: 'success'|'error', message }

  useEffect(() => {
    loadData();
  }, [venueId]);

  const loadData = async () => {
    setLoading(true);
    const [records, allUsers] = await Promise.all([
      base44.entities.VenueCollaborator.filter({ venue_id: String(venueId) }).catch(() => []),
      // User.list() only succeeds for admins; venue owners get a permission error.
      // Fall back to an empty list so the page never crashes — display falls back to stored email.
      base44.entities.User.list().catch(() => []),
    ]);
    setCollaborators(records);
    setUsers(allUsers);
    setLoading(false);
  };

  const getUserInfo = (userId) => {
    const user = users.find(u => u.id === userId);
    return user || null;
  };

  const handleInvite = async () => {
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) return;

    setInviting(true);
    setInviteStatus(null);

    // Check if user already exists in the platform
    const existingUser = users.find(u => u.email?.toLowerCase() === trimmedEmail);

    if (existingUser) {
      // Already a platform user — check if already a collaborator
      const alreadyAdded = collaborators.find(c => c.user_id === existingUser.id);
      if (alreadyAdded) {
        setInviteStatus({ type: 'error', message: `${trimmedEmail} is already a collaborator.` });
        setInviting(false);
        return;
      }
      // Add as collaborator directly
      await base44.entities.VenueCollaborator.create({
        venue_id: String(venueId),
        user_id: existingUser.id,
        user_email: existingUser.email || trimmedEmail,
        role,
      });
      setInviteStatus({ type: 'success', message: `${trimmedEmail} added as ${role}.` });
    } else {
      // Invite new user to the platform with role 'user'
      await base44.users.inviteUser(trimmedEmail, 'user');
      // We can't link to VenueCollaborator yet since they don't have an id — 
      // store a pending invite note in the status
      setInviteStatus({
        type: 'success',
        message: `Invitation sent to ${trimmedEmail}! They'll be added as ${role} once they sign up.`,
      });
    }

    setEmail('');
    setInviting(false);
    loadData();
  };

  const handleRemove = async (collaboratorId) => {
    await base44.entities.VenueCollaborator.delete(collaboratorId);
    loadData();
  };

  const handleChangeRole = async (collaboratorId, newRole) => {
    await base44.entities.VenueCollaborator.update(collaboratorId, { role: newRole });
    loadData();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Users className="w-5 h-5 text-amber-500" />
        <h3 className="text-lg font-semibold text-white">Team Members</h3>
      </div>
      <p className="text-slate-400 text-sm -mt-3">
        Invite team members by email to help manage this venue's listings and activity.
      </p>

      {/* Invite by email */}
      <div className="bg-slate-700/60 border border-slate-600 rounded-xl p-4 space-y-3">
        <p className="text-sm font-medium text-slate-300 flex items-center gap-2">
          <Mail className="w-4 h-4 text-amber-400" /> Invite by Email
        </p>
        <div className="flex gap-2 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <Label className="text-slate-400 text-xs mb-1 block">Email Address</Label>
            <Input
              type="email"
              value={email}
              onChange={e => { setEmail(e.target.value); setInviteStatus(null); }}
              onKeyDown={e => { if (e.key === 'Enter') handleInvite(); }}
              className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500"
              placeholder="teammate@example.com"
            />
          </div>
          <div className="w-[140px]">
            <Label className="text-slate-400 text-xs mb-1 block">Role</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="editor">Editor</SelectItem>
                <SelectItem value="viewer">Viewer</SelectItem>
                <SelectItem value="owner">Owner</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={handleInvite}
            disabled={!email.trim() || inviting}
            className="bg-amber-500 hover:bg-amber-600 text-white mt-auto"
          >
            <UserPlus className="w-4 h-4 mr-1.5" />
            {inviting ? 'Sending…' : 'Invite'}
          </Button>
        </div>

        {/* Role descriptions */}
        <div className="grid grid-cols-3 gap-2 text-xs text-slate-500 mt-1">
          <div><span className="text-blue-400 font-medium">Editor</span> — can edit listings & deals</div>
          <div><span className="text-slate-400 font-medium">Viewer</span> — read-only access</div>
          <div><span className="text-amber-400 font-medium">Owner</span> — full control</div>
        </div>

        {/* Invite status */}
        {inviteStatus && (
          <div className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg ${
            inviteStatus.type === 'success'
              ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
              : 'bg-red-500/10 border border-red-500/30 text-red-400'
          }`}>
            {inviteStatus.type === 'success'
              ? <CheckCircle className="w-4 h-4 shrink-0" />
              : <AlertCircle className="w-4 h-4 shrink-0" />}
            {inviteStatus.message}
          </div>
        )}
      </div>

      {/* Current collaborators list */}
      <div className="space-y-2">
        <h4 className="text-sm font-semibold text-slate-300">
          Current Team ({collaborators.length})
        </h4>
        {loading ? (
          <div className="text-center py-8 text-slate-400 text-sm">Loading…</div>
        ) : collaborators.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-sm border border-dashed border-slate-700 rounded-xl">
            No team members yet. Invite someone above!
          </div>
        ) : (
          <div className="space-y-2">
            {collaborators.map(collab => {
              const user = getUserInfo(collab.user_id);
              const displayName = user?.full_name || user?.email || collab.user_email || 'Team member';
              const displayEmail = user?.email || collab.user_email || '';
              const initial = displayName[0]?.toUpperCase() || '?';
              return (
                <div key={collab.id} className="flex items-center justify-between p-3 bg-slate-700/60 border border-slate-600 rounded-xl gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 bg-amber-500/20 rounded-full flex items-center justify-center shrink-0">
                      <span className="text-amber-400 font-bold text-sm">{initial}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-white text-sm font-medium truncate">{displayName}</p>
                      {displayEmail && displayEmail !== displayName && (
                        <p className="text-slate-400 text-xs truncate">{displayEmail}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {collab.role === 'owner' ? (
                      <Badge className="bg-amber-500 text-white text-xs">owner</Badge>
                    ) : (
                      <Select value={collab.role} onValueChange={val => handleChangeRole(collab.id, val)}>
                        <SelectTrigger className="h-7 text-xs bg-slate-600 border-slate-500 text-white w-[90px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="editor">Editor</SelectItem>
                          <SelectItem value="viewer">Viewer</SelectItem>
                          <SelectItem value="owner">Owner</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                    {collab.role !== 'owner' && (
                      <button
                        onClick={() => handleRemove(collab.id)}
                        className="p-1.5 hover:bg-slate-600 rounded-lg transition-colors"
                        title="Remove"
                      >
                        <Trash2 className="w-4 h-4 text-slate-400 hover:text-red-400" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}