import { useState } from 'react';
import { AlertTriangle, Pencil, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export default function BlogFactCheckAlert({ title, issues, onEdit, onDismiss }) {
  const [open, setOpen] = useState(false);
  if (!issues?.length) return null;

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="inline-flex">
        <Badge className="bg-destructive text-destructive-foreground hover:bg-destructive/90 cursor-pointer">
          <AlertTriangle className="w-3 h-3 mr-1" />
          {issues.length} unverified contact detail{issues.length === 1 ? '' : 's'}
        </Badge>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Unverified contact info</DialogTitle>
            <DialogDescription>
              These passages in "{title}" state an address, phone number or website that doesn't
              match a verified venue record. Fix or remove them before publishing.
            </DialogDescription>
          </DialogHeader>
          <ul className="space-y-2">
            {issues.map((issue, i) => (
              <li
                key={i}
                className="text-sm bg-destructive/5 border border-destructive/20 rounded-lg p-3 text-foreground"
              >
                {issue}…
              </li>
            ))}
          </ul>
          <DialogFooter className="gap-2 sm:gap-2">
            {onDismiss && (
              <Button
                variant="outline"
                onClick={() => {
                  onDismiss();
                  setOpen(false);
                }}
              >
                <CheckCircle2 className="w-4 h-4" /> Mark as verified
              </Button>
            )}
            {onEdit && (
              <Button
                onClick={() => {
                  setOpen(false);
                  onEdit();
                }}
              >
                <Pencil className="w-4 h-4" /> Edit article
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}