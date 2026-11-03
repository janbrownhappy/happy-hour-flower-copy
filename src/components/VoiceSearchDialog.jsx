import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Mic, Loader2, X, Search } from 'lucide-react';
import { ALL_AMENITIES } from '@/lib/amenities';
import { parseVoiceSearch } from '@/functions/parseVoiceSearch';

// Compact reference list the LLM maps spoken features onto: "slug — Label"
const AMENITY_REF = ALL_AMENITIES.map(a => `${a.slug} — ${a.label}`).join('; ');
const AMENITY_SLUGS = new Set(ALL_AMENITIES.map(a => a.slug));

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const NEIGHBORHOODS = [
  'GVL-01 Downtown / Main Street', 'GVL-02 West End', 'GVL-03 Village of West Greenville',
  'GVL-04 Augusta Road Corridor', 'GVL-05 Haynie-Sirrine / Fluor Field', 'GVL-06 Hampton Station / Sans Souci',
  'MAU-01 BridgeWay Station', 'MAU-02 Mauldin Main / E. Butler Rd', 'SIM-01 Downtown Simpsonville',
  'SIM-02 Five Forks', 'SIM-03 Fairview Road', 'FTN-01 Downtown Fountain Inn',
];

// Resolve the user's current position. Returns null if unavailable/denied so the
// search still proceeds (just without the radius filter).
function getCurrentCoords() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { timeout: 6000, maximumAge: 60000 }
    );
  });
}

export default function VoiceSearchDialog({ open, onClose }) {
  const navigate = useNavigate();
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const recognitionRef = useRef(null);
  const silenceTimerRef = useRef(null);
  const processedRef = useRef(false);

  const supported = typeof window !== 'undefined' &&
    (window.SpeechRecognition || window.webkitSpeechRecognition);

  const startListening = () => {
    setError('');
    setTranscript('');
    processedRef.current = false;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (e) => {
      const text = Array.from(e.results).map(r => r[0].transcript).join('');
      setTranscript(text);
    };
    recognition.onerror = (e) => {
      clearTimeout(silenceTimerRef.current);
      if (e.error === 'no-speech') {
        setError("Didn't catch that — tap the mic and try again.");
      } else if (e.error === 'not-allowed') {
        setError('Microphone access was blocked. Please allow it and try again.');
      } else {
        setError('Could not hear you — try again.');
      }
      setListening(false);
    };
    recognition.onend = () => {
      clearTimeout(silenceTimerRef.current);
      setListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);

    // Watchdog: if nothing comes back within 12s, stop so the UI never hangs
    clearTimeout(silenceTimerRef.current);
    silenceTimerRef.current = setTimeout(() => {
      try { recognition.stop(); } catch { /* noop */ }
    }, 12000);
  };

  const stopListening = () => {
    clearTimeout(silenceTimerRef.current);
    try { recognitionRef.current?.stop(); } catch { /* noop */ }
    setListening(false);
  };

  // Clean up the watchdog on unmount
  useEffect(() => () => clearTimeout(silenceTimerRef.current), []);

  // When listening stops and we have a transcript, process it — but only once per session
  useEffect(() => {
    if (!listening && transcript.trim() && open && !processedRef.current) {
      processedRef.current = true;
      handleProcess(transcript.trim());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listening]);

  const handleProcess = async (text) => {
    setProcessing(true);
    setError('');
    try {
      const today = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date().getDay()];
      const llmCall = parseVoiceSearch({ text, today }).then((r) => r.data);

      // Race the AI call against an 8s timeout so the UI never gets stuck spinning.
      // On timeout, fall back to using the raw transcript as a keyword search.
      const result = await Promise.race([
        llmCall,
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 8000)),
      ]).catch(() => ({ search: text }));

      const params = new URLSearchParams();
      // Location first: an explicit neighborhood wins; otherwise "near me" sets a radius
      // around the user's current position. Either dramatically narrows the venue set
      // before keyword/amenity matching runs on the Explore page.
      if (result.neighborhood && NEIGHBORHOODS.includes(result.neighborhood)) {
        params.set('hood', result.neighborhood);
      } else if (result.near_me) {
        const coords = await getCurrentCoords();
        if (coords) {
          params.set('near', `${coords.lat},${coords.lng}`);
        }
      }
      // Each recognized feature becomes its own amenity filter on Explore
      const amenitySlugs = Array.isArray(result.amenities)
        ? [...new Set(result.amenities.filter(s => AMENITY_SLUGS.has(s)))]
        : [];
      if (amenitySlugs.length > 0) params.set('amenities', amenitySlugs.join(','));
      if (result.search) params.set('q', result.search);
      if (result.day && DAYS.includes(result.day)) params.set('day', result.day);
      if (result.price && result.price >= 1 && result.price <= 4) params.set('price', String(result.price));

      onClose();
      navigate(`/explore?${params.toString()}`);
    } catch {
      setError('Sorry, something went wrong. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const handleClose = () => {
    stopListening();
    processedRef.current = false;
    setTranscript('');
    setError('');
    setProcessing(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-sm rounded-2xl text-center p-8">
        <button onClick={handleClose} className="absolute right-4 top-4 text-muted-foreground hover:text-foreground">
          <X className="w-5 h-5" />
        </button>

        {!supported ? (
          <div className="py-6">
            <p className="font-heading text-lg font-bold mb-2">Voice search not supported</p>
            <p className="text-sm text-muted-foreground">Your browser doesn't support voice input. Try Chrome or Safari.</p>
          </div>
        ) : (
          <>
            <h2 className="font-heading text-lg font-bold mb-1">Speak to find happy hours</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Try "Cheap tacos downtown on Friday" or "Breweries near West End tonight"
            </p>

            <button
              onClick={listening ? stopListening : startListening}
              disabled={processing}
              className={`w-24 h-24 rounded-full mx-auto flex items-center justify-center transition-all shadow-lg ${
                listening
                  ? 'bg-red-500 animate-pulse shadow-red-500/40'
                  : 'bg-gradient-to-br from-amber-500 to-orange-500 hover:scale-105 shadow-amber-500/40'
              } disabled:opacity-60`}
            >
              {processing ? (
                <Loader2 className="w-10 h-10 text-white animate-spin" />
              ) : (
                <Mic className="w-10 h-10 text-white" />
              )}
            </button>

            <p className="text-sm font-medium mt-5 min-h-[1.25rem]">
              {processing ? 'Finding your happy hours…' : listening ? 'Listening…' : 'Tap to start'}
            </p>

            {transcript && (
              <div className="mt-4 p-3 bg-secondary rounded-xl flex items-start gap-2 text-left">
                <Search className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                <p className="text-sm text-foreground">{transcript}</p>
              </div>
            )}

            {error && <p className="text-sm text-destructive mt-4">{error}</p>}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}