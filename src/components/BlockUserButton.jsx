import { useState } from 'react';
import { Ban } from 'lucide-react';
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogFooter,
  AlertDialogTitle, AlertDialogDescription, AlertDialogCancel, AlertDialogAction,
} from '@/components/ui/alert-dialog';
import { blockUser } from '@/hooks/useBlockedUsers';

// Lets a signed-in user block the author of a post; their content is hidden from then on.
export default function BlockUserButton({ authorId, authorName, currentUser }) {
  const [open, setOpen] = useState(false);
  if (!currentUser || !authorId || authorId === currentUser.id) return null;

  return (
    <>
      <button onClick={() => setOpen(true)} className="text-muted-foreground hover:text-destructive" aria-label="Block user">
        <Ban className="w-3.5 h-3.5" />
      </button>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Block {authorName || 'this user'}?</AlertDialogTitle>
            <AlertDialogDescription>
              You won't see their questions, answers or reviews anymore. To flag abuse to our team, use the report button too.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => blockUser(authorId, authorName)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Block
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}