export default function SeoQuestion({ q, children }) {
  return (
    <section className="py-8 border-b border-gray-100 last:border-0">
      <h2 className="font-heading text-2xl sm:text-3xl font-bold text-gray-900 mb-4">{q}</h2>
      <div className="text-gray-600 text-lg leading-relaxed space-y-3">{children}</div>
    </section>
  );
}