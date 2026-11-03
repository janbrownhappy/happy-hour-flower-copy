import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { setVenueOwnerRole } from '@/functions/setVenueOwnerRole';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle2, ChevronLeft, Search, MapPin, Star, AlertTriangle } from 'lucide-react';
import CascadingLocationPicker from '@/components/location/CascadingLocationPicker';

const STEPS = {
  SEARCH: 'search',
  RESULT: 'result',
  BENEFITS: 'benefits',
  HOW_IT_WORKS: 'how_it_works',
  SOCIAL_PROOF: 'social_proof',
  REGISTER: 'register',
  LOCATION: 'location',
};

export default function VenueOnboarding() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(STEPS.SEARCH);
  const [venues, setVenues] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVenue, setSelectedVenue] = useState(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    business_name: '',
    business_email: '',
    phone: '',
    password: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [venueAlreadyClaimed, setVenueAlreadyClaimed] = useState(false);
  const [challengeDetails, setChallengeDetails] = useState('');
  const [location, setLocation] = useState({
    state_id: '', state: '', state_code: '', market_id: '', market_name: '', zip_code: '',
  });

  useEffect(() => {
    base44.auth.isAuthenticated().then(async (authed) => {
      if (authed) {
        const me = await base44.auth.me();
        // Ensure the role is set to venue_owner (handles social login path)
        if (me.role !== 'venue_owner' && me.role !== 'admin') {
          await setVenueOwnerRole({}).catch(() => {});
        }
        setUser(me);
        // If user already has venues, skip onboarding and go to dashboard
        const allVenues = await base44.entities.Venue.list();
        const existingVenues = allVenues.filter(v => v.owner_id === me.id);
        if (existingVenues.length > 0) {
          window.location.href = '/venue-owner';
          return;
        }
      } else {
        // Redirect to login
        base44.auth.redirectToLogin('/onboarding/venue');
      }
      setAuthLoading(false);
    });
  }, []);

  // Load venues for search
  const handleSearch = async (query) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setVenues([]);
      return;
    }
    setLoading(true);
    try {
      const results = await base44.entities.Venue.list('-created_date', 100);
      const filtered = results.filter(v =>
        v.name?.toLowerCase().includes(query.toLowerCase())
      );
      setVenues(filtered);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClaim = (venue) => {
    setSelectedVenue(venue);
    setVenueAlreadyClaimed(!!(venue.owner_id));
    setFormData(prev => ({
      ...prev,
      business_name: venue.name,
    }));
    setCurrentStep(STEPS.RESULT);
  };

  const handleCreateNew = () => {
    setSelectedVenue(null);
    setFormData(prev => ({ ...prev, business_name: searchQuery }));
    setCurrentStep(STEPS.REGISTER);
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    
    if (!user) {
      alert('Please sign in first');
      base44.auth.redirectToLogin('/onboarding/venue');
      return;
    }
    
    setSubmitting(true);
    try {
      console.log('Current user:', user);
      
      // If claiming existing venue, submit a claim request for admin review
      if (selectedVenue) {
        await base44.entities.VenueClaimRequest.create({
          venue_id: selectedVenue.id,
          venue_name: selectedVenue.name,
          user_id: user.id,
          claimant_name: user.full_name || formData.business_name,
          claimant_email: formData.business_email || user.email,
          claimant_phone: formData.phone,
          relationship: 'owner',
          relationship_details: venueAlreadyClaimed ? `OWNERSHIP CHALLENGE: ${challengeDetails}` : '',
          status: 'pending',
        });
        const msg = venueAlreadyClaimed
          ? `Your ownership challenge for "${selectedVenue.name}" has been submitted! Our team will investigate and respond within 1–2 business days.`
          : `Your claim for "${selectedVenue.name}" has been submitted! Our team will review it within 24 hours and notify you by email.`;
        alert(msg);
        window.location.href = '/venue-owner';
      } else {
        // New venue: collect location before creating the venue record
        setSubmitting(false);
        setCurrentStep(STEPS.LOCATION);
        return;
      }
    } catch (error) {
      console.error('Registration error:', error);
      alert('Error: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleLocationSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      base44.auth.redirectToLogin('/onboarding/venue');
      return;
    }
    setSubmitting(true);
    try {
      // Create the new venue with its location hierarchy
      const newVenue = await base44.entities.Venue.create({
        name: formData.business_name,
        owner_id: user.id,
        status: 'pending',
        phone: formData.phone || undefined,
        zip_code: location.zip_code || undefined,
        state_id: location.state_id || undefined,
        state_code: location.state_code || undefined,
        market_id: location.market_id || undefined,
        market_name: location.market_name || undefined,
      });

      // Also store the owner's location preferences on their Profile
      const profiles = await base44.entities.Profile.filter({ created_by_id: user.id });
      const locPrefs = {
        state: location.state,
        state_id: location.state_id,
        state_code: location.state_code,
        market_id: location.market_id,
        market_name: location.market_name,
        zip_code: location.zip_code,
        last_updated: new Date().toISOString(),
      };
      const profileData = { zip_code: location.zip_code, location_preferences: locPrefs };
      if (profiles.length > 0) {
        await base44.entities.Profile.update(profiles[0].id, profileData);
      } else {
        await base44.entities.Profile.create(profileData);
      }

      // Send new venues to the guided setup wizard
      window.location.href = `/venue-setup/${newVenue.id}`;
    } catch (error) {
      console.error('Venue creation error:', error);
      alert('Error: ' + error.message);
      setSubmitting(false);
    }
  };

  // Step indicators
  const getStepNumber = () => {
    const stepOrder = [STEPS.SEARCH, STEPS.RESULT, STEPS.BENEFITS, STEPS.HOW_IT_WORKS, STEPS.SOCIAL_PROOF, STEPS.REGISTER];
    return stepOrder.indexOf(currentStep) + 1;
  };

  const stepNumber = getStepNumber();
  const totalSteps = 6;

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-amber-200 border-t-amber-500 rounded-full animate-spin" />
      </div>
    );
  }

  // ============ STEP 1: SEARCH ============
  if (currentStep === STEPS.SEARCH) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 p-4">
        <div className="max-w-lg mx-auto py-8">
          {/* Progress */}
          <div className="flex justify-center gap-1 mb-8">
            {[...Array(3)].map((_, i) => (
              <div key={i} className={`h-1.5 w-6 rounded-full ${i === 0 ? 'bg-amber-500' : 'bg-slate-600'}`} />
            ))}
          </div>

          {/* Back Button */}
          <button onClick={() => navigate('/onboarding')} className="flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors">
            <ChevronLeft className="w-4 h-4" /> Back
          </button>

          <div className="text-center mb-8">
            <h2 className="text-2xl font-heading font-bold text-white mb-2">Is your venue already listed?</h2>
            <p className="text-slate-400 text-sm">Search by name. If we already have your business, you can claim it and skip the setup.</p>
          </div>

          {/* Search Input */}
          <div className="relative mb-6">
            <Search className="absolute left-3 top-3 w-5 h-5 text-slate-500" />
            <Input
              placeholder="Search venue name..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10 bg-slate-700 border-slate-600 text-white"
              autoFocus
            />
          </div>

          {/* Results */}
          <div className="space-y-2 mb-6">
            {loading && <p className="text-slate-400 text-sm">Searching...</p>}
            {venues.map(venue => (
              <button
                key={venue.id}
                onClick={() => handleClaim(venue)}
                className="w-full p-3 rounded-lg bg-slate-700 hover:bg-slate-600 transition-colors text-left"
              >
                <div className="font-semibold text-white">{venue.name}</div>
                <div className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3 h-3" /> {venue.address}
                </div>
              </button>
            ))}
          </div>

          {/* Create New Option */}
          <Button
            onClick={handleCreateNew}
            className="w-full bg-amber-500 hover:bg-amber-600 text-white font-semibold py-2 rounded-lg"
          >
            My Venue Isn't Listed Yet →
          </Button>

          <p className="text-xs text-slate-500 text-center mt-3">Type at least 2 characters to search • Don't see yours? Keep going</p>
        </div>
      </div>
    );
  }

  // ============ STEP 2: SEARCH RESULT / LISTING FOUND ============
  if (currentStep === STEPS.RESULT && selectedVenue) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 p-4">
        <div className="max-w-lg mx-auto py-8">
          <div className="flex justify-center gap-1 mb-8">
            {[...Array(3)].map((_, i) => (
              <div key={i} className={`h-1.5 w-6 rounded-full ${i <= 1 ? 'bg-amber-500' : 'bg-slate-600'}`} />
            ))}
          </div>

          <button onClick={() => setCurrentStep(STEPS.SEARCH)} className="flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors">
            <ChevronLeft className="w-4 h-4" /> Back
          </button>

          <div className="space-y-4">
            <div className={`p-4 rounded-xl border ${venueAlreadyClaimed ? 'border-orange-500/30 bg-orange-500/10' : 'border-green-500/30 bg-green-500/10'}`}>
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className={`w-5 h-5 ${venueAlreadyClaimed ? 'text-orange-400' : 'text-green-500'}`} />
                <span className={`font-semibold text-sm ${venueAlreadyClaimed ? 'text-orange-400' : 'text-green-400'}`}>
                  {venueAlreadyClaimed ? 'This listing is already claimed' : 'Listing found!'}
                </span>
              </div>
              <div className="text-white font-semibold">{selectedVenue.name}</div>
              <div className="text-slate-400 text-sm flex items-center gap-1 mt-1">
                <MapPin className="w-3 h-3" /> {selectedVenue.address}
              </div>
              {venueAlreadyClaimed && (
                <p className="text-orange-300 text-xs mt-2">Someone else has already claimed this venue. If you believe this is incorrect, you can submit an ownership challenge and our team will investigate.</p>
              )}
              <p className="text-xs text-slate-400 mt-2">Not the right one? <button onClick={() => setCurrentStep(STEPS.SEARCH)} className="text-amber-400 hover:text-amber-300">Search again</button></p>
            </div>

            <Button
              onClick={() => setCurrentStep(STEPS.REGISTER)}
              className={`w-full font-semibold py-2 rounded-lg text-white ${venueAlreadyClaimed ? 'bg-orange-500 hover:bg-orange-600' : 'bg-amber-500 hover:bg-amber-600'}`}
            >
              {venueAlreadyClaimed ? 'Challenge This Claim →' : 'Continue with This Listing →'}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ============ STEP 3: BENEFITS ============
  if (currentStep === STEPS.BENEFITS) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 p-4">
        <div className="max-w-lg mx-auto py-8">
          <div className="flex justify-center gap-1 mb-8">
            {[...Array(3)].map((_, i) => (
              <div key={i} className={`h-1.5 w-6 rounded-full ${i <= 2 ? 'bg-amber-500' : 'bg-slate-600'}`} />
            ))}
          </div>

          <button onClick={() => setCurrentStep(selectedVenue ? STEPS.RESULT : STEPS.SEARCH)} className="flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors">
            <ChevronLeft className="w-4 h-4" /> Back
          </button>

          <div className="text-center mb-8">
            <div className="text-4xl mb-4">🏢</div>
            <h2 className="text-2xl font-heading font-bold text-white mb-2">Reach the people already looking for you.</h2>
            <p className="text-slate-400">7,000+ locals use Happy Hour Flower to find exactly what you offer. List your specials in minutes.</p>
          </div>

          {/* Free Tier breakdown */}
          <div className="bg-slate-800 border border-amber-500/30 rounded-xl p-4 mb-1">
            <p className="text-amber-400 font-semibold text-sm mb-3 flex items-center gap-1.5">🆓 Free Tier — What's Included</p>
            <ul className="space-y-1.5 text-sm text-slate-300">
              <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" /> One active happy hour listing</li>
              <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" /> Basic venue info: name, address, hours, contact</li>
              <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" /> Upload up to 1 photo</li>
              <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" /> Standard map placement</li>
              <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" /> Special description up to 200 characters</li>
              <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" /> Monthly listing updates</li>
              <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" /> Basic engagement metrics: views &amp; saves</li>
              <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" /> Email support (48-hour response)</li>
            </ul>
          </div>

          <Button
            onClick={() => setCurrentStep(STEPS.HOW_IT_WORKS)}
            className="w-full mt-6 bg-amber-500 hover:bg-amber-600 text-white font-semibold py-2 rounded-lg"
          >
            Get My Venue Listed →
          </Button>
        </div>
      </div>
    );
  }

  // ============ STEP 4: HOW IT WORKS ============
  if (currentStep === STEPS.HOW_IT_WORKS) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 p-4">
        <div className="max-w-lg mx-auto py-8">
          <div className="flex justify-center gap-1 mb-8">
            {[...Array(3)].map((_, i) => (
              <div key={i} className={`h-1.5 w-6 rounded-full ${i <= 3 ? 'bg-amber-500' : 'bg-slate-600'}`} />
            ))}
          </div>

          <button onClick={() => setCurrentStep(STEPS.BENEFITS)} className="flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors">
            <ChevronLeft className="w-4 h-4" /> Back
          </button>

          <div>
            <h2 className="text-2xl font-heading font-bold text-white mb-6">Here's how it works.</h2>
            <p className="text-slate-400 text-sm mb-6">Simple setup. Ongoing value.</p>

            <div className="space-y-4">
              {[
                { num: '1', icon: '📝', title: 'Create your listing', desc: 'Add your venue name, address, and a photo. Takes 2 minutes.' },
                { num: '2', icon: '🕐', title: 'Add your happy hours', desc: 'List each special separately — multiple time windows per day supported.' },
                { num: '3', icon: '✓', title: 'We review & publish', desc: "Our team approves within 24 hours. You're live to 7,000+ locals." },
                { num: '4', icon: '📈', title: 'Track your reach', desc: 'See views and taps in your dashboard. Update specials anytime.' },
              ].map((step) => (
                <div key={step.num} className="p-4 rounded-lg bg-slate-800 border border-slate-600 flex gap-4">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-amber-500 text-white font-bold flex-shrink-0">
                    {step.num}
                  </div>
                  <div>
                    <div className="font-semibold text-white">{step.title}</div>
                    <div className="text-sm text-slate-400 mt-1">{step.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Button
            onClick={() => setCurrentStep(STEPS.SOCIAL_PROOF)}
            className="w-full mt-8 bg-amber-500 hover:bg-amber-600 text-white font-semibold py-2 rounded-lg"
          >
            Got It — Next →
          </Button>
        </div>
      </div>
    );
  }

  // ============ STEP 5: SOCIAL PROOF ============
  if (currentStep === STEPS.SOCIAL_PROOF) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 p-4">
        <div className="max-w-lg mx-auto py-8">
          <div className="flex justify-center gap-1 mb-8">
            {[...Array(3)].map((_, i) => (
              <div key={i} className={`h-1.5 w-6 rounded-full ${i <= 4 ? 'bg-amber-500' : 'bg-slate-600'}`} />
            ))}
          </div>

          <button onClick={() => setCurrentStep(STEPS.HOW_IT_WORKS)} className="flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors">
            <ChevronLeft className="w-4 h-4" /> Back
          </button>

          <div className="text-center">
            <h2 className="text-2xl font-heading font-bold text-white mb-6">Venues love us.</h2>

            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="p-4 rounded-lg bg-slate-800 border border-slate-600 text-center">
                <div className="text-3xl font-bold text-amber-400">7,000+</div>
                <div className="text-xs text-slate-400 mt-1">potential customers</div>
              </div>
              <div className="p-4 rounded-lg bg-slate-800 border border-slate-600 text-center">
                <div className="text-3xl font-bold text-orange-400">50+</div>
                <div className="text-xs text-slate-400 mt-1">venues already listed</div>
              </div>
              <div className="p-4 rounded-lg bg-slate-800 border border-slate-600 text-center">
                <div className="text-3xl font-bold text-green-400">10,000</div>
                <div className="text-xs text-slate-400 mt-1">print mag copies</div>
              </div>
              <div className="p-4 rounded-lg bg-slate-800 border border-slate-600 text-center">
                <div className="text-3xl font-bold text-slate-400">$0</div>
                <div className="text-xs text-slate-400 mt-1">to get started</div>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-slate-800 border border-slate-600 mb-6">
              <div className="flex justify-center gap-0.5 mb-2">
                {[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />)}
              </div>
              <p className="text-slate-300 text-sm italic">"We saw a measurable uptick in foot traffic on Tuesday nights within two weeks of listing. The app brings people who actually want happy hour — not random walk-ins."</p>
              <p className="text-slate-400 text-xs mt-2">— Venue owner, Downtown Greenville</p>
            </div>
          </div>

          <Button
            onClick={() => setCurrentStep(STEPS.REGISTER)}
            className="w-full bg-amber-500 hover:bg-amber-600 text-white font-semibold py-2 rounded-lg"
          >
            Next →
          </Button>
        </div>
      </div>
    );
  }

  // ============ STEP 6: REGISTER ============
  if (currentStep === STEPS.REGISTER) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 p-4">
        <div className="max-w-lg mx-auto py-8">
          <button onClick={() => setCurrentStep(STEPS.SEARCH)} className="flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors">
            <ChevronLeft className="w-4 h-4" /> Back
          </button>

          {selectedVenue && (
            <div className={`border rounded-lg p-4 mb-6 ${venueAlreadyClaimed ? 'bg-orange-500/10 border-orange-500/30' : 'bg-green-500/10 border-green-500/30'}`}>
              <div className="flex items-center gap-2 mb-1">
                {venueAlreadyClaimed
                  ? <AlertTriangle className="w-5 h-5 text-orange-400" />
                  : <CheckCircle2 className="w-5 h-5 text-green-500" />}
                <span className={`text-sm font-semibold ${venueAlreadyClaimed ? 'text-orange-400' : 'text-green-400'}`}>
                  {venueAlreadyClaimed ? `Already claimed: ${selectedVenue?.name}` : `Listing found: ${selectedVenue?.name}`}
                </span>
              </div>
              <p className="text-slate-400 text-xs ml-7">
                {venueAlreadyClaimed
                  ? 'Fill in your details and explain why you believe you are the rightful owner.'
                  : 'Complete the form below to claim ownership.'}
              </p>
            </div>
          )}

          <div className="text-center mb-6">
            <h2 className="text-2xl font-heading font-bold text-white mb-2">
              {venueAlreadyClaimed ? 'Challenge This Claim' : selectedVenue ? 'Claim Your Venue' : 'List Your Venue'}
            </h2>
            <p className="text-slate-400 text-sm">
              {venueAlreadyClaimed
                ? 'Our team will investigate and respond within 1–2 business days'
                : selectedVenue
                  ? 'Free to claim • 5 minutes to setup • Reach 7,000+ locals'
                  : 'Free to list • 5 minutes to setup • Reach 7,000+ locals'}
            </p>
          </div>

          <form onSubmit={handleRegisterSubmit} className="space-y-4">
            <div>
              <Label className="text-slate-300 text-sm">BUSINESS NAME</Label>
              <Input
                value={formData.business_name}
                onChange={(e) => setFormData(prev => ({ ...prev, business_name: e.target.value }))}
                className="bg-slate-700 border-slate-600 text-white mt-1"
                required
              />
            </div>

            <div>
              <Label className="text-slate-300 text-sm">BUSINESS EMAIL</Label>
              <Input
                type="email"
                placeholder="owner@myvenue.com"
                value={formData.business_email}
                onChange={(e) => setFormData(prev => ({ ...prev, business_email: e.target.value }))}
                className="bg-slate-700 border-slate-600 text-white mt-1"
              />
            </div>

            <div>
              <Label className="text-slate-300 text-sm">PHONE NUMBER</Label>
              <Input
                type="tel"
                placeholder="(864) 555-0100"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                className="bg-slate-700 border-slate-600 text-white mt-1"
              />
            </div>

            {venueAlreadyClaimed && (
              <div>
                <Label className="text-slate-300 text-sm">WHY ARE YOU THE RIGHTFUL OWNER? *</Label>
                <Textarea
                  value={challengeDetails}
                  onChange={(e) => setChallengeDetails(e.target.value)}
                  className="bg-slate-700 border-slate-600 text-white mt-1"
                  rows={3}
                  placeholder="Explain your relationship to this venue and why you believe the current claim is incorrect..."
                  required={venueAlreadyClaimed}
                />
              </div>
            )}

            <Button
              type="submit"
              disabled={submitting}
              className={`w-full text-white font-semibold py-2 rounded-lg ${venueAlreadyClaimed ? 'bg-orange-500 hover:bg-orange-600' : 'bg-amber-500 hover:bg-amber-600'}`}
            >
              {submitting ? 'Submitting...' : venueAlreadyClaimed ? 'Submit Ownership Challenge' : 'Create Business Account'}
            </Button>
          </form>
        </div>
      </div>
    );
  }

  // ============ STEP 7: LOCATION (new venues only) ============
  if (currentStep === STEPS.LOCATION) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 p-4">
        <div className="max-w-lg mx-auto py-8">
          <button onClick={() => setCurrentStep(STEPS.REGISTER)} className="flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors">
            <ChevronLeft className="w-4 h-4" /> Back
          </button>

          <div className="text-center mb-6">
            <div className="text-3xl mb-3">📍</div>
            <h2 className="text-2xl font-heading font-bold text-white mb-2">Where is your venue located?</h2>
            <p className="text-slate-400 text-sm">
              Help locals find you. Choose your state, market, and ZIP.
            </p>
          </div>

          <form onSubmit={handleLocationSubmit} className="bg-slate-800/60 border border-slate-700 rounded-2xl p-6 space-y-5">
            <CascadingLocationPicker
              value={location}
              onChange={setLocation}
              labelClassName="text-slate-300 text-sm mb-1.5 block"
              selectClassName="bg-slate-700 border border-slate-600 text-white placeholder:text-slate-500 focus:ring-amber-500/70"
            />

            <Button
              type="submit"
              disabled={submitting || !location.state_id || !location.market_id || !location.zip_code}
              className="w-full bg-amber-500 hover:bg-amber-600 text-white font-semibold py-2 rounded-lg"
            >
              {submitting ? 'Creating...' : 'Continue to Setup →'}
            </Button>
          </form>
        </div>
      </div>
    );
  }
}