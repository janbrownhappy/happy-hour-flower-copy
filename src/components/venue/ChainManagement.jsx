import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { manageBrandCollaborator } from '@/functions/manageBrandCollaborator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Building2, PlusCircle, Users, Mail, UserPlus, MapPin,
  CheckCircle, AlertCircle, Loader2, Trash2, Store,
} from 'lucide-react';

const roleChip = {
  owner: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  regional_manager: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
  editor: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  viewer: 'bg-slate-600/40 text-slate-300 border-slate-600',
};
const roleLabel = {
  owner: 'Brand Owner',
  regional_manager: 'Regional Manager',
  editor: 'Location Admin',
  viewer: 'Viewer',
};

/**
 * Chain / multi-location management for a corporate owner. Lets them create a
 * brand, assign their owned venues to it, invite a regional manager to a subset
 * of locations (full edit), and invite one editor (local manager) per location.
 */
export default function ChainManagement({ user, ownedVenues, onChange }) {
  const [brands, setBrands] = useState([]);
  const [collaborators, setCollaborators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newBrandName, setNewBrandName] = useState('');

  // Regional-manager invite state
  const [regionalEmail, setRegionalEmail] = useState('');
  const [regionalVenueIds, setRegionalVenueIds] = useState([]);
  const [inviting, setInviting] = useState(false);
  const [status, setStatus] = useState(null);

  // Per-location editor invite state
  const [editorEmails, setEditorEmails] = useState({}); // { venueId: email }
  const [editorBusy, setEditorBusy] = useState(null);

  useEffect(() => { loadData(); }, [user?.id]);

  const loadData = async () => {
    setLoading(true);
    const [b, c] = await Promise.all([
      base44.entities.VenueBrand.filter({ owner_id: user.id }).catch(() => []),
      base44.entities.VenueCollaborator.list().catch(() => []),
    ]);
    setBrands(b);
    setCollaborators(c);
    setLoading(false);
  };

  const brand = brands[0] || null;
  const brandVenues = ownedVenues.filter(v => brand && v.brand_id === brand.id);
  const unassigned = ownedVenues.filter(v => !v.brand_id);

  const handleCreateBrand = async () => {
    const name = newBrandName.trim();
    if (!name) return;
    setCreating(true);
    await base44.entities.VenueBrand.create({ name, owner_id: user.id });
    setNewBrandName('');
    await loadData();
    setCreating(false);
  };

  const handleAssignVenue = async (venueId) => {
    if (!brand) return;
    await base44.entities.Venue.update(venueId, { brand_id: brand.id, brand_name: brand.name });
    onChange?.();
    await loadData();
  };

  const handleUnassignVenue = async (venueId) => {
    await base44.entities.Venue.update(venueId, { brand_id: '', brand_name: '' });
    onChange?.();
    await loadData();
  };

  const toggleRegionalVenue = (venueId) => {
    setRegionalVenueIds(prev =>
      prev.includes(venueId) ? prev.filter(id => id !== venueId) : [...prev, venueId]
    );
  };

  const handleInviteRegional = async () => {
    const email = regionalEmail.trim().toLowerCase();
    if (!email || regionalVenueIds.length === 0) return;
    setInviting(true);
    setStatus(null);
    try {
      const res = await manageBrandCollaborator({
        action: 'invite',
        venueIds: regionalVenueIds,
        role: 'regional_manager',
        email,
      });
      setStatus({ type: 'success', message: res.data?.message || 'Regional manager invited.' });
      setRegionalEmail('');
      setRegionalVenueIds([]);
      onChange?.();
      await loadData();
    } catch (err) {
      setStatus({ type: 'error', message: err?.response?.data?.error || err.message || 'Failed to invite.' });
    }
    setInviting(false);
  };

  const handleInviteEditor = async (venueId) => {
    const email = (editorEmails[venueId] || '').trim().toLowerCase();
    if (!email) return;
    setEditorBusy(venueId);
    setStatus(null);
    try {
      const res = await manageBrandCollaborator({
        action: 'invite',
        venueIds: [venueId],
        role: 'editor',
        email,
      });
      setStatus({ type: 'success', message: res.data?.message || 'Manager invited.' });
      setEditorEmails(prev => ({ ...prev, [venueId]: '' }));
      onChange?.();
      await loadData();
    } catch (err) {
      setStatus({ type: 'error', message: err?.response?.data?.error || err.message || 'Failed to invite.' });
    }
    setEditorBusy(null);
  };

  const handleRemoveCollaborator = async (collab) => {
    setStatus(null);
    try {
      await manageBrandCollaborator({
        action: 'remove',
        venueIds: [collab.venue_id],
        userId: collab.user_id || undefined,
        email: collab.user_email || undefined,
      });
      onChange?.();
      await loadData();
    } catch (err) {
      setStatus({ type: 'error', message: err?.response?.data?.error || err.message || 'Failed to remove.' });
    }
  };

  const collabsForVenue = (venueId) =>
    collaborators.filter(c => c.venue_id === String(venueId));

  if (loading) {
    return (
      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 flex items-center justify-center">
        <Loader2 className="w-5 h-5 text-amber-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden">
      <div className="p-4 border-b border-slate-700 flex items-center gap-2">
        <div className="w-9 h-9 rounded-xl bg-amber-500/20 flex items-center justify-center">
          <Building2 className="w-5 h-5 text-amber-400" />
        </div>
        <div>
          <h3 className="text-white font-semibold">Chain Management</h3>
          <p className="text-slate-400 text-xs">Group your locations under a brand and manage who runs each one</p>
        </div>
      </div>

      {/* Access-level legend */}
      <div className="px-4 pt-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div className={`rounded-lg border px-2.5 py-2 ${roleChip.owner}`}>
            <p className="text-xs font-semibold">Brand Owner</p>
            <p className="text-[11px] opacity-80">You — full control of the brand & every location</p>
          </div>
          <div className={`rounded-lg border px-2.5 py-2 ${roleChip.regional_manager}`}>
            <p className="text-xs font-semibold">Regional Manager</p>
            <p className="text-[11px] opacity-80">Full edit access to a chosen subset of locations</p>
          </div>
          <div className={`rounded-lg border px-2.5 py-2 ${roleChip.editor}`}>
            <p className="text-xs font-semibold">Location Admin</p>
            <p className="text-[11px] opacity-80">Manages a single location's hours, deals & details</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-5">
        {/* Create brand */}
        {!brand ? (
          <div className="bg-slate-700/50 border border-slate-600 rounded-xl p-4 space-y-3">
            <p className="text-sm font-medium text-slate-200 flex items-center gap-2">
              <Store className="w-4 h-4 text-amber-400" /> Create Your Brand
            </p>
            <p className="text-slate-400 text-xs">
              Give your chain a name (e.g. "Eggs Up Grill"), then assign your locations to it.
            </p>
            <div className="flex gap-2">
              <Input
                value={newBrandName}
                onChange={e => setNewBrandName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreateBrand()}
                placeholder="Brand name"
                className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500"
              />
              <Button
                onClick={handleCreateBrand}
                disabled={!newBrandName.trim() || creating}
                className="bg-amber-500 hover:bg-amber-600 text-white shrink-0"
              >
                <PlusCircle className="w-4 h-4 mr-1.5" />
                {creating ? 'Creating…' : 'Create'}
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* Brand header */}
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 bg-amber-500/15 text-amber-300 border border-amber-500/30 rounded-full px-3 py-1 text-sm font-semibold">
                <Building2 className="w-3.5 h-3.5" /> {brand.name}
              </span>
              <span className="text-slate-500 text-xs">{brandVenues.length} location{brandVenues.length !== 1 ? 's' : ''}</span>
            </div>

            {/* Assign unassigned venues */}
            {unassigned.length > 0 && (
              <div className="bg-slate-700/40 border border-slate-600 rounded-xl p-3">
                <p className="text-xs font-medium text-slate-300 mb-2">Add locations to this brand</p>
                <div className="space-y-2">
                  {unassigned.map(v => (
                    <div key={v.id} className="flex items-center justify-between gap-2">
                      <span className="text-sm text-slate-200 truncate flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" /> {v.name}
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAssignVenue(v.id)}
                        className="border-amber-500/40 text-amber-300 hover:bg-amber-500/10 shrink-0 h-8"
                      >
                        Add
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Status banner */}
            {status && (
              <div className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg ${
                status.type === 'success'
                  ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                  : 'bg-red-500/10 border border-red-500/30 text-red-400'
              }`}>
                {status.type === 'success' ? <CheckCircle className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                {status.message}
              </div>
            )}

            {/* Invite regional manager */}
            {brandVenues.length > 0 && (
              <div className="bg-sky-500/5 border border-sky-500/25 rounded-xl p-4 space-y-3">
                <p className="text-sm font-medium text-slate-200 flex items-center gap-2">
                  <Users className="w-4 h-4 text-sky-400" /> Invite a Regional Manager
                </p>
                <p className="text-slate-400 text-xs">
                  Pick which locations they can manage — they get full edit access to just those.
                </p>
                <div>
                  <Label className="text-slate-400 text-xs mb-1.5 block">Locations</Label>
                  <div className="space-y-1.5">
                    {brandVenues.map(v => (
                      <label key={v.id} className="flex items-center gap-2.5 cursor-pointer">
                        <Checkbox
                          checked={regionalVenueIds.includes(v.id)}
                          onCheckedChange={() => toggleRegionalVenue(v.id)}
                        />
                        <span className="text-sm text-slate-200">{v.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Input
                    type="email"
                    value={regionalEmail}
                    onChange={e => setRegionalEmail(e.target.value)}
                    placeholder="regional@company.com"
                    className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500"
                  />
                  <Button
                    onClick={handleInviteRegional}
                    disabled={inviting || !regionalEmail.trim() || regionalVenueIds.length === 0}
                    className="bg-sky-600 hover:bg-sky-500 text-white shrink-0"
                  >
                    <UserPlus className="w-4 h-4 mr-1.5" />
                    {inviting ? 'Inviting…' : 'Invite'}
                  </Button>
                </div>
              </div>
            )}

            {/* Per-location management */}
            {brandVenues.length > 0 && (
              <div className="space-y-3">
                <p className="text-sm font-medium text-slate-200">Locations & Location Admins</p>
                {brandVenues.map(v => {
                  const vc = collabsForVenue(v.id);
                  return (
                    <div key={v.id} className="bg-slate-700/40 border border-slate-600 rounded-xl p-3 space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold text-white truncate">{v.name}</span>
                        <button
                          onClick={() => handleUnassignVenue(v.id)}
                          className="text-xs text-slate-500 hover:text-red-400 transition-colors shrink-0"
                          title="Remove from brand"
                        >
                          Unlink
                        </button>
                      </div>

                      {/* Existing collaborators (+ implicit owner) */}
                      <div className="flex flex-wrap gap-1.5">
                        <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${roleChip.owner}`}>
                          {roleLabel.owner} · You
                        </span>
                        {vc.map(c => (
                          <span key={c.id} className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${roleChip[c.role] || roleChip.viewer}`}>
                            {roleLabel[c.role] || c.role} · {c.user_email || 'member'}
                            <button
                              onClick={() => handleRemoveCollaborator(c)}
                              className="ml-0.5 hover:text-red-300"
                              title="Remove"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>

                      {/* Invite local manager */}
                      <div className="flex gap-2">
                        <Input
                          type="email"
                          value={editorEmails[v.id] || ''}
                          onChange={e => setEditorEmails(prev => ({ ...prev, [v.id]: e.target.value }))}
                          placeholder="location-admin@company.com"
                          className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500 h-9 text-sm"
                        />
                        <Button
                          size="sm"
                          onClick={() => handleInviteEditor(v.id)}
                          disabled={editorBusy === v.id || !(editorEmails[v.id] || '').trim()}
                          className="bg-blue-600 hover:bg-blue-500 text-white shrink-0 h-9"
                        >
                          <Mail className="w-3.5 h-3.5 mr-1" />
                          {editorBusy === v.id ? '…' : 'Invite'}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}