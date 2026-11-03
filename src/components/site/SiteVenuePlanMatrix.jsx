import { Check, X } from "lucide-react";

const ROWS = [
  { feature: "Active happy hour listings", free: "1", premium: "Unlimited", platinum: "Unlimited" },
  { feature: "Photos per listing", free: "1", premium: "Unlimited", platinum: "Unlimited" },
  { feature: "Description length", free: "200 chars", premium: "1,000 chars", platinum: "1,000 chars" },
  { feature: "Real-time listing updates", free: "Monthly", premium: true, platinum: true },
  { feature: "Recurring event scheduling", free: false, premium: true, platinum: true },
  { feature: "Featured placement in search", free: false, premium: true, platinum: true },
  { feature: "Exclusive premium specials", free: false, premium: true, platinum: true },
  { feature: "Direct messaging with customers", free: false, premium: true, platinum: true },
  { feature: "Analytics dashboard", free: "Basic", premium: "Comprehensive", platinum: "Comprehensive" },
  { feature: "Weekly performance reports", free: false, premium: true, platinum: true },
  { feature: "Enhanced map presence", free: false, premium: true, platinum: true },
  { feature: "Push notification credits", free: false, premium: "10/mo", platinum: "Higher" },
  { feature: "Priority listing approval", free: "48h", premium: "2h", platinum: "2h" },
  { feature: "Support response time", free: "48h", premium: "4h", platinum: "4h" },
  { feature: "Social media sharing tools", free: false, premium: true, platinum: true },
  { feature: "Geofencing & beacon campaigns", free: false, premium: false, platinum: true },
  { feature: "Apple / Google Wallet passes", free: false, premium: false, platinum: true },
  { feature: "Platinum venue badge", free: false, premium: false, platinum: true },
  { feature: "Homepage / curated features", free: false, premium: false, platinum: true },
];

function Cell({ value }) {
  if (value === true) return <Check className="w-5 h-5 text-amber-500 mx-auto" strokeWidth={2.5} />;
  if (value === false) return <X className="w-5 h-5 text-gray-300 mx-auto" strokeWidth={2} />;
  return <span className="text-sm font-semibold text-gray-700">{value}</span>;
}

export default function SiteVenuePlanMatrix() {
  return (
    <section className="bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-20">
        <div className="text-center mb-12">
          <span className="inline-block bg-teal-500/10 text-teal-700 text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-4">
            Compare Plans
          </span>
          <h2 className="font-heading text-4xl sm:text-5xl font-bold text-gray-900">
            Free vs Premium vs Platinum
          </h2>
        </div>

        <div className="rounded-3xl border border-gray-200 overflow-hidden bg-white shadow-sm overflow-x-auto">
          <table className="w-full border-collapse min-w-[640px]">
            <thead>
              <tr>
                <th className="text-left font-heading font-bold text-gray-900 px-6 py-4 bg-gray-50">Feature</th>
                <th className="w-28 text-center font-heading font-bold text-gray-900 px-4 py-4 bg-gray-50">Free</th>
                <th className="w-32 text-center font-heading font-bold text-gray-900 px-4 py-4 bg-amber-100">Premium</th>
                <th className="w-32 text-center font-heading font-bold text-gray-900 px-4 py-4 bg-gray-900 text-white">Platinum</th>
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
                  <td className="px-4 py-3.5 text-center bg-gray-100/60">
                    <Cell value={row.platinum} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}