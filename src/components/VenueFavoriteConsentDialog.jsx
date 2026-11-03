import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Bell, MessageSquare, X } from 'lucide-react';

export default function VenueFavoriteConsentDialog({ open, venueName, onAccept, onDecline }) {
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onDecline(); }}>
      <DialogContent className="max-w-sm mx-4 rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-center text-lg">Stay in the loop! 🌸</DialogTitle>
        </DialogHeader>
        <div className="text-center space-y-4 pb-2">
          <p className="text-muted-foreground text-sm leading-relaxed">
            Would you like to receive updates from <span className="font-semibold text-foreground">{venueName}</span>? They may send you:
          </p>
          <ul className="text-sm text-left space-y-2 bg-muted/50 rounded-xl p-4">
            <li className="flex items-center gap-2"><span className="text-primary">🍹</span> Happy hour deals & specials</li>
            <li className="flex items-center gap-2"><span className="text-primary">📅</span> Event announcements</li>
            <li className="flex items-center gap-2"><span className="text-primary">⏰</span> Schedule changes</li>
          </ul>
          <p className="text-xs text-muted-foreground">You can change this preference anytime in your profile.</p>
          <div className="flex gap-3 pt-1">
            <Button
              variant="outline"
              className="flex-1"
              onClick={onDecline}
            >
              <X className="w-4 h-4 mr-1.5" /> No thanks
            </Button>
            <Button
              className="flex-1 bg-primary hover:bg-primary/90"
              onClick={onAccept}
            >
              <Bell className="w-4 h-4 mr-1.5" /> Yes, notify me!
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}