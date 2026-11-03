import { Loader2, CheckCircle2, ExternalLink, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Status banners shared by the consumer and venue plans pages.
export default function PurchaseStatus({ activating, awaitingReturn, purchaseSuccess, onRefresh }) {
  return (
    <div className="space-y-3">
      {purchaseSuccess && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-xl px-4 py-3 text-sm flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          You're all set! Return to the Happy Hour Flower app to start using your plan.
        </div>
      )}
      {activating && (
        <div className="bg-amber-50 border border-amber-300 text-amber-800 rounded-xl px-4 py-3 text-sm flex items-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin flex-shrink-0" />
          Activating your plan...
        </div>
      )}
      {awaitingReturn && !activating && (
        <div className="bg-card border border-border rounded-xl px-4 py-3 text-sm space-y-2">
          <p className="flex items-center gap-2"><ExternalLink className="w-4 h-4 text-amber-500" />Complete your purchase in Safari, then come back to the app.</p>
          <Button size="sm" variant="outline" onClick={onRefresh}><RefreshCw className="w-4 h-4" />I've finished — refresh my plan</Button>
        </div>
      )}
    </div>
  );
}