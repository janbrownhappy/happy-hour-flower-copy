import { ClipboardList, Clock, ImagePlus, Tag } from "lucide-react";

const ITEMS = [
  { icon: Clock, title: "Set your happy hours", desc: "Add per-day schedules and specials so locals always know when to come in." },
  { icon: Tag, title: "Publish your deals", desc: "List drink and food specials — mark premium-only offers to reward members." },
  { icon: ImagePlus, title: "Show off your space", desc: "Upload photos, add your story, and link your website and socials." },
  { icon: ClipboardList, title: "Update anytime", desc: "Change hours, deals, and details from one dashboard — instantly live." },
];

export default function SiteListingManagement() {
  return (
    <section className="bg-white">
      <div className="max-w-5xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <p className="text-blue-600 font-semibold text-sm uppercase tracking-widest mb-2">
            Manage your listing
          </p>
          <h2 className="font-heading text-3xl sm:text-4xl font-bold text-gray-900">
            Everything about your venue, in one place
          </h2>
          <p className="text-gray-600 mt-3 max-w-xl mx-auto">
            Keep your specials, hours, and photos current — no phone calls, no waiting.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {ITEMS.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="flex items-start gap-4 rounded-2xl border border-gray-200 p-6">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
                <Icon className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-heading font-bold text-lg text-gray-900 mb-1">{title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}