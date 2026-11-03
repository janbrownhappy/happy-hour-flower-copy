import { MapPin, Tag, Heart, Bell, Filter, Sparkles } from "lucide-react";

const CARDS = [
  { icon: MapPin, title: "Find nearby happy hours", desc: "See what's pouring within a few blocks — sorted by distance and time." },
  { icon: Tag, title: "Discover food & drink deals", desc: "Apps, entrées, craft cocktails, and pints at a discount." },
  { icon: Heart, title: "Save favorite venues", desc: "Build a shortlist of your go-to spots and never miss their specials." },
  { icon: Bell, title: "Location-based alerts", desc: "Get pinged when a great deal is happening right around the corner." },
  { icon: Filter, title: "Browse smart", desc: "Filter by day, time, neighborhood, or type of special." },
  { icon: Sparkles, title: "Premium-only offers", desc: "Upgrade for exclusive alerts and early access to selected promos." },
];

export default function SiteConsumerShortcut() {
  return (
    <section className="max-w-6xl mx-auto px-4 py-16">
      <div className="max-w-2xl mb-12">
        <span className="inline-block bg-teal-500/10 text-teal-700 text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-5">
          For Locals &amp; Visitors
        </span>
        <h2 className="font-heading text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
          Your Shortcut to Local Food &amp; Drink Specials
        </h2>
        <p className="text-gray-500 text-lg leading-relaxed">
          One quick search and you're out the door — no more bouncing between websites and Instagram pages.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {CARDS.map(({ icon: Icon, title, desc }) => (
          <div key={title} className="bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-lg transition-shadow">
            <div className="w-11 h-11 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center mb-5">
              <Icon className="w-5 h-5" />
            </div>
            <h3 className="font-heading font-bold text-lg text-gray-900 mb-1.5">{title}</h3>
            <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}