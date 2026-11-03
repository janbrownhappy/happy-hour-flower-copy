import { MapPin, Eye, Tag, PartyPopper, Store, Camera, Share2 } from 'lucide-react';

const BENEFITS = [
  { icon: Eye, title: 'Online Visibility', desc: 'Increase your online visibility and get discovered by more customers' },
  { icon: Tag, title: 'Happy Hour Deals', desc: 'Manage Happy Hour Deals and Specials in real-time' },
  { icon: PartyPopper, title: 'Special Events', desc: 'Promote Special Events and attract more foot traffic' },
  { icon: Store, title: 'Business Details', desc: 'Update Business Details and keep customers informed' },
  { icon: Camera, title: 'Profile Picture', desc: 'Update Profile Picture and Gallery to showcase your venue' },
  { icon: Share2, title: 'Social Media', desc: 'Display Social Media Links to grow your following' },
];

export default function ClaimVenueIntro({ venue, isChallenge, onContinue }) {
  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="text-center pt-2">
        <h1 className="text-3xl sm:text-4xl font-heading font-bold text-primary">{venue.name}</h1>
        {venue.address && (
          <p className="text-slate-400 mt-2 flex items-center justify-center gap-1.5">
            <MapPin className="w-4 h-4" /> {[venue.address, venue.city].filter(Boolean).join(', ')}
          </p>
        )}
        <button
          onClick={onContinue}
          className="mt-6 w-full sm:w-auto px-8 py-3.5 bg-primary hover:bg-primary/90 text-white font-semibold rounded-xl transition-colors"
        >
          {isChallenge ? 'Challenge & Start Managing Deals' : 'Claim Restaurant & Start Managing Deals'}
        </button>
      </div>

      {/* What You'll Get */}
      <div>
        <div className="text-center mb-6">
          <h2 className="text-2xl font-heading font-bold text-white">What You'll Get</h2>
          <div className="w-12 h-0.5 bg-primary rounded-full mx-auto mt-2" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {BENEFITS.map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="bg-slate-800/60 border-t-2 border-primary border-x border-b border-slate-700 rounded-xl p-4"
            >
              <div className="w-9 h-9 rounded-lg bg-primary/20 flex items-center justify-center mb-3">
                <Icon className="w-4.5 h-4.5 text-primary" />
              </div>
              <p className="text-primary font-semibold text-sm mb-1">{title}</p>
              <p className="text-slate-400 text-xs leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
        <p className="text-center text-xs text-slate-500 mt-6 max-w-lg mx-auto">
          By claiming your restaurant, you agree to receive email communications for onboarding and updates. You can unsubscribe at any time.
        </p>
      </div>
    </div>
  );
}