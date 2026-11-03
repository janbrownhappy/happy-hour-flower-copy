import { Search, MapPin, Compass, Heart } from "lucide-react";
import AuthAwareCTA from "@/components/AuthAwareCTA";

const FEATURES = [
  {
    icon: Compass,
    title: "Explore",
    desc: "Every Greenville happy hour in one scrollable, filterable list — today's specials first.",
    to: "/explore",
  },
  {
    icon: Search,
    title: "Search",
    desc: "Find a venue, a deal, or an amenity in a couple of taps — search cuts straight to it.",
    to: "/explore?focus=search",
  },
  {
    icon: MapPin,
    title: "Map",
    desc: "See every venue pinned across downtown and beyond, and what's happening right now near you.",
    to: "/map",
  },
  {
    icon: Heart,
    title: "Favorites",
    desc: "Save your go-to spots and get pinged when a great deal pops up around the corner.",
    to: "/favorites",
  },
];

export default function SiteAppShowcase({ heading = "Find your happy place in a few taps." }) {
  return (
    <section className="py-20 bg-gray-50">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center gap-6 md:gap-10 max-w-4xl mx-auto mb-14">
          <img
            src="https://base44.app/api/apps/6a1f45eb9cf7513caebbab49/files/mp/public/6a1f45eb9cf7513caebbab49/8654d155e_free.webp"
            width={640} height={360} loading="lazy" decoding="async"
            alt="Free forever"
            className="w-56 sm:w-64 md:w-80 rounded-2xl shadow-lg shrink-0"
          />
          <div className="text-center md:text-left">
            <p className="text-amber-600 font-semibold text-sm uppercase tracking-widest mb-3">Inside the app</p>
            <h2 className="font-heading text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              {heading}
            </h2>
            <p className="text-gray-600 text-lg">
              Search, map, save, and check in — every Greenville special in one pocket-sized view.
            </p>
          </div>
        </div>

        <img
          src="https://base44.app/api/apps/6a1f45eb9cf7513caebbab49/files/mp/public/6a1f45eb9cf7513caebbab49/eac9467a3_shots.webp"
          width={910} height={456} loading="lazy" decoding="async"
          alt="Happy Hour Flower app screens: Explore, Map, Quick Peek, Venue Details, and Favorites"
          className="w-full max-w-5xl mx-auto mb-14"
        />

        <h2 className="sr-only">App features: Explore, Search, Map and Favorites</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {FEATURES.map(({ icon: Icon, title, desc, to }) => (
            <AuthAwareCTA
              key={title}
              to={to}
              className="group flex flex-col items-start text-left bg-white rounded-2xl border border-gray-200 p-6 hover:border-amber-300 hover:shadow-lg transition-all disabled:opacity-60"
            >
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center mb-4 group-hover:bg-amber-500 group-hover:text-white transition-colors">
                <Icon className="w-6 h-6" />
              </div>
              <h3 className="font-heading font-bold text-lg text-gray-900 mb-1.5">{title}</h3>
              <p className="text-gray-600 text-sm leading-relaxed">{desc}</p>
            </AuthAwareCTA>
          ))}
        </div>
      </div>
    </section>
  );
}