import { Link } from "react-router-dom";

export default function SeoBottomCta({ to, label }) {
  return (
    <section className="max-w-5xl mx-auto px-4 py-16 text-center">
      <Link to={to} className="bg-gray-900 hover:bg-gray-800 text-white font-bold text-lg px-8 py-4 rounded-2xl shadow-lg transition-colors inline-flex items-center gap-2">
        {label}
      </Link>
    </section>
  );
}