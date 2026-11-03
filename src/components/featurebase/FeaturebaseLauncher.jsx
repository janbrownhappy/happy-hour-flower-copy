import { useState } from 'react';
import { MessageCircle, X, MessageSquarePlus, Megaphone, LifeBuoy } from 'lucide-react';
import { openFeedback, openChangelog, openMessenger, isFeaturebaseConfigured } from '@/lib/featurebase';

/**
 * Discreet floating launcher (bottom-right) giving quick access to
 * Feedback / What's New / Support. Matches the app's amber theme.
 * Sits above the bottom nav on mobile via safe-area padding.
 */
export default function FeaturebaseLauncher() {
  const [open, setOpen] = useState(false);
  if (!isFeaturebaseConfigured()) return null;

  const actions = [
    { icon: MessageSquarePlus, label: 'Give Feedback', onClick: openFeedback },
    { icon: Megaphone, label: "What's New", onClick: openChangelog },
    { icon: LifeBuoy, label: 'Contact Support', onClick: openMessenger },
  ];

  return (
    <div className="fixed right-4 bottom-40 md:bottom-6 z-40 flex flex-col items-end gap-2 safe-area-pb">
      {open && (
        <div className="flex flex-col items-end gap-2 mb-1">
          {actions.map((a) => {
            const Icon = a.icon;
            return (
              <button
                key={a.label}
                onClick={() => { a.onClick(); setOpen(false); }}
                className="flex items-center gap-2 bg-card border shadow-lg rounded-full pl-4 pr-3 py-2 text-sm font-medium hover:bg-muted transition-colors"
              >
                {a.label}
                <span className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                  <Icon className="w-4 h-4 text-primary" />
                </span>
              </button>
            );
          })}
        </div>
      )}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Help & Feedback"
        className="w-11 h-11 rounded-full bg-primary/90 text-primary-foreground shadow-md shadow-primary/30 flex items-center justify-center hover:bg-primary transition-colors"
      >
        {open ? <X className="w-4 h-4" /> : <MessageCircle className="w-4 h-4" />}
      </button>
    </div>
  );
}