import AuthAwareCTA from "@/components/AuthAwareCTA";

export default function SiteGreenvilleSpecials() {
  return (
    <section className="max-w-6xl mx-auto px-4 py-16">
      <div className="max-w-2xl mb-10">
        <span className="inline-block bg-teal-500/10 text-teal-700 text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-5">
          Greenville, SC
        </span>
        <h2 className="font-heading text-4xl sm:text-5xl font-bold text-gray-900">
          Greenville happy hour specials in one place
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
        <div>
          <p className="text-gray-500 text-base leading-relaxed mb-4">
            From Downtown and Main Street to the West End and Falls Park, Happy Hour Flower brings together{" "}
            <span className="font-bold text-gray-700">Greenville happy hour specials</span>, food and drink deals, and local bar promotions — updated by the venues themselves.
          </p>
          <p className="text-gray-500 text-base leading-relaxed mb-6">
            Whether you're searching for <span className="font-bold text-gray-700">restaurant specials near me</span> or{" "}
            <span className="font-bold text-gray-700">drink specials near me</span>, you'll find it here.
          </p>
          <AuthAwareCTA
            to="/explore"
            className="bg-red-500 hover:bg-red-400 text-white font-bold px-6 py-3 rounded-xl shadow-lg transition-colors disabled:opacity-60 inline-flex items-center gap-2"
          >
            Browse Greenville Specials
          </AuthAwareCTA>
        </div>

        <img
          src="https://base44.app/api/apps/6a1f45eb9cf7513caebbab49/files/mp/public/6a1f45eb9cf7513caebbab49/557694638_gvl.webp"
          width={1024} height={1024} loading="lazy" decoding="async"
          alt="The Reedy River in downtown Greenville, South Carolina at golden hour"
          className="w-full rounded-3xl shadow-xl"
        />
      </div>
    </section>
  );
}