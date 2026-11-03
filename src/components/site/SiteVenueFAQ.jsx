import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const FAQS = [
  {
    q: "How do I list my venue?",
    a: "Create a free venue owner account and add your business in a few minutes. You'll set your happy hours, deals, photos, and contact details — then your listing goes live in search and on the map.",
  },
  {
    q: "Can I update my happy hours and deals whenever I want?",
    a: "Yes. You control your listing from your dashboard and can edit hours, per-day deals, and specials any time. Changes appear to customers right away.",
  },
  {
    q: "How do I claim a listing that's already on the platform?",
    a: "If your venue is already listed, use the 'Claim an Existing Listing' option. We verify your relationship to the business, then hand you full control of the profile.",
  },
  {
    q: "What analytics do I get?",
    a: "Premium venues see how their listing performs — views, favorites, and offer engagement — plus weekly performance reports. Platinum adds competitor insights so you can benchmark against nearby venues.",
  },
  {
    q: "Which deals count as premium-only?",
    a: "On paid plans you can flag specific deals as premium-exclusive, so they're shown only to premium members — a great way to reward your most engaged local customers.",
  },
  {
    q: "Is there a free option?",
    a: "Absolutely. The Free plan gets you on the map with a basic listing, happy hours, deals, and customer reviews — no cost, no commitment. Upgrade whenever you want more reach and insights.",
  },
];

export default function SiteVenueFAQ() {
  return (
    <section className="max-w-3xl mx-auto px-4 py-16">
      <div className="text-center mb-10">
        <p className="text-blue-600 font-semibold text-sm uppercase tracking-widest mb-2">FAQ</p>
        <h2 className="font-heading text-3xl font-bold text-gray-900">Frequently asked questions</h2>
        <p className="text-gray-600 mt-3">Everything owners ask about listing management and analytics.</p>
      </div>

      <Accordion type="single" collapsible className="w-full">
        {FAQS.map((item, i) => (
          <AccordionItem key={i} value={`faq-${i}`}>
            <AccordionTrigger className="text-left font-semibold text-gray-900">
              {item.q}
            </AccordionTrigger>
            <AccordionContent className="text-gray-600 leading-relaxed">
              {item.a}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}