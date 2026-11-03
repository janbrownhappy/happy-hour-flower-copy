import { Crown, Gem } from 'lucide-react';

const TIER_CONFIG = {
  premium: {
    label: 'Premium Venue',
    icon: Crown,
    classes: 'bg-amber-500 text-white border-amber-600',
  },
  platinum: {
    label: 'Platinum Venue',
    icon: Gem,
    classes: 'bg-sky-500 text-white border-sky-600',
  },
  free: {
    label: 'Free Listing',
    icon: null,
    classes: 'bg-secondary text-secondary-foreground border-border',
  },
};

export default function TierBadge({ tier, className = '' }) {
  const config = TIER_CONFIG[tier] || TIER_CONFIG.free;
  const Icon = config.icon;

  return (
    <span
      className={`flex-shrink-0 inline-flex items-center gap-1.5 text-sm font-bold px-3.5 py-1.5 rounded-full border shadow-sm ${config.classes} ${className}`}
    >
      {Icon && <Icon className="w-4 h-4" />}
      {config.label}
    </span>
  );
}