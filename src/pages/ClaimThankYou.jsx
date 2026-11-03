import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Check } from 'lucide-react';

const NEXT_STEPS = [
  'Ensure your business information is accurate',
  'Update your Happy Hour Specials',
  'Add any Upcoming Events',
  'Add photos of your restaurant, food, and drinks',
];

export default function ClaimThankYou() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const venueId = searchParams.get('venue_id');
  const [venue, setVenue] = useState(null);

  useEffect(() => {
    if (!venueId) return;
    base44.entities.Venue.get(venueId).then(setVenue).catch(() => {});
  }, [venueId]);

  const venueName = venue?.name || 'Your Venue';

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 px-4 py-10">
      <div className="max-w-xl mx-auto space-y-5">
        {/* Thank you card */}
        <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-8 text-center">
          <div className="w-16 h-16 rounded-full border-2 border-primary flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-heading font-bold text-white mb-2">
            Thank You for Claiming {venueName}!
          </h1>
          <p className="text-slate-400 mb-6">
            You can now start managing your deals and events.
          </p>
          <Button
            onClick={() => navigate('/venue-owner')}
            className="bg-primary hover:bg-primary/90 text-white font-semibold px-6 py-2.5 h-auto rounded-lg"
          >
            Go to Dashboard
          </Button>
          {venueId && (
            <div className="mt-4">
              <Link to={`/venue/${venueId}`} className="text-sm text-slate-300 underline hover:text-white">
                View Your Restaurant Page
              </Link>
            </div>
          )}
        </div>

        {/* What's Next card */}
        <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-6">
          <h2 className="text-lg font-heading font-bold text-white mb-4">What's Next?</h2>
          <ul className="space-y-3">
            {NEXT_STEPS.map((step) => (
              <li key={step} className="flex items-center gap-3">
                <span className="w-5 h-5 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                  <Check className="w-3 h-3 text-amber-400" />
                </span>
                <span className="text-sm text-slate-300">{step}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}