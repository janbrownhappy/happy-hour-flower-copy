import { Check, X } from "lucide-react";

const ROWS = [
  { feature: "Interactive map with all venues", free: true, premium: true },
  { feature: "Browse complete happy hour listings", free: true, premium: true },
  { feature: "Real-time geolocation & distance", free: true, premium: true },
  { feature: "Daily push notifications", free: true, premium: true },
  { feature: "Custom must-visit lists", free: "1 list", premium: "Unlimited" },
  { feature: "Save unlimited favorite venues", free: true, premium: true },
  { feature: "ZIP code-specific text alerts", free: false, premium: true },
  { feature: "Exclusive premium specials", free: false, premium: true },
  { feature: "Direct messaging to businesses", free: false, premium: true },
  { feature: "Direct messaging to administrators", free: false, premium: true },
  { feature: "Advanced date-range filtering", free: false, premium: true },
  { feature: "Fan Favorites access", free: false, premium: true },
  { feature: "Enhanced AI recommendations", free: false, premium: true },
  { feature: "Early access to new features", free: false, premium: true },
  { feature: "Ad-free experience", free: false, premium: true },
  { feature: "Premium badge", free: false, premium: true },
  { feature: "Quick notes on saved venues", free: false, premium: true },
  { feature: "Calendar sync (Apple, Google, Outlook)", free: false, premium: true },
];

function Cell({ value }) {
  if (value === true) return <Check className="w-5 h-5 text-amber-500 mx-auto" strokeWidth={2.5} />;
  if (value === false) return <X className="w-5 h-5 text-gray-400 mx-auto" strokeWidth={2} />;
  return <span className="text-sm font-semibold text-gray-700">{value}</span>;
}

export default function SiteComparisonMatrix() {
  return (
    <section className="max-w-4xl mx-auto px-4 py-16">
      <h2 className="font-heading text-4xl sm:text-5xl font-bold text-gray-900 text-center mb-10">
        Free vs Premium Comparison
      </h2>

      <div className="rounded-3xl border border-gray-200 overflow-hidden bg-white shadow-sm">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="text-left font-heading font-bold text-gray-900 px-6 py-4 bg-gray-50">Feature</th>
              <th className="w-28 text-center font-heading font-bold text-gray-900 px-4 py-4 bg-gray-50">Free</th>
              <th className="w-32 text-center font-heading font-bold text-gray-900 px-4 py-4 bg-amber-100">Premium</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row, i) => (
              <tr key={row.feature} className={i % 2 === 1 ? "bg-gray-50/60" : "bg-white"}>
                <td className="px-6 py-3.5 text-sm text-gray-800">{row.feature}</td>
                <td className="px-4 py-3.5 text-center">
                  <Cell value={row.free} />
                </td>
                <td className="px-4 py-3.5 text-center bg-amber-50/70">
                  <Cell value={row.premium} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}