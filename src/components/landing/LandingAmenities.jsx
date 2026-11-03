const amenities = [
  { emoji: "🎵", label: "Live Music" },
  { emoji: "🏈", label: "Sports TV" },
  { emoji: "🌳", label: "Outdoor Seating" },
  { emoji: "🐾", label: "Dog Friendly" },
  { emoji: "🎱", label: "Pool / Games" },
  { emoji: "🍕", label: "Food Specials" },
  { emoji: "🍺", label: "Craft Beer" },
  { emoji: "🍷", label: "Wine Deals" },
  { emoji: "🍸", label: "Cocktails" },
  { emoji: "📺", label: "Happy Hour TV" },
  { emoji: "💃", label: "Dancing" },
  { emoji: "🎤", label: "Karaoke" },
];

export default function LandingAmenities() {
  return (
    <section className="py-12 px-4 bg-gray-950">
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-4xl font-extrabold text-white mb-3">Filter by What You're Looking For</h2>
        <p className="text-gray-400 text-lg mb-8">
          Find exactly the vibe you want — from live music to dog-friendly patios.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          {amenities.map((a) => (
            <div
              key={a.label}
              className="flex items-center gap-2 bg-gray-800 border border-gray-700 rounded-full px-4 py-2 text-sm font-medium text-gray-200 hover:border-amber-500/50 hover:text-amber-300 transition-colors cursor-default"
            >
              <span>{a.emoji}</span>
              <span>{a.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}