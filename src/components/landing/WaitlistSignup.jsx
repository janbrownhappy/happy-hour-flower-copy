import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { base44 } from "@/api/base44Client";

export default function WaitlistSignup() {
  const [form, setForm] = useState({ first_name: "", last_name: "", email: "", zip_code: "", phone: "" });
  const [smsConsent, setSmsConsent] = useState(false);
  const [emailConsent, setEmailConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const submittedAt = new Date().toISOString();
    let ip_address = null;
    try {
      const res = await fetch("https://api.ipify.org?format=json");
      const data = await res.json();
      ip_address = data.ip;
    } catch (_) {}
    await base44.entities.Waitlist.create({
      ...form,
      source: "landing_page",
      email_consent: emailConsent,
      sms_consent: smsConsent,
      submitted_at: submittedAt,
      ip_address,
    });

    // Confirmation email is sent by the "Waitlist Signup Confirmation Email" workflow.

    setDone(true);
    setLoading(false);
  };

  return (
    <section id="waitlist-signup" className="py-12 px-4 bg-amber-500">
      <div className="max-w-xl mx-auto text-center">
        <h2 className="text-3xl font-extrabold text-white mb-2">Be First to Know When We Launch</h2>
        <p className="text-amber-100 mb-6">Drop your info and we'll notify you the moment Happy Hour Flower goes live in your area.</p>

        {done ? (
          <div className="bg-white rounded-2xl px-8 py-8 text-center shadow-xl">
            <div className="text-5xl mb-4">🌸</div>
            <h3 className="text-gray-900 font-extrabold text-2xl mb-2">You're on the list!</h3>
            <p className="text-gray-600 text-base mb-4">
              Thanks, <strong>{form.first_name}</strong>! Your registration has been received and your preferences have been saved.
            </p>
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-left text-sm text-gray-700 space-y-1">
              <p>✅ <strong>Email notifications:</strong> {emailConsent ? "Opted in" : "Not selected"}</p>
              <p>✅ <strong>SMS notifications:</strong> {smsConsent ? "Opted in" : "Not selected"}</p>
              {form.phone && <p>✅ <strong>Mobile:</strong> {form.phone}</p>}
            </div>
            <p className="text-gray-500 text-sm mt-4">We'll be in touch the moment Happy Hour Flower launches in your area.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <div className="flex gap-3">
              <Input name="first_name" required placeholder="First name *" value={form.first_name} onChange={handleChange}
                className="bg-white border-0 text-gray-900 placeholder:text-gray-400 rounded-xl h-12 text-base" />
              <Input name="last_name" required placeholder="Last name *" value={form.last_name} onChange={handleChange}
                className="bg-white border-0 text-gray-900 placeholder:text-gray-400 rounded-xl h-12 text-base" />
            </div>
            <div className="flex gap-3">
              <Input type="email" name="email" required placeholder="Email *" value={form.email} onChange={handleChange}
                className="flex-1 bg-white border-0 text-gray-900 placeholder:text-gray-400 rounded-xl h-12 text-base" />
              <Input name="zip_code" required placeholder="ZIP *" value={form.zip_code} onChange={handleChange}
                className="w-32 bg-white border-0 text-gray-900 placeholder:text-gray-400 rounded-xl h-12 text-base" />
            </div>
            <Input type="tel" name="phone" placeholder="Mobile phone (optional)" value={form.phone} onChange={handleChange}
              className="bg-white border-0 text-gray-900 placeholder:text-gray-400 rounded-xl h-12 text-base" />
            <Button type="submit" disabled={loading || !emailConsent || !smsConsent}
              className="bg-gray-900 hover:bg-gray-800 text-white font-bold px-6 h-12 rounded-xl disabled:opacity-50">
              {loading ? "Saving..." : "Notify Me 🍹"}
            </Button>

            <label className="flex items-start gap-3 text-left cursor-pointer mt-1">
              <input
                type="checkbox"
                checked={emailConsent}
                onChange={e => setEmailConsent(e.target.checked)}
                className="mt-1 w-4 h-4 flex-shrink-0 accent-gray-900 cursor-pointer"
                required
              />
              <span className="text-white text-sm font-medium leading-relaxed">
                By submitting this form, you agree to receive email communications from Happy Hour Flower. We respect your privacy and will never sell or share your information. You can unsubscribe at any time.
              </span>
            </label>

            <label className="flex items-start gap-3 text-left cursor-pointer">
              <input
                type="checkbox"
                checked={smsConsent}
                onChange={e => setSmsConsent(e.target.checked)}
                className="mt-1 w-4 h-4 flex-shrink-0 accent-gray-900 cursor-pointer"
              />
              <span className="text-white text-sm font-medium leading-relaxed">
                I also agree to receive text messages from Happy Hour Flower. Message and data rates may apply. Reply STOP to opt out at any time.
              </span>
            </label>
          </form>
        )}
        </div>
    </section>
  );
}