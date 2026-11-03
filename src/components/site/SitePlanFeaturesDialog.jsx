import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Check } from "lucide-react";

/**
 * Full feature list shown when a plan card's "See the full list" button is
 * clicked. `features` is an array of { title, desc }.
 */
export default function SitePlanFeaturesDialog({ open, onOpenChange, planName, features }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading text-2xl">
            {planName} — full feature list
          </DialogTitle>
        </DialogHeader>
        <ul className="space-y-4 mt-2">
          {features.map((f) => (
            <li key={f.title} className="flex items-start gap-3">
              <Check className="w-5 h-5 shrink-0 mt-0.5 text-blue-500" />
              <div>
                <p className="font-semibold text-gray-900 text-sm">{f.title}</p>
                <p className="text-gray-600 text-sm leading-relaxed">{f.desc}</p>
              </div>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}