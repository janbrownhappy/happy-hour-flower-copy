import { useEffect } from "react";
import { HOME_FAQ, HOME_JSON_LD } from "@/lib/homeFaq";

export default function SiteHomeFaq() {
  useEffect(() => {
    const s = document.createElement("script");
    s.type = "application/ld+json";
    s.id = "home-jsonld";
    s.textContent = JSON.stringify(HOME_JSON_LD);
    document.head.appendChild(s);
    return () => s.remove();
  }, []);

  return (
    <section id="faq" className="py-20 bg-white">
      <div className="max-w-4xl mx-auto px-4">
        <h2 className="font-heading text-3xl sm:text-4xl font-bold text-gray-900 mb-10 text-center">Greenville Happy Hour FAQ</h2>
        <div className="grid gap-5">
          {HOME_FAQ.map(({ q, a }) => (
            <div key={q} className="bg-white rounded-2xl border border-gray-200 p-6">
              <h3 className="font-heading font-bold text-lg text-gray-900 mb-2">{q}</h3>
              <p className="text-gray-600 leading-relaxed">{a}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}