import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trash2, AlertTriangle } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';

// Lets a venue owner permanently delete their account along with all their
// owned venues and the business records tied to those venues.
export default function DeleteVenueAccountSection({ user, venues }) {
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(null);

  const canDelete = confirmText.trim().toUpperCase() === 'DELETE';

  const handleDelete = async () => {
    if (!canDelete) return;
    setDeleting(true);
    setError(null);
    try {
      const ownedVenues = (venues || []).filter(v => v.owner_id === user.id);
      // deleteVenue cleans up each venue and all of its associated records.
      for (const v of ownedVenues) {
        await base44.functions.deleteVenue({ venue_id: v.id }).catch(() => {});
      }
      // Remove the owner's own profile record.
      const profiles = await base44.entities.Profile.filter({ created_by_id: user.id }).catch(() => []);
      await Promise.all(profiles.map(p => base44.entities.Profile.delete(p.id).catch(() => {})));
      // Sign out and return to the landing page.
      base44.auth.logout('/');
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
      setDeleting(false);
    }
  };

  return (
    <div className="bg-slate-800 border border-red-500/30 rounded-2xl p-4">
      <h3 className="font-semibold flex items-center gap-2 mb-1 text-red-400">
        <AlertTriangle className="w-4 h-4" /> Delete Account
      </h3>
      <p className="text-xs text-slate-400 mb-3">
        Permanently delete your account along with all your venues, listings, passes, ad campaigns, and other business data. This cannot be undone.
      </p>
      <Button
        variant="outline"
        onClick={() => { setConfirmText(''); setError(null); setOpen(true); }}
        className="w-full min-h-[44px] bg-transparent text-red-400 border-red-500/40 hover:bg-red-500/10 hover:text-red-300"
      >
        <Trash2 className="w-4 h-4 mr-2" /> Delete My Account
      </Button>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" /> Delete your account?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete your account and all associated data — your venues, listings, passes,
              ad campaigns, beacons, and reviews. This action <strong>cannot be undone</strong>.
              Type <strong>DELETE</strong> below to confirm.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <Input
            value={confirmText}
            onChange={e => setConfirmText(e.target.value)}
            placeholder="Type DELETE to confirm"
            className="min-h-[44px]"
            autoComplete="off"
          />
          {error && <p className="text-sm text-destructive">{error}</p>}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting} className="min-h-[44px]">Cancel</AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={!canDelete || deleting}
              onClick={handleDelete}
              className="min-h-[44px]"
            >
              {deleting ? (
                <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" /> Deleting…</>
              ) : (
                <><Trash2 className="w-4 h-4 mr-2" /> Permanently Delete</>
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}