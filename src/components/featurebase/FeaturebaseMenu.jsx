import { MessageSquarePlus, Megaphone, LifeBuoy } from 'lucide-react';
import { openFeedback, openChangelog, openMessenger, isFeaturebaseConfigured } from '@/lib/featurebase';

/**
 * The standard Featurebase entry-point trio, styled to match the app.
 * Renders "Give Feedback", "What's New", and "Contact Support" rows.
 *
 * @param {('feedback'|'changelog'|'messenger')[]} items - which entries to show
 * @param {string} className
 */
export default function FeaturebaseMenu({
  items = ['feedback', 'changelog', 'messenger'],
  className = '',
}) {
  if (!isFeaturebaseConfigured()) return null;

  const rows = {
    feedback: {
      icon: MessageSquarePlus,
      label: 'Give Feedback',
      hint: 'Request a feature or report an issue',
      onClick: openFeedback,
    },
    changelog: {
      icon: Megaphone,
      label: "What's New",
      hint: 'See the latest updates',
      onClick: openChangelog,
    },
    messenger: {
      icon: LifeBuoy,
      label: 'Contact Support',
      hint: 'Chat with our team',
      onClick: openMessenger,
    },
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {items.map((key) => {
        const row = rows[key];
        if (!row) return null;
        const Icon = row.icon;
        return (
          <button
            key={key}
            onClick={row.onClick}
            className="w-full flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors text-left"
          >
            <span className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Icon className="w-4 h-4 text-primary" />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-medium">{row.label}</span>
              <span className="block text-xs text-muted-foreground truncate">{row.hint}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}