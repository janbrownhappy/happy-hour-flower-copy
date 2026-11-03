import { useNavigate } from 'react-router-dom';
import { Users, Lock, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Shown to free consumers in place of MyCrew — taps route to the premium upgrade flow.
export default function CrewUpgradeCard() {
  const navigate = useNavigate();

  return (
    <div className="bg-card border border-border rounded-2xl mb-4 overflow-hidden">
      <div className="flex items-center gap-3 p-4">
        <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center flex-shrink-0">
          <Users className="w-5 h-5 text-amber-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm flex items-center gap-1.5">
            My Crew <Lock className="w-3.5 h-3.5 text-muted-foreground" />
          </p>
          <p className="text-xs text-muted-foreground">Invite friends & share your check-ins — Premium</p>
        </div>
      </div>
      <div className="border-t border-border p-4">
        <Button
          className="w-full bg-amber-500 hover:bg-amber-600 text-white"
          onClick={() => navigate('/plans/consumer?focus=premium')}
        >
          <Crown className="w-4 h-4 mr-2" /> Upgrade to Premium
        </Button>
      </div>
    </div>
  );
}