import { Button } from "@/components/ui/button";

const features = [
  { emoji: "🗺️", title: "Interactive Map", desc: "See every happy hour around you on a live map. Filter by neighborhood, category, and time." },
  { emoji: "🍹", title: "Real-Time Deals", desc: "Browse today's drink and food specials updated directly by venue owners." },
  { emoji: "❤️", title: "Save Your Favorites", desc: "Bookmark your go-to spots and get notified when they update their deals." },
  { emoji: "📅", title: "Weekly Calendar", desc: "Plan your week ahead with a full calendar view of recurring happy hours." },
  { emoji: "🏆", title: "Fan Favorites", desc: "Discover community-curated picks — the spots locals actually love." },
  { emoji: "🔔", title: "Deal Alerts", desc: "Get push notifications when your favorite venues drop new specials." },
  { emoji: "📍", title: "Arrival Welcomes", desc: "Walk into a Platinum venue and get a warm welcome with today's deals — geofenced arrival alerts." },
  { emoji: "🎟️", title: "Tap-to-Unlock Coupons", desc: "Tap your phone on an in-venue beacon to instantly unlock a wallet coupon — a Platinum venue perk." },
];

export default function LandingFeatures({ onPreRegister }) {
  return (
    <section className="py-12 px-4 bg-gray-900">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-8">
          <h2 className="text-4xl font-extrabold text-white mb-3">Everything you need to find the best deal</h2>
          <p className="text-gray-400 text-lg">Built for Greenville's happy hour culture — not a generic bar finder.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f) => (
            <div key={f.title} className="bg-gray-800 rounded-2xl p-6 border border-gray-700 hover:border-amber-500/40 transition-colors">
              <div className="text-4xl mb-3">{f.emoji}</div>
              <h3 className="text-white font-bold text-lg mb-1">{f.title}</h3>
              <p className="text-gray-400 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
        <div className="text-center mt-12">
          <Button onClick={onPreRegister} className="bg-amber-500 hover:bg-amber-400 text-white font-bold text-lg px-8 py-4 rounded-2xl">
            Join the Early Access List
          </Button>
        </div>
      </div>
    </section>
  );
}