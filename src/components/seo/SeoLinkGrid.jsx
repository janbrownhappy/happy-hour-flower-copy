import { Link } from 'react-router-dom';

export default function SeoLinkGrid({ title, links }) {
  if (!links.length) return null;
  return (
    <section className="max-w-5xl mx-auto px-4 py-10">
      <h2 className="font-heading text-2xl sm:text-3xl font-bold text-gray-900 mb-5">{title}</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {links.map(l => (
          <Link key={l.to} to={l.to} className="bg-white border border-gray-200 hover:border-amber-400 rounded-2xl px-4 py-3 font-semibold text-gray-800 transition-colors">
            {l.label}
          </Link>
        ))}
      </div>
    </section>
  );
}