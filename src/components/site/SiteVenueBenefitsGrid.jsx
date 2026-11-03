import { Megaphone, MapPin, Bell, RefreshCw, CalendarDays, BarChart3 } from "lucide-react";

const ITEMS = [
  { icon: Megaphone, title: "Promote specials", desc: "Push happy hours, food deals, and seasonal promos to nearby users." },
  { icon: MapPin, title: "Reach nearby consumers", desc: "Target by neighborhood, day, and time window." },
  { icon: Bell, title: "Send timely alerts", desc: "Fill the patio with a flash promo when you need it." },
  { icon: RefreshCw, title: "Build repeat visits", desc: "Saved-favorite users come back again and again." },
  { icon: CalendarDays, title: "Highlight events", desc: "Trivia, live music, game days, late nights — promote them all." },
  { icon: BarChart3, title: "Track engagement", desc: "See views, saves, and interest from real deal-seekers." },
];

export default function SiteVenueBenefitsGrid() {
  return (
    <section className="bg-white">
      <div className="max-w-6xl mx-auto px-4 py-20">
        <div className="mb-12">
          <span className="inline-block bg-teal-500/10 text-teal-700 text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-4">
            What You Get
          </span>
          <h2 className="font-heading text-4xl sm:text-5xl font-bold text-gray-900">
            Built to fill slow shifts.
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {ITEMS.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="rounded-2xl border border-gray-200 p-7 hover:border-amber-300 hover:shadow-lg transition-all">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center mb-5">
                <Icon className="w-6 h-6" />
              </div>
              <h3 className="font-heading font-bold text-xl text-gray-900 mb-2">{title}</h3>
              <p className="text-gray-600 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}