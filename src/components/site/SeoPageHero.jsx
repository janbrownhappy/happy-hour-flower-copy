import { Link } from "react-router-dom";

export default function SeoPageHero({ eyebrow, title, intro, cta }) {
  return (
    <section className="bg-gradient-to-br from-rose-50 via-amber-50 to-teal-50">
      <div className="max-w-4xl mx-auto px-4 py-10">
        <span className="inline-block bg-white/70 text-gray-800 text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-full mb-4 shadow-sm">
          {eyebrow}
        </span>
        <h1 className="font-heading text-4xl sm:text-6xl font-bold text-gray-900 leading-[1.05] mb-4">{title}</h1>
        <p className={`text-gray-600 text-lg max-w-2xl ${cta ? 'mb-6' : ''}`}>{intro}</p>
        {cta && (
          <Link to={cta.to} className="bg-gray-900 hover:bg-gray-800 text-white font-bold text-lg px-8 py-4 rounded-2xl shadow-lg transition-colors inline-flex items-center justify-center gap-2">
            {cta.label}
          </Link>
        )}
      </div>
    </section>
  );
}