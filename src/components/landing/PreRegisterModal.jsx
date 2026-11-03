import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { base44 } from "@/api/base44Client";

export default function PreRegisterModal({ onClose }) {
  const [step, setStep] = useState(2); // go straight to form
  const [role, setRole] = useState("consumer");
  const [form, setForm] = useState({ first_name: "", last_name: "", email: "", phone: "", zip_code: "", venue_name: "" });
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleRoleSelect = (r) => {
    setRole(r);
    setStep(2);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email) return;
    setLoading(true);
    await base44.entities.Lead.create({
      ...form,
      role,
      source: "landing_page",
      status: "new",
    });
    setDone(true);
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-gray-900 border border-gray-700 rounded-3xl shadow-2xl p-8">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors">
          <X className="w-5 h-5" />
        </button>

        {done ? (
          <div className="text-center py-6">
            <div className="text-5xl mb-4">🌸</div>
            <h2 className="text-2xl font-extrabold text-white mb-2">You're on the list!</h2>
            <p className="text-gray-300 text-sm mb-6">
              We'll reach out as soon as we launch. Welcome to the Happy Hour Flower community!
            </p>
            <Button onClick={onClose} className="bg-amber-500 hover:bg-amber-400 text-white font-bold px-8 py-3 rounded-xl w-full">
              Close
            </Button>
          </div>
        ) : (
          <>
            <h2 className="text-2xl font-extrabold text-white mb-1">Join the Explorer List</h2>
            <p className="text-gray-400 text-sm mb-6">We'll notify you the moment we launch.</p>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="flex gap-2">
                <Input
                  placeholder="First name"
                  value={form.first_name}
                  onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                  className="bg-gray-800 border-gray-600 text-white placeholder:text-gray-500"
                />
                <Input
                  placeholder="Last name"
                  value={form.last_name}
                  onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                  className="bg-gray-800 border-gray-600 text-white placeholder:text-gray-500"
                />
              </div>
              <Input
                type="email"
                placeholder="Email address *"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="bg-gray-800 border-gray-600 text-white placeholder:text-gray-500"
              />
              <Input
                placeholder="Phone number"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="bg-gray-800 border-gray-600 text-white placeholder:text-gray-500"
              />
              {role === "consumer" && (
                <Input
                  placeholder="ZIP code"
                  value={form.zip_code}
                  onChange={(e) => setForm({ ...form, zip_code: e.target.value })}
                  className="bg-gray-800 border-gray-600 text-white placeholder:text-gray-500"
                />
              )}

              <Button type="submit" disabled={loading} className="w-full bg-amber-500 hover:bg-amber-400 text-white font-bold py-3 rounded-xl mt-2">
                {loading ? "Saving..." : "🌸 Count Me In"}
              </Button>
              <p className="text-gray-500 text-xs text-center">No spam. Unsubscribe anytime.</p>
            </form>
          </>
        )}
      </div>
    </div>
  );
}