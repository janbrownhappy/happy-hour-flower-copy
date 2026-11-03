import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import {
  BookOpen, RefreshCw, Star, ArrowRight, Check, X, ChevronLeft
} from 'lucide-react';

export default function BestPractices() {
  const navigate = useNavigate();
  const [firstVenueId, setFirstVenueId] = useState(null);

  useEffect(() => {
    base44.auth.me().then(async (me) => {
      const [allVenues, collaborations] = await Promise.all([
        base44.entities.Venue.list(),
        base44.entities.VenueCollaborator.list().catch(() => []),
      ]);
      const collabVenueIds = collaborations.filter(c => c.user_id === me.id).map(c => c.venue_id);
      const accessible = allVenues.filter(v => v.owner_id === me.id || collabVenueIds.includes(v.id));
      if (accessible.length > 0) setFirstVenueId(accessible[0].id);
    }).catch(() => {});
  }, []);

  // Point at the specific venue dashboard tab when we have a venue, else fall back to the owner dashboard.
  const dealsLink = firstVenueId ? `/venue-dashboard/${firstVenueId}#hours` : '/venue-owner';
  const eventsLink = firstVenueId ? `/venue-dashboard/${firstVenueId}#events` : '/venue-owner';

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <div className="bg-slate-900 border-b border-slate-700 px-4 py-5">
        <div className="max-w-2xl mx-auto">
          <button
            onClick={() => navigate('/venue-owner')}
            className="flex items-center gap-1 text-slate-400 hover:text-white text-sm mb-3 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /> Back to Dashboard
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h1 className="text-xl font-heading font-bold text-white">Deal Posting Guide</h1>
              <p className="text-slate-400 text-xs">Tips to help your restaurant get discovered and drive more foot traffic</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-8">

        {/* Choosing the Right Deal Type */}
        <section>
          <h2 className="text-lg font-heading font-bold text-white mb-3">Choosing the Right Deal Type</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Weekly Recurring */}
            <div className="bg-slate-800 border border-slate-700 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <RefreshCw className="w-4 h-4 text-amber-400" />
                <h3 className="text-white font-semibold">Weekly Recurring Deals</h3>
              </div>
              <p className="text-slate-400 text-sm mb-3">
                For things that happen every week. These stay visible automatically.
              </p>
              <ul className="space-y-1.5 text-sm text-slate-300 mb-3">
                <li className="flex items-start gap-2"><span className="text-slate-500 mt-0.5">•</span> Happy Hour (Mon-Fri, 4-7pm)</li>
                <li className="flex items-start gap-2"><span className="text-slate-500 mt-0.5">•</span> Taco Tuesday</li>
                <li className="flex items-start gap-2"><span className="text-slate-500 mt-0.5">•</span> Wing Wednesday</li>
                <li className="flex items-start gap-2"><span className="text-slate-500 mt-0.5">•</span> Trivia Night Thursdays</li>
              </ul>
              <Link to={dealsLink} className="inline-flex items-center gap-1.5 text-amber-400 text-sm font-semibold hover:text-amber-300">
                <ArrowRight className="w-3.5 h-3.5" /> Go to Weekly Deals
              </Link>
            </div>

            {/* Special Events */}
            <div className="bg-slate-800 border border-slate-700 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Star className="w-4 h-4 text-amber-400" />
                <h3 className="text-white font-semibold">Special Events</h3>
              </div>
              <p className="text-slate-400 text-sm mb-3">
                For one-time or rare happenings. Auto-removed after the date passes.
              </p>
              <ul className="space-y-1.5 text-sm text-slate-300 mb-3">
                <li className="flex items-start gap-2"><span className="text-slate-500 mt-0.5">•</span> Live Music on April 12th</li>
                <li className="flex items-start gap-2"><span className="text-slate-500 mt-0.5">•</span> St. Patrick's Day Party</li>
                <li className="flex items-start gap-2"><span className="text-slate-500 mt-0.5">•</span> Monthly Drag Brunch</li>
                <li className="flex items-start gap-2"><span className="text-slate-500 mt-0.5">•</span> New Year's Eve Bash</li>
              </ul>
              <Link to={eventsLink} className="inline-flex items-center gap-1.5 text-amber-400 text-sm font-semibold hover:text-amber-300">
                <ArrowRight className="w-3.5 h-3.5" /> Go to Events
              </Link>
            </div>
          </div>
        </section>

        {/* Best Practices for Posting */}
        <section>
          <h2 className="text-lg font-heading font-bold text-white mb-3">Best Practices for Posting</h2>
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-4 mb-4">
            <p className="text-emerald-400 font-semibold text-sm mb-2">Good example:</p>
            <div className="text-slate-300 text-sm space-y-0.5">
              <p>$5 House Margaritas</p>
              <p>$3 Draft Beers</p>
              <p>Half-Off Appetizers</p>
              <p>$10 Burger &amp; Beer Combo</p>
              <p>Dine-in only</p>
            </div>
            <p className="text-red-400 font-semibold text-sm mt-4 mb-2">Bad example:</p>
            <p className="text-slate-300 text-sm">Happy Hour! Ask your server for details.</p>
          </div>
          <ul className="space-y-2 text-sm text-slate-300">
            <li className="flex items-start gap-2"><span className="text-slate-500 mt-0.5">•</span> Enter each detail on a <strong className="text-white">new line</strong></li>
            <li className="flex items-start gap-2"><span className="text-slate-500 mt-0.5">•</span> Include <strong className="text-white">prices and specific items</strong></li>
            <li className="flex items-start gap-2"><span className="text-slate-500 mt-0.5">•</span> Add any restrictions (dine-in only, with purchase, etc.)</li>
            <li className="flex items-start gap-2"><span className="text-slate-500 mt-0.5">•</span> Keep each line concise but informative</li>
            <li className="flex items-start gap-2"><span className="text-slate-500 mt-0.5">•</span> Use the <strong className="text-white">"Add Timeslot"</strong> button for deals that run on multiple days/times</li>
          </ul>
        </section>

        {/* Common Mistakes to Avoid */}
        <section>
          <h2 className="text-lg font-heading font-bold text-white mb-3">Common Mistakes to Avoid</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
            {[
              'Posting weekly deals as one-time events',
              'Vague descriptions without specific details',
              'Using all caps or spammy text',
              'Posting paragraphs rather than bullet points',
            ].map((mistake) => (
              <div key={mistake} className="flex items-start gap-2 text-sm text-slate-300">
                <X className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" /> {mistake}
              </div>
            ))}
          </div>
        </section>

        {/* Quick Posting Checklist */}
        <section className="pb-6">
          <h2 className="text-lg font-heading font-bold text-white mb-3">Quick Posting Checklist</h2>
          <div className="space-y-3">
            {[
              'Is this a recurring or one-time deal? (Choose the right form)',
              'Each detail on its own line',
              'Clear pricing and item information',
              'Any restrictions or conditions included',
              'Accurate start and end time',
              'Use "Add Timeslot" for deals on multiple days/times',
            ].map((item) => (
              <div key={item} className="flex items-start gap-2 text-sm text-slate-300">
                <Check className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" /> {item}
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}