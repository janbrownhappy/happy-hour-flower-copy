import { Link } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ExternalLink } from 'lucide-react';

export default function UpgradeReviewDialog({ plan, billingCycle, hasVenue, onCancel, onConfirm }) {
  const price = plan?.pricing?.[billingCycle]?.display;
  return (
    <Dialog open={!!plan} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Review your upgrade</DialogTitle>
          <DialogDescription>
            {plan?.label}{price ? ` · ${price}` : ''}, billed {billingCycle === 'annual' ? 'annually' : 'monthly'}.
          </DialogDescription>
        </DialogHeader>
        {hasVenue ? (
          <p className="text-sm text-muted-foreground">
            Next, you'll finish payment on our secure checkout page, which opens in your browser. Nothing is charged until you confirm there. Come back here when you're done and your venue will be upgraded.
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            Your account doesn't have a venue yet. Add or claim your venue first, then come back to upgrade it.
          </p>
        )}
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          {hasVenue ? (
            <Button onClick={onConfirm}>
              Continue to secure checkout <ExternalLink className="w-4 h-4" />
            </Button>
          ) : (
            <Button asChild><Link to="/venue-owner">Go to my venues</Link></Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}