import { useNavigate } from 'react-router-dom';
import { Crown, Zap, ArrowLeft, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Plans() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="relative bg-gradient-to-br from-amber-500 to-slate-800 text-white px-4 pt-10 pb-8 text-center">
        <button
          onClick={() => navigate(-1)}
          className="absolute top-4 left-4 p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <Crown className="w-10 h-10 mx-auto mb-3 opacity-90" />
        <h1 className="text-2xl font-heading font-bold mb-1">Choose Your Path</h1>
        <p className="text-white/85 text-sm">Select the plan type that fits your needs</p>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="grid md:grid-cols-2 gap-6">
          {/* Consumer Plans Card */}
          <button
            onClick={() => navigate('/plans/consumer')}
            className="relative flex flex-col items-center text-center rounded-2xl border-2 border-amber-500 bg-gradient-to-br from-amber-50 to-card p-8 shadow-sm hover:shadow-lg transition-all group"
          >
            <div className="w-16 h-16 rounded-full bg-amber-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Crown className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-xl font-heading font-bold mb-2">Explorer Plans</h2>
            <p className="text-sm text-muted-foreground mb-4">For people discovering happy hours</p>
            <ul className="space-y-2 text-sm text-left w-full mb-6">
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-amber-500" />
                <span>Unlimited favorites</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-amber-500" />
                <span>Advanced filters</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-amber-500" />
                <span>Premium-only specials</span>
              </li>
            </ul>
            <Button className="w-full bg-amber-500 hover:bg-amber-600">
              View Explorer Plans
            </Button>
          </button>

          {/* Venue Plans Card */}
          <button
            onClick={() => navigate('/plans/venue')}
            className="relative flex flex-col items-center text-center rounded-2xl border-2 border-slate-700 bg-gradient-to-br from-slate-50 to-card p-8 shadow-sm hover:shadow-lg transition-all group"
          >
            <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Zap className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-xl font-heading font-bold mb-2">Venue Plans</h2>
            <p className="text-sm text-muted-foreground mb-4">For bar & restaurant owners</p>
            <ul className="space-y-2 text-sm text-left w-full mb-6">
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-slate-700" />
                <span>Unlimited specials & photos</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-slate-700" />
                <span>Featured placement</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-slate-700" />
                <span>Analytics dashboard</span>
              </li>
            </ul>
            <Button className="w-full bg-slate-800 hover:bg-slate-700 text-white">
              View Venue Plans
            </Button>
          </button>
        </div>

        <p className="text-xs text-center text-muted-foreground pt-8">
          Cancel anytime. Questions? Contact support@happyhourflower.com
        </p>
      </div>
    </div>
  );
}