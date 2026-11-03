import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, MapPin, ChevronLeft, CheckCircle, Clock, AlertCircle, Building2, Upload } from 'lucide-react';
import ClaimVenueIntro from '@/components/claim/ClaimVenueIntro';
import VenueCategorySelect from '@/components/claim/VenueCategorySelect';
import { trackEvent as trackRybbitEvent } from '@/lib/rybbit';

const RELATIONSHIP_LABELS = {
  owner: 'I am the Owner',
  general_manager: 'General Manager',
  marketing_manager: 'Marketing Manager',
  authorized_representative: 'Authorized Representative',
  other: 'Other',
};

export default function ClaimVenue() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedId = searchParams.get('venue_id');

  const [step, setStep] = useState(preselectedId ? 2 : 1);
  const [venues, setVenues] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVenue, setSelectedVenue] = useState(null);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [existingClaim, setExistingClaim] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const [form, setForm] = useState({
    claimant_name: '',
    claimant_email: '',
    claimant_phone: '',
    relationship: '',
    relationship_details: '',
    proof_url: '',
    proposed_category: '',
  });
  const [proofFile, setProofFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const init = async () => {
      const authed = await base44.auth.isAuthenticated();
      if (!authed) {
        base44.auth.redirectToLogin(window.location.pathname + window.location.search);
        return;
      }
      const me = await base44.auth.me();
      setUser(me);
      setForm(f => ({
        ...f,
        claimant_name: me.full_name || '',
        claimant_email: me.email || '',
      }));

      // Load venues
      const allVenues = await base44.entities.Venue.list();
      setVenues(allVenues);

      if (preselectedId) {
        const v = allVenues.find(x => x.id === preselectedId);
        if (v) {
          setSelectedVenue(v);
          checkExistingClaim(v.id, me.id);
        }
      }
    };
    init();
  }, []);

  const checkExistingClaim = async (venueId, userId) => {
    const claims = await base44.entities.VenueClaimRequest.filter({ venue_id: venueId }).catch(() => []);
    const mine = claims.find(c => c.user_id === userId);
    if (mine) setExistingClaim(mine);
  };

  const filteredVenues = venues.filter(v => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return v.name?.toLowerCase().includes(q) || v.address?.toLowerCase().includes(q) || v.neighborhood?.toLowerCase().includes(q);
  });

  const handleSelectVenue = async (venue) => {
    setSelectedVenue(venue);
    setExistingClaim(null);
    setShowForm(false);
    if (user) await checkExistingClaim(venue.id, user.id);
    setStep(2);
  };

  const handleProofUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('File size must be less than 10MB');
      e.target.value = '';
      return;
    }
    
    setProofFile(file);
    setUploading(true);
    setUploadError(null);
    try {
      const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file });
      setForm(f => ({ ...f, proof_url: file_uri }));
      // Clear the file input after successful upload
      e.target.value = '';
    } catch (err) {
      setUploadError(err.message);
      alert('Upload failed: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const isChallenge = !!(selectedVenue?.owner_id);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.relationship) { alert('Please select your relationship to the venue.'); return; }
    if (!form.proposed_category) { alert('Please select a venue category.'); return; }
    if (!form.claimant_phone) { alert('Please provide your phone number.'); return; }
    if (!form.proof_url) { alert('Please upload proof of authorization (business license, utility bill, or similar document).'); return; }
    if (isChallenge && !form.relationship_details.trim()) { alert('Please explain why you believe you are the rightful owner.'); return; }
    setSubmitting(true);
    try {
      const details = isChallenge && !form.relationship_details.startsWith('OWNERSHIP CHALLENGE:')
        ? `OWNERSHIP CHALLENGE: ${form.relationship_details}`
        : form.relationship_details;
      await base44.entities.VenueClaimRequest.create({
        venue_id: selectedVenue.id,
        venue_name: selectedVenue.name,
        user_id: user.id,
        ...form,
        relationship_details: details,
        status: 'pending',
      });
      trackRybbitEvent('venue_claim_submitted');
      setSubmitted(true);
    } catch (err) {
      alert('Submission failed: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center space-y-5">
          <div className="w-20 h-20 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="w-10 h-10 text-amber-400" />
          </div>
          <div>
            <h1 className="text-2xl font-heading font-bold text-white mb-2">{isChallenge ? 'Challenge Submitted!' : 'Request Submitted!'}</h1>
            <p className="text-slate-400">{isChallenge ? 'Your ownership challenge for' : 'Your claim for'} <strong className="text-white">{selectedVenue?.name}</strong> is under review. We typically respond within 1–2 business days.</p>
          </div>
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-4 text-left space-y-2">
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide">What happens next</p>
            <ol className="text-sm text-slate-300 space-y-1.5 list-decimal list-inside">
              <li>Our team reviews your claim and proof of authorization</li>
              <li>We may reach out to you for additional verification</li>
              <li>Once approved, you'll receive a welcome email with onboarding steps</li>
              <li>Your venue will appear in your Owner Dashboard</li>
            </ol>
          </div>
          <Button onClick={() => navigate('/explore')} className="w-full bg-amber-500 hover:bg-amber-600 text-white">
            Back to Explore
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <div className="bg-slate-900 border-b border-slate-700 px-4 py-4 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <button onClick={() => step === 2 ? (showForm ? setShowForm(false) : setStep(1)) : navigate(-1)} className="p-2 rounded-lg hover:bg-slate-700">
            <ChevronLeft className="w-5 h-5 text-slate-400" />
          </button>
          <div>
            <h1 className="text-base font-heading font-bold text-white">Claim Your Venue</h1>
            <p className="text-xs text-slate-400">Step {step} of 2 — {step === 1 ? 'Find Your Venue' : isChallenge ? 'Submit Ownership Challenge' : 'Submit Your Claim'}</p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">

        {/* Step 1: Search & Select */}
        {step === 1 && (
          <>
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4">
              <div className="flex items-start gap-3">
                <Building2 className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-amber-300 font-semibold text-sm">Is your venue already listed?</p>
                  <p className="text-amber-200/70 text-xs mt-0.5">Search below to find your venue. If it's not listed yet, <Link to="/onboarding/venue" className="underline text-amber-400">add it here</Link>.</p>
                </div>
              </div>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9 bg-slate-800 border-slate-600 text-white placeholder:text-slate-500"
                placeholder="Search by name, address, or neighborhood…"
                autoFocus
              />
            </div>

            <p className="text-xs text-slate-500">{filteredVenues.filter(v => !v.owner_id).length} unclaimed • {filteredVenues.filter(v => v.owner_id).length} already claimed (can be challenged)</p>

            <div className="space-y-2 max-h-[60vh] overflow-y-auto">
              {filteredVenues.map(venue => (
                <button
                  key={venue.id}
                  onClick={() => handleSelectVenue(venue)}
                  className="w-full text-left p-4 bg-slate-800 border border-slate-700 rounded-2xl hover:border-amber-500/50 hover:bg-slate-750 transition-all group"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-semibold group-hover:text-amber-300 transition-colors">{venue.name}</p>
                      {venue.address && (
                        <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3" /> {venue.address}
                        </p>
                      )}
                      <div className="flex gap-1.5 mt-1.5 flex-wrap">
                        {venue.category && <Badge variant="secondary" className="text-xs">{venue.category}</Badge>}
                        {venue.owner_id
                          ? <Badge className="text-xs bg-orange-500/20 text-orange-300 border-orange-500/30">Already Claimed</Badge>
                          : <Badge className="text-xs bg-green-500/20 text-green-300 border-green-500/30">Unclaimed</Badge>}
                      </div>
                    </div>
                    <span className={`text-xs font-semibold group-hover:translate-x-0.5 transition-transform ${venue.owner_id ? 'text-orange-400' : 'text-amber-400'}`}>
                      {venue.owner_id ? 'Challenge →' : 'Claim →'}
                    </span>
                  </div>
                </button>
              ))}
              {filteredVenues.length === 0 && searchQuery && (
                <div className="text-center py-10">
                  <p className="text-slate-400 text-sm">No unclaimed venues match your search.</p>
                  <Link to="/onboarding/venue" className="text-amber-400 text-sm underline mt-2 inline-block">Add your venue →</Link>
                </div>
              )}
            </div>
          </>
        )}

        {/* Step 2: Intro (shown first), then the claim form */}
        {step === 2 && selectedVenue && !showForm && !existingClaim && (
          <ClaimVenueIntro
            venue={selectedVenue}
            isChallenge={isChallenge}
            onContinue={() => setShowForm(true)}
          />
        )}

        {/* Step 2: Claim Form */}
        {step === 2 && selectedVenue && (showForm || existingClaim) && (
          <>
            {isChallenge && (
              <div className="bg-orange-500/10 border border-orange-500/30 rounded-2xl p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-orange-300 font-semibold text-sm">This venue is already claimed</p>
                  <p className="text-orange-200/70 text-xs mt-0.5">If you are the rightful owner, fill out the form below to submit an ownership challenge. Our team will investigate and respond within 1–2 business days.</p>
                </div>
              </div>
            )}

            {/* Selected venue card */}
            <div className={`bg-slate-800 rounded-2xl p-4 flex items-start gap-3 ${isChallenge ? 'border border-orange-500/40' : 'border border-amber-500/40'}`}>
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                <Building2 className="w-5 h-5 text-amber-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-bold">{selectedVenue.name}</p>
                {selectedVenue.address && (
                  <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> {selectedVenue.address}
                  </p>
                )}
              </div>
              <button onClick={() => { setShowForm(false); setStep(1); }} className="text-xs text-slate-400 hover:text-slate-200">Change</button>
            </div>

            {/* Existing pending claim */}
            {existingClaim && (
              <div className={`border rounded-2xl p-4 flex items-start gap-3 ${
                existingClaim.status === 'pending' ? 'bg-amber-500/10 border-amber-500/30' :
                existingClaim.status === 'approved' ? 'bg-green-500/10 border-green-500/30' :
                'bg-red-500/10 border-red-500/30'
              }`}>
                {existingClaim.status === 'pending' ? <Clock className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" /> :
                 existingClaim.status === 'approved' ? <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" /> :
                 <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />}
                <div>
                  <p className="font-semibold text-sm text-white capitalize">{existingClaim.status === 'pending' ? 'Claim Pending Review' : existingClaim.status === 'approved' ? 'Claim Approved' : 'Claim Rejected'}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {existingClaim.status === 'pending' ? 'You already have a pending claim for this venue. We\'ll notify you once reviewed.' :
                     existingClaim.status === 'approved' ? 'Your claim was approved! Head to your Owner Dashboard.' :
                     `Your previous claim was rejected. ${existingClaim.admin_notes ? 'Reason: ' + existingClaim.admin_notes : ''} You may submit a new claim with additional documentation.`}
                  </p>
                  {existingClaim.status === 'approved' && (
                    <Button size="sm" className="mt-2 bg-amber-500 hover:bg-amber-600 text-white" onClick={() => navigate(`/claim-thank-you?venue_id=${selectedVenue.id}`)}>
                      Go to Dashboard
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Claim form — only show if no pending/approved claim */}
            {(!existingClaim || existingClaim.status === 'rejected') && (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5 space-y-4">
                  <p className="text-white font-semibold text-sm">Your Information</p>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-slate-400 text-xs">Full Name *</Label>
                      <Input value={form.claimant_name} onChange={e => setForm(f => ({ ...f, claimant_name: e.target.value }))}
                        className="bg-slate-700 border-slate-600 text-white mt-1" required />
                    </div>
                    <div>
                       <Label className="text-slate-400 text-xs">Phone *</Label>
                       <Input value={form.claimant_phone} onChange={e => setForm(f => ({ ...f, claimant_phone: e.target.value }))}
                         className="bg-slate-700 border-slate-600 text-white mt-1" placeholder="(864) 555-0000" required />
                     </div>
                  </div>

                  <div>
                    <Label className="text-slate-400 text-xs">Email Address *</Label>
                    <Input type="email" value={form.claimant_email} onChange={e => setForm(f => ({ ...f, claimant_email: e.target.value }))}
                      className="bg-slate-700 border-slate-600 text-white mt-1" required />
                  </div>

                  <div>
                    <Label className="text-slate-400 text-xs">Venue Category *</Label>
                    <VenueCategorySelect value={form.proposed_category} onChange={v => setForm(f => ({ ...f, proposed_category: v }))} className="bg-slate-700 border-slate-600 text-white mt-1" />
                  </div>

                  <div>
                    <Label className="text-slate-400 text-xs">Your Role at This Venue *</Label>
                    <Select value={form.relationship} onValueChange={v => setForm(f => ({ ...f, relationship: v }))}>
                      <SelectTrigger className="bg-slate-700 border-slate-600 text-white mt-1">
                        <SelectValue placeholder="Select your role…" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(RELATIONSHIP_LABELS).map(([val, label]) => (
                          <SelectItem key={val} value={val}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-slate-400 text-xs">{isChallenge ? 'Why Are You the Rightful Owner? *' : 'Additional Details'}</Label>
                    <Textarea value={form.relationship_details}
                      onChange={e => setForm(f => ({ ...f, relationship_details: e.target.value }))}
                      className="bg-slate-700 border-slate-600 text-white mt-1" rows={3}
                      required={isChallenge}
                      placeholder={isChallenge ? 'Explain why you believe you are the rightful owner and why the current claim is incorrect…' : 'Tell us more about your connection to this venue…'} />
                  </div>
                </div>

                <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5 space-y-3">
                  <div>
                    <p className="text-white font-semibold text-sm">Proof of Authorization *</p>
                    <p className="text-slate-400 text-xs mt-0.5">Upload a business license, utility bill, paycheck stub, or other document proving your connection to this venue.</p>
                  </div>
                  {uploadError && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-red-300">Upload failed: {uploadError}</p>
                    </div>
                  )}
                  <label className="block cursor-pointer">
                    <input type="file" key={form.proof_url || 'upload'} className="sr-only" onChange={handleProofUpload} accept="image/*,.pdf" />
                    <div className={`border-2 border-dashed rounded-xl p-5 text-center transition-colors ${form.proof_url ? 'border-green-500/50 bg-green-500/5' : 'border-slate-600 hover:border-amber-500/50'}`}>
                      {uploading ? (
                        <div className="flex flex-col items-center gap-2">
                          <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                          <p className="text-xs text-slate-400">Uploading…</p>
                        </div>
                      ) : form.proof_url ? (
                        <div className="flex flex-col items-center gap-2">
                          <CheckCircle className="w-8 h-8 text-green-400" />
                          <p className="text-xs text-green-400 font-medium">Document uploaded</p>
                          <p className="text-xs text-slate-500 truncate max-w-full">{proofFile?.name || 'Document'}</p>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              setForm(f => ({ ...f, proof_url: '' }));
                              setProofFile(null);
                              setUploadError(null);
                            }}
                            className="text-xs text-red-400 hover:underline mt-1"
                          >
                            Remove
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-2">
                          <Upload className="w-8 h-8 text-slate-500" />
                          <p className="text-sm text-slate-400">Click to upload document</p>
                          <p className="text-xs text-slate-500">JPG, PNG, or PDF (max 10MB)</p>
                        </div>
                      )}
                    </div>
                  </label>
                </div>

                <Button type="submit" disabled={submitting || uploading}
                  className={`w-full py-3 text-white font-semibold rounded-xl ${isChallenge ? 'bg-orange-500 hover:bg-orange-600' : 'bg-amber-500 hover:bg-amber-600'}`}>
                  {submitting ? (
                    <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" /> Submitting…</>
                  ) : isChallenge ? 'Submit Ownership Challenge' : 'Submit Claim Request'}
                </Button>

                <p className="text-xs text-slate-500 text-center">
                  By submitting, you confirm that all information provided is accurate. False claims may result in account suspension.
                </p>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
}