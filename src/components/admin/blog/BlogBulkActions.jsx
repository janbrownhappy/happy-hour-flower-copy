import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { EyeOff, Trash2, Loader2 } from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export default function BlogBulkActions({ selectedCount, allSelected, onToggleAll, onUnpublish, onDelete }) {
  const [busy, setBusy] = useState(false);
  const run = async (fn) => { setBusy(true); await fn(); setBusy(false); };

  return (
    <div className="flex items-center gap-3 flex-wrap bg-card border border-border rounded-xl px-4 py-2">
      <label className="flex items-center gap-2 text-sm cursor-pointer">
        <Checkbox checked={allSelected} onCheckedChange={onToggleAll} />
        {selectedCount > 0 ? `${selectedCount} selected` : 'Select all'}
      </label>
      {selectedCount > 0 && (
        <div className="flex items-center gap-2 ml-auto">
          {busy && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
          <Button size="sm" variant="outline" disabled={busy} onClick={() => run(onUnpublish)}>
            <EyeOff className="w-3.5 h-3.5" /> Unpublish
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="sm" variant="outline" disabled={busy} className="text-destructive hover:text-destructive">
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete {selectedCount} article{selectedCount === 1 ? '' : 's'}?</AlertDialogTitle>
                <AlertDialogDescription>They will be permanently deleted. This can't be undone.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={() => run(onDelete)}
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}
    </div>
  );
}