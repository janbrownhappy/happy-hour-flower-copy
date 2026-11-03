import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlusCircle, ChevronLeft, Loader2, ShieldCheck } from 'lucide-react';
import { FIELD_CLASS } from '@/components/portal/portalFieldClass';

const RELATIONSHIP_LABELS = {
  owner: 'I am the Owner',
  general_manager: 'General Manager',
  marketing_manager: 'Marketing Manager',
  authorized_representative: 'Authorized Representative',
  other: 'Other',
};

export default function PortalAdd() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [venueTypes, setVenueTypes] = useState([]);

  useEffect(() => {
    base44.entities.VenueType.list('sort_order', 200)
      .then(list => setVenueTypes(list.filter(t => t.is_active !== false)))
      .catch(() => setVenueTypes([]));
  }, []);
  const [form, setForm] = useState({
    business_name: '',
    address: '',
    city: '',
    category: '',
    business_phone: '',
    claimant_name: '',
    claimant_email: '',
    claimant_phone: '',
    relationship: '',
    website: '', // honeypot
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.website) return; // honeypot
    if (!form.category) { alert('Please select a category.'); return; }
    if (!form.business_name.trim() || !form.business_phone.trim() || !form.claimant_name.trim() || !form.claimant_email.trim() || !form.relationship) return;
    setSubmitting(true);
    try {
      await base44.entities.VenueClaimRequest.create({
        source: 'portal',
        request_type: 'add',
        venue_name: form.business_name.trim(),
        proposed_address: form.address.trim(),
        proposed_city: form.city.trim(),
        proposed_category: form.category.trim(),
        proposed_phone: form.business_phone.trim(),
        claimant_name: form.claimant_name.trim(),
        claimant_email: form.claimant_email.trim(),
        claimant_phone: form.claimant_phone.trim(),
        relationship: form.relationship,
        status: 'pending',
      });
      navigate('/portal/thank-you?type=add');
    } catch (err) {
      alert('Something went wrong submitting your business. Please try again.');
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <button onClick={() => navigate('/portal')} className="inline-flex items-center gap-1 text-sm text-amber-700 hover:text-amber-900 mb-5">
        <ChevronLeft className="w-4 h-4" /> Back to search
      </button>

      <h1 className="font-heading text-3xl font-bold text-amber-900 mb-1">Add your business</h1>
      <p className="text-amber-900/70 mb-6">Not listed yet? Give us the details and we'll get your venue set up, then link it to your account.</p>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Business details */}
        <div className="bg-white border border-amber-100 rounded-2xl p-6 space-y-4 shadow-sm">
          <p className="font-heading font-bold text-amber-900">Business details</p>
          <div>
            <Label className="text-amber-900">Business name *</Label>
            <Input value={form.business_name} onChange={e => setForm(f => ({ ...f, business_name: e.target.value }))} className={FIELD_CLASS} required />
          </div>
          <div>
            <Label className="text-amber-900">Address</Label>
            <Input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} className={FIELD_CLASS} placeholder="123 Main St" />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-amber-900">City</Label>
              <Input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} className={FIELD_CLASS} />
            </div>
            <div>
              <Label className="text-amber-900">Category *</Label>
              <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                <SelectTrigger className={FIELD_CLASS}><SelectValue placeholder="Select a category…" /></SelectTrigger>
                <SelectContent>
                  {venueTypes.map(t => (
                    <SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>
                  ))}
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label className="text-amber-900">Business phone *</Label>
            <Input type="tel" value={form.business_phone} onChange={e => setForm(f => ({ ...f, business_phone: e.target.value }))} className={FIELD_CLASS} placeholder="(864) 555-0000" required />
          </div>
        </div>

        {/* Your info */}
        <div className="bg-white border border-amber-100 rounded-2xl p-6 space-y-4 shadow-sm">
          <p className="font-heading font-bold text-amber-900">Your information</p>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-amber-900">Full name *</Label>
              <Input value={form.claimant_name} onChange={e => setForm(f => ({ ...f, claimant_name: e.target.value }))} className={FIELD_CLASS} required />
            </div>
            <div>
              <Label className="text-amber-900">Phone</Label>
              <Input value={form.claimant_phone} onChange={e => setForm(f => ({ ...f, claimant_phone: e.target.value }))} className={FIELD_CLASS} />
            </div>
          </div>
          <div>
            <Label className="text-amber-900">Email address *</Label>
            <Input type="email" value={form.claimant_email} onChange={e => setForm(f => ({ ...f, claimant_email: e.target.value }))} className={FIELD_CLASS} required />
          </div>
          <div>
            <Label className="text-amber-900">Your role *</Label>
            <Select value={form.relationship} onValueChange={v => setForm(f => ({ ...f, relationship: v }))}>
              <SelectTrigger className={FIELD_CLASS}><SelectValue placeholder="Select your role…" /></SelectTrigger>
              <SelectContent>
                {Object.entries(RELATIONSHIP_LABELS).map(([val, label]) => (
                  <SelectItem key={val} value={val}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {/* Honeypot */}
          <input type="text" tabIndex={-1} autoComplete="off" value={form.website} onChange={e => setForm(f => ({ ...f, website: e.target.value }))} className="hidden" aria-hidden="true" />
        </div>

        <div className="flex items-start gap-2 text-xs text-amber-900/60">
          <ShieldCheck className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
          <p>By submitting, you confirm the information is accurate. Our team reviews new businesses before they go live.</p>
        </div>

        <Button type="submit" disabled={submitting} className="w-full h-12 bg-amber-500 hover:bg-amber-600 text-white font-semibold text-base">
          {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting…</> : <><PlusCircle className="w-4 h-4 mr-2" /> Submit business</>}
        </Button>
      </form>
    </div>
  );
}