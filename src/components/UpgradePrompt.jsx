import { useNavigate } from 'react-router-dom';
import { Crown, X, Check, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { CONSUMER_PREMIUM, VENUE_PREMIUM, VENUE_PLATINUM } from '@/lib/pricing';

// Maps required tier to its display config + the plans route that handles checkout.
const TIER_CONFIG = {
  premium: {
    label: 'Premium',
    plansRoute: '/plans/consumer',
    color: 'from-amber-500 to-amber-600',
    icon: Crown,
    accentClass: 'text-amber-500',
    btnClass: 'bg-amber-500 hover:bg-amber-600 text-white',
    features: [
      'Everything in Free, plus:',
      'Unlimited saved favorites',
      'My Crew — invite friends & share check-ins',
      'Unlimited custom must-visit lists',
      'ZIP code-specific text alerts',
      'Exclusive premium specials',
      'Direct messaging to businesses',
      'Direct messaging to administrators',
      'Advanced date-range filtering',
      'Fan Favorites access',
      'Enhanced AI recommendations',
      'Early access to new features',
      'Ad-free experience',
      'Premium badge',
      'Add quick notes to saved venues',
      'Calendar sync: Apple, Google, Outlook',
    ],
    price: CONSUMER_PREMIUM.monthly.display,
  },
  venue_premium: {
    label: 'Venue Premium',
    plansRoute: '/plans/venue',
    color: 'from-amber-500 to-amber-600',
    icon: Crown,
    accentClass: 'text-amber-500',
    btnClass: 'bg-amber-500 hover:bg-amber-600 text-white',
    features: [
      'Unlimited specials & photos',
      'Featured placement in search',
      'Analytics dashboard',
      'Push notification credits',
      'Priority listing approval',
      'Weekly performance reports',
    ],
    price: VENUE_PREMIUM.monthly.display,
  },
  platinum: {
    label: 'Platinum',
    plansRoute: '/plans/venue',
    color: 'from-slate-700 to-slate-900',
    icon: Zap,
    accentClass: 'text-slate-300',
    btnClass: 'bg-slate-800 hover:bg-slate-700 text-white',
    features: [
      'Top search & home screen placement',
      'Priority map visibility',
      'Geo-targeted promotions',
      'Apple & Google Wallet passes',
      'Advanced analytics & reports',
      'Dedicated onboarding support',
    ],
    price: VENUE_PLATINUM.monthly.display,
  },
};

export default function UpgradePrompt({ open, onClose, feature, requiredTier = 'premium' }) {
  const navigate = useNavigate();
  const config = TIER_CONFIG[requiredTier] || TIER_CONFIG.premium;
  const Icon = config.icon;

  const handleUpgrade = () => {
    onClose();
    // Pass the specific tier so the plans page shows only the relevant option.
    const tierParam = requiredTier === 'platinum' ? 'platinum' : 'premium';
    const sep = config.plansRoute.includes('?') ? '&' : '?';
    navigate(`${config.plansRoute}${sep}focus=${tierParam}`);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm p-0 overflow-hidden border-0">
        {/* Header */}
        <div className={`bg-gradient-to-br ${config.color} p-6 text-white relative`}>
          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-1 rounded-full hover:bg-white/20 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center mb-3">
            <Icon className="w-6 h-6" />
          </div>
          <span className="text-xs font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-white/20 mb-2 inline-block">
            {config.label}
          </span>
          <h2 className="text-xl font-bold mt-2 leading-tight">
            {feature ? `Unlock "${feature}"` : `Upgrade to ${config.label}`}
          </h2>
          <p className="text-white/80 text-sm mt-1">{config.price}</p>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 bg-white">
          <ul className="space-y-1.5">
            {config.features.map((f, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <Check className={`w-4 h-4 flex-shrink-0 mt-0.5 ${config.accentClass}`} />
                <span className="text-foreground">{f}</span>
              </li>
            ))}
          </ul>

          <Button className={`w-full ${config.btnClass}`} onClick={handleUpgrade}>
            <Icon className="w-4 h-4 mr-2" />Upgrade to {config.label} — {config.price}
          </Button>
          <Button variant="ghost" className="w-full text-muted-foreground text-sm" onClick={onClose}>
            Maybe later
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}