import { Eye, Heart, MousePointerClick, Star } from "lucide-react";

const METRICS = [
  { icon: Eye, label: "Views", desc: "See how many locals are discovering your venue." },
  { icon: Heart, label: "Favorites", desc: "Track who's saving you as a go-to spot." },
  { icon: MousePointerClick, label: "Deal redemptions", desc: "Know which offers actually drive people through the door." },
  { icon: Star, label: "Ratings & reviews", desc: "Watch your reputation grow and respond to feedback." },
];

export default function SiteVenueAnalytics() {
  return (
    <section className="bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <p className="text-blue-600 font-semibold text-sm uppercase tracking-widest mb-2">
            Performance analytics
          </p>
          <h2 className="font-heading text-3xl sm:text-4xl font-bold text-gray-900">
            Know what's working — and attract more customers
          </h2>
          <p className="text-gray-600 mt-3 max-w-xl mx-auto">
            Turn views into visits with clear insights into how deal-seekers engage with your venue.
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {METRICS.map(({ icon: Icon, label, desc }) => (
            <div key={label} className="bg-white rounded-2xl border border-gray-200 p-6 text-center">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center mx-auto mb-4">
                <Icon className="w-6 h-6" />
              </div>
              <h3 className="font-heading font-bold text-gray-900 mb-1">{label}</h3>
              <p className="text-gray-600 text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>

        <p className="text-center text-gray-500 text-sm mt-8">
          Premium venues unlock weekly performance reports and competitor insights.
        </p>
      </div>
    </section>
  );
}