import { Link } from "react-router-dom";
import { Compass, Store, ArrowRight } from "lucide-react";

const CHOICES = [
  {
    to: "/site/pricing/consumers",
    icon: Compass,
    label: "For Consumers",
    title: "Find happy hour deals",
    desc: "Free to explore every Greenville special. Go Premium for alerts and exclusive deals.",
    accent: "amber",
  },
  {
    to: "/site/pricing/venues",
    icon: Store,
    label: "For Venues",
    title: "List & promote your venue",
    desc: "Get on the map for free, then upgrade to reach more locals and track what drives visits.",
    accent: "blue",
  },
];

const ACCENTS = {
  amber: "hover:border-amber-400 text-amber-600 bg-amber-500/10",
  blue: "hover:border-blue-400 text-blue-600 bg-blue-500/10",
};

export default function SitePricing() {
  return (
    <div>
      <section className="bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-4xl mx-auto px-4 py-20 text-center">
          <p className="text-gray-500 font-semibold text-sm uppercase tracking-widest mb-3">Pricing</p>
          <h1 className="font-heading text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
            Simple pricing for everyone
          </h1>
          <p className="text-gray-600 text-lg max-w-xl mx-auto">
            Whether you're looking for deals or listing your venue, there's a plan for you. Pick your path below.
          </p>
        </div>
      </section>

      <section className="max-w-4xl mx-auto px-4 pb-24 -mt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {CHOICES.map(({ to, icon: Icon, label, title, desc, accent }) => {
            const [hover, text, chip] = ACCENTS[accent].split(" ");
            return (
              <Link
                key={to}
                to={to}
                className={`group rounded-2xl border border-gray-200 bg-white p-8 flex flex-col transition-all hover:shadow-lg ${hover}`}
              >
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-5 ${chip} ${text}`}>
                  <Icon className="w-7 h-7" />
                </div>
                <p className={`text-xs font-bold uppercase tracking-widest mb-2 ${text}`}>{label}</p>
                <h2 className="font-heading text-2xl font-bold text-gray-900 mb-2">{title}</h2>
                <p className="text-gray-600 flex-1 mb-6">{desc}</p>
                <span className={`inline-flex items-center gap-1.5 font-semibold ${text} group-hover:gap-3 transition-all`}>
                  See pricing <ArrowRight className="w-4 h-4" />
                </span>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}