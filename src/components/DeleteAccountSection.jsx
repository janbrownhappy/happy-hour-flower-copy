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

export default function DeleteAccountSection({ user, profile }) {
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
      // Server deletes this user's data and their login permanently
      await base44.functions.invoke('deleteMyAccount', {});
      // Sign the user out and return them to the landing page
      base44.auth.logout('/');
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
      setDeleting(false);
    }
  };

  return (
    <div className="bg-card border border-destructive/30 rounded-2xl p-4 mb-4">
      <h3 className="font-semibold flex items-center gap-2 mb-1 text-destructive">
        <AlertTriangle className="w-4 h-4" /> Delete Account
      </h3>
      <p className="text-xs text-muted-foreground mb-3">
        Permanently delete your account along with your favorites, notes, and saved preferences. This cannot be undone.
      </p>
      <Button
        variant="outline"
        onClick={() => { setConfirmText(''); setError(null); setOpen(true); }}
        className="w-full min-h-[44px] text-destructive border-destructive/40 hover:bg-destructive/5"
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
              This will permanently delete your account and all associated data — favorites, notes, and preferences.
              This action <strong>cannot be undone</strong>. Type <strong>DELETE</strong> below to confirm.
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