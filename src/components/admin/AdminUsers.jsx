import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Crown, Search, Plus, Pencil, Trash2, X, Check, UserPlus, FileDown, FileUp, AlertTriangle } from 'lucide-react';
import { useRef } from 'react';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { useAdminLocation, profileInTerritory, hasTerritory } from '@/lib/AdminLocationContext';

export default function AdminUsers() {
  const { locationFilter } = useAdminLocation();
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showIncompleteOnly, setShowIncompleteOnly] = useState(false);
  const [updating, setUpdating] = useState(null);
  const [editingProfile, setEditingProfile] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('user');
  const [inviting, setInviting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [importing, setImporting] = useState(false);
  const importRef = useRef();
  const { toast } = useToast();

  useEffect(() => {
    loadProfiles();
  }, []);

  const loadProfiles = () => {
    setLoading(true);
    base44.entities.Profile.list()
      .then(p => setProfiles(p))
      .catch(() => setProfiles([]))
      .finally(() => setLoading(false));
  };

  const togglePremium = async (profile) => {
    setUpdating(profile.id);
    const newValue = !profile.is_premium;
    try {
      const updated = await base44.entities.Profile.update(profile.id, {
        is_premium: newValue,
        subscription_status: newValue ? 'active' : 'inactive',
        subscription_tier: newValue ? 'premium' : null,
      });
      setProfiles(prev => prev.map(p => p.id === profile.id ? { ...p, ...updated } : p));
    } catch (e) {
      // Stale/missing profile (e.g. deleted elsewhere) → refresh the list instead of crashing
      toast({ title: 'Could not update user', description: 'This profile may no longer exist.', variant: 'destructive' });
      loadProfiles();
    } finally {
      setUpdating(null);
    }
  };

  const openEdit = (profile) => {
    setEditingProfile(profile);
    setEditForm({
      display_name: profile.display_name || '',
      email: profile.email || '',
      phone: profile.phone || '',
      zip_code: profile.zip_code || '',
      role: profile.role || 'user',
      is_premium: !!profile.is_premium,
      subscription_tier: profile.subscription_tier || '',
    });
  };

  const saveEdit = async () => {
    setUpdating(editingProfile.id);
    try {
      const updated = await base44.entities.Profile.update(editingProfile.id, editForm);
      setProfiles(prev => prev.map(p => p.id === editingProfile.id ? { ...p, ...updated } : p));
      setEditingProfile(null);
      toast({ title: 'User updated' });
    } catch (e) {
      toast({ title: 'Could not save user', description: 'This profile may no longer exist.', variant: 'destructive' });
      loadProfiles();
      setEditingProfile(null);
    } finally {
      setUpdating(null);
    }
  };

  const deleteProfile = async () => {
    if (!confirmDelete) return;
    const id = confirmDelete.id;
    setDeletingId(id);
    setConfirmDelete(null);
    try {
      await base44.entities.Profile.delete(id);
      setProfiles(prev => prev.filter(p => p.id !== id));
      toast({ title: 'Profile deleted' });
    } catch (e) {
      // Already gone (404) → drop it from the list anyway
      setProfiles(prev => prev.filter(p => p.id !== id));
      toast({ title: 'Profile removed' });
    } finally {
      setDeletingId(null);
    }
  };

  const inviteUser = async () => {
    if (!inviteEmail.trim()) return;
    setInviting(true);
    try {
      await base44.users.inviteUser(inviteEmail.trim(), inviteRole);
      toast({ title: 'Invitation sent', description: `Invite sent to ${inviteEmail}` });
      setInviteEmail('');
      setShowInvite(false);
    } catch (e) {
      toast({ title: 'Failed to send invite', description: e.message, variant: 'destructive' });
    }
    setInviting(false);
  };

  const handleImportCSV = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = '';
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const text = ev.target.result;
      const [headerLine, ...dataLines] = text.trim().split('\n');
      const headers = headerLine.split(',').map(h => h.replace(/^"|"$/g, '').trim());
      const parseRow = (line) => {
        const cols = [];
        let cur = '', inQ = false;
        for (let i = 0; i < line.length; i++) {
          if (line[i] === '"') { inQ = !inQ; }
          else if (line[i] === ',' && !inQ) { cols.push(cur); cur = ''; }
          else { cur += line[i]; }
        }
        cols.push(cur);
        return cols;
      };
      const boolFields = ['is_premium', 'notif_push', 'notif_sms', 'notif_new_deals'];
      const arrayFields = ['notif_neighborhoods'];
      const records = dataLines.filter(l => l.trim()).map(line => {
        const cols = parseRow(line);
        const obj = {};
        headers.forEach((h, i) => {
          let val = (cols[i] || '').replace(/^"|"$/g, '').trim();
          if (!val) return;
          if (boolFields.includes(h)) obj[h] = val.toLowerCase() === 'true';
          else if (arrayFields.includes(h)) obj[h] = val.split(';').map(s => s.trim()).filter(Boolean);
          else obj[h] = val;
        });
        return obj;
      }).filter(r => r.email);
      if (!records.length) { toast({ title: 'No valid rows found', description: 'email is required', variant: 'destructive' }); return; }
      if (!confirm(`Upsert ${records.length} profiles? Records matching by email will be updated; others will be created.`)) return;
      setImporting(true);
      // Build email lookup from current profiles list
      const emailMap = Object.fromEntries(profiles.filter(p => p.email).map(p => [p.email.toLowerCase(), p.id]));
      let created = 0, updated = 0, fail = 0;
      for (const rec of records) {
        try {
          const existingId = rec.email ? emailMap[rec.email.toLowerCase()] : null;
          if (existingId) { await base44.entities.Profile.update(existingId, rec); updated++; }
          else { await base44.entities.Profile.create(rec); created++; }
        } catch { fail++; }
      }
      setImporting(false);
      loadProfiles();
      toast({ title: `Import complete`, description: `${created} created, ${updated} updated${fail ? `, ${fail} failed` : ''}` });
    };
    reader.readAsText(file);
  };

  const handleExportCSV = () => {
    const fields = [
      'display_name', 'email', 'phone', 'zip_code', 'address', 'role',
      'is_premium', 'subscription_tier', 'subscription_status', 'subscription_expires_at',
      'notif_push', 'notif_sms', 'notif_new_deals', 'notif_neighborhoods',
      'created_date', 'updated_date'
    ];

    const escape = (val) => {
      if (val === null || val === undefined) return '';
      const str = Array.isArray(val) ? val.join('; ') : String(val);
      return `"${str.replace(/"/g, '""')}"`;
    };

    const rows = [fields.join(',')];
    profiles.forEach(p => {
      rows.push(fields.map(f => escape(p[f])).join(','));
    });

    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `consumers_export_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const isIncomplete = (p) => !p.display_name?.trim() && !p.email?.trim();
  const scopedProfiles = hasTerritory(locationFilter)
    ? profiles.filter(p => profileInTerritory(p, locationFilter))
    : profiles;
  const incompleteCount = scopedProfiles.filter(isIncomplete).length;

  const filtered = scopedProfiles.filter(p => {
    if (showIncompleteOnly && !isIncomplete(p)) return false;
    return !search ||
      p.email?.toLowerCase().includes(search.toLowerCase()) ||
      p.display_name?.toLowerCase().includes(search.toLowerCase());
  });

  if (loading) {
    return <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-14 bg-muted rounded-xl animate-pulse" />)}</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            className="pl-9"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <Button onClick={handleExportCSV} size="sm" variant="outline" className="gap-1.5" disabled={profiles.length === 0}>
          <FileDown className="w-4 h-4" />
          Export CSV
        </Button>
        <Button onClick={() => importRef.current.click()} size="sm" variant="outline" className="gap-1.5" disabled={importing}>
          <FileUp className="w-4 h-4" />
          {importing ? 'Importing...' : 'Import CSV'}
        </Button>
        <input ref={importRef} type="file" accept=".csv" className="hidden" onChange={handleImportCSV} />
        <Button onClick={() => setShowInvite(true)} size="sm" className="gap-1.5">
          <UserPlus className="w-4 h-4" />
          Invite
        </Button>
      </div>

      {incompleteCount > 0 && (
        <Button
          onClick={() => setShowIncompleteOnly(v => !v)}
          size="sm"
          variant={showIncompleteOnly ? 'default' : 'outline'}
          className="gap-1.5"
        >
          <AlertTriangle className="w-4 h-4" />
          {showIncompleteOnly ? 'Showing incomplete only' : `Incomplete profiles (${incompleteCount})`}
        </Button>
      )}

      {filtered.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground">
          <p className="text-3xl mb-2">👤</p>
          <p className="text-sm">No profiles found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(profile => (
            <div key={profile.id} className="flex items-center gap-3 p-3 bg-card border border-border rounded-xl">
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} className="w-full h-full rounded-full object-cover" alt="" />
                ) : (
                  <span className="text-sm font-bold text-primary">
                    {(profile.display_name || profile.email || '?')[0].toUpperCase()}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-semibold truncate">{profile.display_name || '—'}</p>
                  {profile.is_premium && (
                    <Badge className="bg-primary text-white text-xs px-1.5 py-0"><Crown className="w-2.5 h-2.5 mr-0.5" />Premium</Badge>
                  )}
                  {isIncomplete(profile) && (
                    <Badge variant="outline" className="text-xs px-1.5 py-0 border-amber-400 text-amber-600"><AlertTriangle className="w-2.5 h-2.5 mr-0.5" />Incomplete</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate">{profile.email}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-xs text-muted-foreground">{profile.is_premium ? 'Premium' : 'Free'}</span>
                <Switch
                  checked={!!profile.is_premium}
                  onCheckedChange={() => togglePremium(profile)}
                  disabled={updating === profile.id}
                />
                <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => openEdit(profile)}>
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-7 h-7 text-destructive hover:text-destructive"
                  onClick={() => setConfirmDelete(profile)}
                  disabled={deletingId === profile.id}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Confirm Delete Dialog */}
      <Dialog open={!!confirmDelete} onOpenChange={() => setConfirmDelete(null)}>
        <DialogContent className="max-w-sm">
          <h2 className="text-lg font-semibold mb-2">Delete Profile</h2>
          <p className="text-sm text-muted-foreground mb-5">
            Delete profile for <strong>{confirmDelete?.display_name || confirmDelete?.email || 'this user'}</strong>? This cannot be undone.
          </p>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setConfirmDelete(null)}>Cancel</Button>
            <Button variant="destructive" className="flex-1" onClick={deleteProfile}>Delete</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingProfile} onOpenChange={() => setEditingProfile(null)}>
        <DialogContent className="max-w-sm">
          <h2 className="text-lg font-semibold mb-4">Edit User</h2>
          <div className="space-y-3">
            {[
              { label: 'Display Name', key: 'display_name' },
              { label: 'Email', key: 'email' },
              { label: 'Phone', key: 'phone' },
              { label: 'ZIP Code', key: 'zip_code' },
            ].map(({ label, key }) => (
              <div key={key}>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">{label}</label>
                <Input
                  value={editForm[key] || ''}
                  onChange={e => setEditForm(f => ({ ...f, [key]: e.target.value }))}
                />
              </div>
            ))}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Role</label>
              <Select value={editForm.role || 'user'} onValueChange={val => setEditForm(f => ({ ...f, role: val }))}>
                <SelectTrigger className="w-full h-11"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="venue_owner">Venue Owner</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Subscription Tier</label>
              <Select value={editForm.subscription_tier || 'free'} onValueChange={val => setEditForm(f => ({ ...f, subscription_tier: val === 'free' ? '' : val }))}>
                <SelectTrigger className="w-full h-11"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">Free</SelectItem>
                  <SelectItem value="premium">Premium</SelectItem>
                  <SelectItem value="platinum">Platinum</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-2 mt-5">
            <Button variant="outline" className="flex-1" onClick={() => setEditingProfile(null)}>Cancel</Button>
            <Button className="flex-1" onClick={saveEdit} disabled={updating === editingProfile?.id}>
              <Check className="w-4 h-4 mr-1" /> Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Invite Dialog */}
      <Dialog open={showInvite} onOpenChange={setShowInvite}>
        <DialogContent className="max-w-sm">
          <h2 className="text-lg font-semibold mb-4">Invite User</h2>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Email Address</label>
              <Input
                type="email"
                placeholder="user@example.com"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && inviteUser()}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Role</label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger className="w-full h-11"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="venue_owner">Venue Owner</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-2 mt-5">
            <Button variant="outline" className="flex-1" onClick={() => setShowInvite(false)}>Cancel</Button>
            <Button className="flex-1" onClick={inviteUser} disabled={inviting || !inviteEmail.trim()}>
              <UserPlus className="w-4 h-4 mr-1" /> {inviting ? 'Sending…' : 'Send Invite'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}