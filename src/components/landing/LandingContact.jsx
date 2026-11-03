import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { base44 } from "@/api/base44Client";

export default function LandingContact() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    await base44.entities.Lead.create({ email, notes: message, source: "landing_contact", role: "consumer" });
    setSubmitted(true);
    setLoading(false);
  };

  return (
    <section className="py-12 px-4 bg-gray-950">
      <div className="max-w-xl mx-auto text-center">
        <h2 className="text-4xl font-extrabold text-white mb-3">Questions? Get in Touch</h2>
        <p className="text-gray-400 text-lg mb-10">We'd love to hear from you — whether you're a drinker or a bar owner.</p>
        {submitted ? (
          <div className="bg-green-900/30 border border-green-700 rounded-2xl p-8 text-green-300 font-semibold text-lg">
            ✅ Got it! We'll be in touch soon.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 text-left">
            <Input
              type="email"
              placeholder="Your email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
            />
            <textarea
              placeholder="Your message (optional)"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              className="w-full rounded-md border border-gray-700 bg-gray-800 text-white placeholder:text-gray-500 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber-500"
            />
            <Button type="submit" disabled={loading} className="w-full bg-amber-500 hover:bg-amber-400 text-white font-bold py-3 rounded-xl">
              {loading ? "Sending..." : "Send Message"}
            </Button>
          </form>
        )}
      </div>
    </section>
  );
}