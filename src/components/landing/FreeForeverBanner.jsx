export default function FreeForeverBanner() {
  return (
    <div className="relative w-full py-12 px-6 text-center overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url('https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1600&q=80')" }}
      />
      <div className="absolute inset-0 bg-black/70" />
      <div className="relative z-10 max-w-3xl mx-auto">
        <p className="text-orange-400 text-3xl sm:text-4xl font-black uppercase tracking-wide mb-2">FREE FOREVER</p>
        <h2 className="text-white text-4xl sm:text-5xl font-extrabold mb-5">Discover Deals in Greenville</h2>
        <p className="text-gray-300 text-base sm:text-lg leading-relaxed">
          Find the best happy hour deals in Greenville, SC with Happy Hour Flower. We provide comprehensive listings of bars and restaurants, including hours, specials, and amenities. Never miss a deal again!
        </p>
      </div>
    </div>
  );
}