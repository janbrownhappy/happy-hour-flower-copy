import { Search, MapPin, Filter, Heart, Bell, Bookmark } from "lucide-react";

const STEPS = [
  {
    label: "Explore",
    tagline: "Discover deals around you",
    accent: "amber",
    items: [
      { icon: Search, title: "Search & filter", desc: "Find spots by neighborhood, amenities, and the day you're going out." },
      { icon: MapPin, title: "See what's nearby", desc: "Browse a live map of happy hours happening close to you right now." },
      { icon: Filter, title: "Sort by what matters", desc: "Featured, fan favorites, or newest — surface the deals you care about." },
    ],
  },
  {
    label: "Favorites",
    tagline: "Keep your go-to spots close",
    accent: "rose",
    items: [
      { icon: Heart, title: "Tap to save", desc: "Heart any venue to add it to your Favorites in one tap." },
      { icon: Bookmark, title: "All in one list", desc: "Your saved spots live together so you can decide fast." },
      { icon: Bell, title: "Stay in the loop", desc: "Get notified when a favorite adds a new deal or updates their hours." },
    ],
  },
];

const ACCENTS = {
  amber: "bg-amber-500/10 text-amber-600",
  rose: "bg-rose-500/10 text-rose-600",
};

export default function SiteFeatureWalkthrough() {
  return (
    <section className="bg-white">
      <div className="max-w-5xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <p className="text-amber-600 font-semibold text-sm uppercase tracking-widest mb-2">
            How it works
          </p>
          <h2 className="font-heading text-3xl sm:text-4xl font-bold text-gray-900">
            Explore &amp; Favorites, made simple
          </h2>
          <p className="text-gray-600 mt-3 max-w-xl mx-auto">
            Two features, everything you need to find and keep your happy places.
          </p>
        </div>

        <div className="space-y-14">
          {STEPS.map((step) => (
            <div key={step.label}>
              <div className="mb-6">
                <h3 className="font-heading font-bold text-2xl text-gray-900">{step.label}</h3>
                <p className="text-gray-500">{step.tagline}</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {step.items.map(({ icon: Icon, title, desc }) => (
                  <div key={title} className="rounded-2xl border border-gray-200 p-6">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${ACCENTS[step.accent]}`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <h4 className="font-heading font-bold text-lg text-gray-900 mb-1.5">{title}</h4>
                    <p className="text-gray-600 text-sm leading-relaxed">{desc}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}