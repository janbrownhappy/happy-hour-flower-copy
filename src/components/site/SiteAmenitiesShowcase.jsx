import {
  Martini, Beer, Wine, Utensils, Sandwich, Tags,
  Trees, Building2, Gem, VolumeX, Users, Heart,
  Dog, Briefcase, Moon, CalendarHeart, Music, Tv,
  ParkingCircle, CalendarCheck, Accessibility, Wheat, Leaf, CupSoda, GlassWater,
} from "lucide-react";

const GROUPS = [
  {
    label: "Drinks & Deals",
    accent: "amber",
    items: [
      { icon: Martini, name: "Cocktail deals" },
      { icon: Beer, name: "Beer deals" },
      { icon: Wine, name: "Wine deals" },
      { icon: Tags, name: "Half price deals" },
      { icon: GlassWater, name: "Margaritas & Espresso Martinis" },
      { icon: CupSoda, name: "Mocktails / Non-alcoholic" },
    ],
  },
  {
    label: "Food",
    accent: "rose",
    items: [
      { icon: Utensils, name: "Food specials" },
      { icon: Sandwich, name: "Appetizers & Shareables" },
      { icon: Wheat, name: "Gluten-free options" },
      { icon: Leaf, name: "Vegan options" },
    ],
  },
  {
    label: "Vibe & Setting",
    accent: "teal",
    items: [
      { icon: Trees, name: "Outdoor patio" },
      { icon: Building2, name: "Rooftop" },
      { icon: Gem, name: "Upscale vibe" },
      { icon: VolumeX, name: "Quiet atmosphere" },
      { icon: Users, name: "Good for groups" },
      { icon: Heart, name: "Good for date night" },
      { icon: Dog, name: "Pet-friendly patio" },
    ],
  },
  {
    label: "When & What's On",
    accent: "indigo",
    items: [
      { icon: Briefcase, name: "After work" },
      { icon: Moon, name: "Late night" },
      { icon: CalendarHeart, name: "Weekend happy hour" },
      { icon: Music, name: "Live music" },
      { icon: Tv, name: "Sports on TV" },
    ],
  },
  {
    label: "Good to Know",
    accent: "emerald",
    items: [
      { icon: ParkingCircle, name: "Free parking" },
      { icon: CalendarCheck, name: "Reservations accepted" },
      { icon: Accessibility, name: "Wheelchair accessible" },
    ],
  },
];

const ACCENTS = {
  amber: { chip: "bg-amber-500/10 text-amber-700 border-amber-200 hover:bg-amber-500 hover:text-white hover:border-amber-500", dot: "bg-amber-500", label: "text-amber-600" },
  rose: { chip: "bg-rose-500/10 text-rose-700 border-rose-200 hover:bg-rose-500 hover:text-white hover:border-rose-500", dot: "bg-rose-500", label: "text-rose-600" },
  teal: { chip: "bg-teal-500/10 text-teal-700 border-teal-200 hover:bg-teal-500 hover:text-white hover:border-teal-500", dot: "bg-teal-500", label: "text-teal-600" },
  indigo: { chip: "bg-indigo-500/10 text-indigo-700 border-indigo-200 hover:bg-indigo-500 hover:text-white hover:border-indigo-500", dot: "bg-indigo-500", label: "text-indigo-600" },
  emerald: { chip: "bg-emerald-500/10 text-emerald-700 border-emerald-200 hover:bg-emerald-500 hover:text-white hover:border-emerald-500", dot: "bg-emerald-500", label: "text-emerald-600" },
};

export default function SiteAmenitiesShowcase() {
  return (
    <section className="bg-gradient-to-b from-white to-amber-50/50">
      <div className="max-w-6xl mx-auto px-4 py-20">
        <div className="text-center max-w-3xl mx-auto mb-14">
          <span className="inline-block bg-teal-500/10 text-teal-700 text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-4">
            Filter by what matters
          </span>
          <h2 className="font-heading text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
            Over 40 amenity filters. Find your exact spot.
          </h2>
          <p className="text-gray-600 text-lg">
            "Somewhere nearby" isn't a plan. Filter by patio, dog-friendly, live music, TVs for the game, or a quiet booth you can hear in. Stack as many as you want, see who's got them, and know what you're walking into before you leave the house.
          </p>
        </div>

        <div className="space-y-10">
          {GROUPS.map((group) => {
            const a = ACCENTS[group.accent];
            return (
              <div key={group.label}>
                <div className="flex items-center gap-3 mb-4">
                  <span className={`w-2.5 h-2.5 rounded-full ${a.dot}`} />
                  <h3 className={`font-heading font-bold text-sm uppercase tracking-widest ${a.label}`}>
                    {group.label}
                  </h3>
                  <div className="flex-1 h-px bg-gray-200" />
                </div>
                <div className="flex flex-wrap gap-3">
                  {group.items.map(({ icon: Icon, name }) => (
                    <span
                      key={name}
                      className={`inline-flex items-center gap-2 border rounded-full pl-3.5 pr-4 py-2.5 text-sm font-semibold transition-all cursor-default shadow-sm ${a.chip}`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      {name}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}