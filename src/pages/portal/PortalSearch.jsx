import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, MapPin, Building2, PlusCircle, ArrowRight, Loader2, Eye } from 'lucide-react';
import VenuePreviewDialog from '@/components/portal/VenuePreviewDialog';

export default function PortalSearch() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [results, setResults] = useState(null); // null = not searched yet, [] = searched no matches
  const [searching, setSearching] = useState(false);
  const [preview, setPreview] = useState(null);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!name.trim() && !address.trim()) return;
    setSearching(true);
    try {
      // RLS on Venue only exposes status:'active' records to the public.
      const venues = await base44.entities.Venue.filter({ status: 'active' }, '-name', 500).catch(() => []);
      const nq = name.trim().toLowerCase();
      const aq = address.trim().toLowerCase();
      const matched = venues.filter(v => {
        const nameHit = !nq || (v.name || '').toLowerCase().includes(nq);
        const addrHit = !aq || `${v.address || ''} ${v.city || ''}`.toLowerCase().includes(aq);
        return nameHit && addrHit;
      });
      setResults(matched);
    } finally {
      setSearching(false);
    }
  };

  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-b from-amber-50 to-[#faf7f2] border-b border-amber-100">
        <div className="max-w-3xl mx-auto px-6 pt-14 pb-6 text-center">
          <div className="inline-flex items-center gap-2 sm:gap-3 bg-amber-100 text-amber-800 text-lg sm:text-3xl font-bold leading-tight px-4 sm:px-6 py-2 sm:py-3 rounded-full mb-6">
            <Building2 className="w-5 h-5 sm:w-8 sm:h-8 flex-shrink-0" /> For venue owners &amp; managers
          </div>
          <div className="flex items-center justify-center gap-4 sm:gap-6">
            <img
              src="https://media.base44.com/images/public/6a1f45eb9cf7513caebbab49/3780e4cab_Happy20Hour20Flower20Logo2051220x2051220px.png"
              alt="Happy Hour Flower logo"
              className="w-20 h-20 sm:w-28 sm:h-28 flex-shrink-0"
            />
            <h1 className="font-heading text-3xl sm:text-5xl font-bold text-amber-900 leading-tight text-left">
              Claim your venue on<br />Happy Hour Flower
            </h1>
          </div>
          <p className="text-amber-900/70 mt-4 text-lg max-w-xl mx-auto">
            Search for your business below to claim your listing and manage your happy hour deals — or add it if it's not here yet.
          </p>
          <p className="mt-6 inline-block bg-gradient-to-r from-pink-600 to-orange-500 text-white font-extrabold px-6 py-3 rounded-full text-lg sm:text-xl shadow-lg">
            Free to claim. Takes about 5 minutes.
          </p>
          <img
            src="https://media.base44.com/images/public/6a1f45eb9cf7513caebbab49/7db7e3915_IMG_5166.jpg"
            alt="Free forever, Greenville skyline at Falls Park"
            className="mt-6 w-full max-w-2xl mx-auto rounded-2xl shadow-md"
          />
          <p className="mt-5 text-2xl sm:text-4xl font-extrabold text-pink-600">
            Over 1,000 Upstate venues already listed
          </p>
        </div>
      </section>

      {/* Search */}
      <section className="max-w-2xl mx-auto px-6 pt-6 pb-10">
        <form onSubmit={handleSearch} className="bg-white border border-amber-100 rounded-2xl shadow-sm p-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-amber-900 mb-1.5">Business name</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-400" />
              <Input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Bohemian Cafe"
                className="pl-9 h-11"
                autoFocus
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-amber-900 mb-1.5">Address or city <span className="font-normal text-amber-900/50">(optional)</span></label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-400" />
              <Input
                value={address}
                onChange={e => setAddress(e.target.value)}
                placeholder="e.g. Main Street, Greenville"
                className="pl-9 h-11"
              />
            </div>
          </div>
          <Button
            type="submit"
            disabled={searching || (!name.trim() && !address.trim())}
            className="w-full h-11 bg-amber-500 hover:bg-amber-600 text-white font-semibold"
          >
            {searching ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Searching…</> : <><Search className="w-4 h-4 mr-2" /> Search venues</>}
          </Button>
        </form>

        {/* Results */}
        {results !== null && (
          <div className="mt-8">
            {results.length > 0 ? (
              <>
                <p className="text-sm text-amber-900/70 mb-3 font-medium">{results.length} {results.length === 1 ? 'match' : 'matches'} found — select yours to claim it:</p>
                <div className="space-y-2.5">
                  {results.map(venue => (
                    <div
                      key={venue.id}
                      className="w-full text-left bg-white border border-amber-100 hover:border-amber-400 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 transition-colors group shadow-sm"
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
                          <Building2 className="w-5 h-5 text-amber-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-amber-900 truncate group-hover:text-amber-700">{venue.name}</p>
                          {(venue.address || venue.city) && (
                            <p className="text-xs text-amber-900/60 flex items-center gap-1 mt-0.5 truncate">
                              <MapPin className="w-3 h-3 flex-shrink-0" /> {[venue.address, venue.city].filter(Boolean).join(', ')}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Button variant="outline" onClick={() => setPreview(venue)} className="border-amber-300 text-amber-700 hover:bg-amber-50 font-semibold">
                          <Eye className="w-4 h-4" /> Preview
                        </Button>
                        <Button onClick={() => navigate(`/portal/claim/${venue.id}`)} className="bg-amber-500 hover:bg-amber-600 text-white font-semibold">
                          Claim <ArrowRight className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="bg-white border border-amber-100 rounded-2xl p-8 text-center shadow-sm">
                <p className="text-amber-900 font-semibold">No matching venues found</p>
                <p className="text-sm text-amber-900/60 mt-1">Your business may not be listed yet. Add it and we'll get it set up.</p>
              </div>
            )}

            {/* Add-a-business path — always offered below results */}
            <div className="mt-6 text-center">
              <p className="text-sm text-amber-900/60 mb-2">Don't see your business?</p>
              <Button
                onClick={() => navigate('/portal/add')}
                variant="outline"
                className="border-amber-300 text-amber-700 hover:bg-amber-50 font-semibold"
              >
                <PlusCircle className="w-4 h-4 mr-2" /> Add my business
              </Button>
            </div>
          </div>
        )}
      </section>
      <VenuePreviewDialog venue={preview} onClose={() => setPreview(null)} />
    </div>
  );
}