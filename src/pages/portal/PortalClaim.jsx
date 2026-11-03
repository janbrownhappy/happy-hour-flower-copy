import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2, MapPin, ChevronLeft, Loader2, ShieldCheck } from 'lucide-react';
import { FIELD_CLASS, TEXTAREA_CLASS } from '@/components/portal/portalFieldClass';
import ProofFileInput from '@/components/portal/ProofFileInput';
import uploadClaimProof from '@/lib/uploadClaimProof';
import VenueCategorySelect from '@/components/claim/VenueCategorySelect';
import { trackEvent as trackRybbitEvent } from '@/lib/rybbit';

const RELATIONSHIP_LABELS = {
  owner: 'I am the Owner',
  general_manager: 'General Manager',
  marketing_manager: 'Marketing Manager',
  authorized_representative: 'Authorized Representative',
  other: 'Other',
};

export default function PortalClaim() {
  const { venueId } = useParams();
  const navigate = useNavigate();
  const [venue, setVenue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [proofFile, setProofFile] = useState(null);
  const [form, setForm] = useState({
    claimant_name: '',
    claimant_email: '',
    claimant_phone: '',
    relationship: '',
    relationship_details: '',
    category: '',
    website: '', // honeypot — must stay empty
  });

  useEffect(() => {
    base44.entities.Venue.filter({ status: 'active' }, '-name', 500)
      .then(venues => setVenue(venues.find(v => v.id === venueId) || null))
      .catch(() => setVenue(null))
      .finally(() => setLoading(false));
  }, [venueId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.website) return; // honeypot tripped — silently ignore bots
    if (!form.claimant_name.trim() || !form.claimant_email.trim() || !form.relationship) return;
    if (!form.category) { alert('Please select a category.'); return; }
    setSubmitting(true);
    try {
      const proofToken = proofFile ? crypto.randomUUID() : undefined;
      const created = await base44.entities.VenueClaimRequest.create({
        ...(proofToken ? { proof_token: proofToken } : {}),
        source: 'portal',
        request_type: 'claim',
        venue_id: venue.id,
        venue_name: venue.name,
        proposed_category: form.category,
        claimant_name: form.claimant_name.trim(),
        claimant_email: form.claimant_email.trim(),
        claimant_phone: form.claimant_phone.trim(),
        relationship: form.relationship,
        relationship_details: form.relationship_details.trim(),
        status: 'pending',
      });
      if (proofFile) {
        // Claim is saved even if the upload fails; we can request proof again later.
        await uploadClaimProof(created.id, proofToken, proofFile).catch(() => {});
      }
      trackRybbitEvent('venue_claim_submitted');
      navigate('/portal/thank-you?type=claim');
    } catch (err) {
      alert('Something went wrong submitting your claim. Please try again.');
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="max-w-2xl mx-auto px-6 py-20 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-amber-500" /></div>;
  }

  if (!venue) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-20 text-center">
        <p className="text-amber-900 font-semibold">Venue not found</p>
        <p className="text-sm text-amber-900/60 mt-1">This venue may not be available. Try searching again.</p>
        <Link to="/portal" className="inline-block mt-4 text-amber-600 font-semibold hover:underline">← Back to search</Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <button onClick={() => navigate('/portal')} className="inline-flex items-center gap-1 text-sm text-amber-700 hover:text-amber-900 mb-5">
        <ChevronLeft className="w-4 h-4" /> Back to search
      </button>

      <h1 className="font-heading text-3xl font-bold text-amber-900 mb-1">Claim this venue</h1>
      <p className="text-amber-900/70 mb-6">Tell us who you are — our team reviews every claim within 1–2 business days.</p>

      {/* Selected venue */}
      <div className="bg-white border border-amber-200 rounded-2xl p-4 flex items-start gap-3 mb-6 shadow-sm">
        <div className="w-11 h-11 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
          <Building2 className="w-5 h-5 text-amber-600" />
        </div>
        <div className="min-w-0">
          <p className="font-bold text-amber-900">{venue.name}</p>
          {(venue.address || venue.city) && (
            <p className="text-xs text-amber-900/60 flex items-center gap-1 mt-0.5">
              <MapPin className="w-3 h-3" /> {[venue.address, venue.city].filter(Boolean).join(', ')}
            </p>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="bg-white border border-amber-100 rounded-2xl p-6 space-y-4 shadow-sm">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-amber-900">Full name *</Label>
              <Input value={form.claimant_name} onChange={e => setForm(f => ({ ...f, claimant_name: e.target.value }))} className={FIELD_CLASS} required />
            </div>
            <div>
              <Label className="text-amber-900">Phone</Label>
              <Input value={form.claimant_phone} onChange={e => setForm(f => ({ ...f, claimant_phone: e.target.value }))} className={FIELD_CLASS} placeholder="(864) 555-0000" />
            </div>
          </div>
          <div>
            <Label className="text-amber-900">Email address *</Label>
            <Input type="email" value={form.claimant_email} onChange={e => setForm(f => ({ ...f, claimant_email: e.target.value }))} className={FIELD_CLASS} required />
          </div>
          <div>
            <Label className="text-amber-900">Venue category *</Label>
            <VenueCategorySelect value={form.category} onChange={v => setForm(f => ({ ...f, category: v }))} className={FIELD_CLASS} />
          </div>
          <div>
            <Label className="text-amber-900">Your role at this venue *</Label>
            <Select value={form.relationship} onValueChange={v => setForm(f => ({ ...f, relationship: v }))}>
              <SelectTrigger className={FIELD_CLASS}><SelectValue placeholder="Select your role…" /></SelectTrigger>
              <SelectContent>
                {Object.entries(RELATIONSHIP_LABELS).map(([val, label]) => (
                  <SelectItem key={val} value={val}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-amber-900">Anything else we should know?</Label>
            <Textarea value={form.relationship_details} onChange={e => setForm(f => ({ ...f, relationship_details: e.target.value }))} className={TEXTAREA_CLASS} rows={3} placeholder="Tell us about your connection to this venue…" />
          </div>
          <div>
            <p className="font-bold text-amber-900 text-sm text-center">SAVE TIME ON APPROVAL.<br />Upload proof of your ownership or management of this venue.</p>
            <Label className="text-amber-900">Proof of authorization (optional)</Label>
            <p className="text-xs text-amber-900/60 mb-2">Business license, utility bill or lease in the business name, liquor license, or a signed letter from the owner. Adding it now speeds up approval. Stored privately.</p>
            <ProofFileInput file={proofFile} onChange={setProofFile} />
          </div>
          {/* Honeypot — hidden from humans */}
          <input type="text" tabIndex={-1} autoComplete="off" value={form.website} onChange={e => setForm(f => ({ ...f, website: e.target.value }))} className="hidden" aria-hidden="true" />
        </div>

        <div className="flex items-start gap-2 text-xs text-amber-900/60">
          <ShieldCheck className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
          <p>By submitting, you confirm the information is accurate. Our team may reach out to verify your authorization before approving.</p>
        </div>

        <Button type="submit" disabled={submitting} className="w-full h-12 bg-amber-500 hover:bg-amber-600 text-white font-semibold text-base">
          {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting…</> : 'Submit claim'}
        </Button>
      </form>
    </div>
  );
}