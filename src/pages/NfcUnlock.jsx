import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { proximityEvent } from '@/functions/proximityEvent';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, Ticket, MapPin, XCircle, Nfc } from 'lucide-react';
import { trackArrival } from '@/lib/attributionClient';
import currentCoords from '@/lib/currentCoords';

// Consumer-facing NFC tap-to-unlock landing page. A physical NFC tag is written with a deep
// link to /nfc?beacon=<uid>; tapping it opens this page, which fires the real proximityEvent
// beacon engine and surfaces the linked coupon (or a welcome) for the signed-in user.
export default function NfcUnlock() {
  const navigate = useNavigate();
  const [status, setStatus] = useState('loading'); // loading | success | empty | error
  const [result, setResult] = useState(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const beaconUid = (params.get('beacon') || '').trim();

    if (!beaconUid) {
      setStatus('error');
      setMessage('This tag is missing its beacon code. Ask the venue to re-write the NFC tag.');
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const coords = await currentCoords();
        const res = await proximityEvent({ event_type: 'beacon_detected', beacon_uid: beaconUid, ...coords });
        if (cancelled) return;
        const data = res?.data;
        if (data?.success) trackArrival(data.venue_id, 'beacon');
        if (data?.success && data.action === 'coupon_surfaced') {
          setResult(data);
          setStatus('success');
        } else if (data?.success) {
          setStatus('empty');
          setMessage(data.reason || "You're checked in here, but there's no offer on this tag right now.");
        } else {
          setStatus('error');
          setMessage(data?.error || 'We couldn’t unlock an offer from this tag.');
        }
      } catch (err) {
        if (cancelled) return;
        setStatus('error');
        setMessage(err?.response?.data?.error || 'We couldn’t unlock an offer from this tag.');
      }
    })();

    return () => { cancelled = true; };
  }, []);

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-6">
      <div className="w-full max-w-sm bg-card border border-border rounded-2xl p-8 text-center shadow-sm">
        {status === 'loading' && (
          <>
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Nfc className="w-7 h-7 text-primary" />
            </div>
            <h1 className="text-lg font-heading font-bold">Reading tag…</h1>
            <p className="text-sm text-muted-foreground mt-1">Unlocking your offer.</p>
            <Loader2 className="w-5 h-5 text-primary animate-spin mx-auto mt-5" />
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-7 h-7 text-emerald-500" />
            </div>
            <h1 className="text-lg font-heading font-bold">Offer unlocked!</h1>
            {result?.discount_value && (
              <p className="text-2xl font-bold text-primary mt-2">{result.discount_value}</p>
            )}
            {result?.description && (
              <p className="text-sm text-muted-foreground mt-1">{result.description}</p>
            )}
            <Button
              className="w-full mt-6 gap-2"
              onClick={() => navigate(result?.pass_instance_id ? `/wallet-pass/${result.pass_instance_id}` : '/profile')}
            >
              <Ticket className="w-4 h-4" /> View my coupon
            </Button>
          </>
        )}

        {status === 'empty' && (
          <>
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <MapPin className="w-7 h-7 text-primary" />
            </div>
            <h1 className="text-lg font-heading font-bold">You're here!</h1>
            <p className="text-sm text-muted-foreground mt-1">{message}</p>
            <Button variant="outline" className="w-full mt-6" onClick={() => navigate('/explore')}>
              Explore venues
            </Button>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-14 h-14 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-7 h-7 text-destructive" />
            </div>
            <h1 className="text-lg font-heading font-bold">Couldn't unlock</h1>
            <p className="text-sm text-muted-foreground mt-1">{message}</p>
            <Button variant="outline" className="w-full mt-6" onClick={() => navigate('/explore')}>
              Back to Explore
            </Button>
          </>
        )}
      </div>
    </div>
  );
}