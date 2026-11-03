import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { resolveQr } from '@/functions/resolveQr';
import { trackEvent, trackEventAndWait } from '@/lib/analytics';
import { getSessionId, storeTouch, userAgentCategory, referrerType } from '@/lib/attributionClient';
import QrInvalid from '@/components/qr/QrInvalid';

// Public /q/:shortCode — record scan, store attribution, redirect immediately.
export default function QrRedirect() {
  const { shortCode } = useParams();
  const [invalid, setInvalid] = useState(false);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    const code = String(shortCode || '').trim().toUpperCase();
    if (!/^[A-Z0-9]{4,12}$/.test(code)) {
      trackEvent('qr_invalid', { short_code: code.slice(0, 12), reason: 'malformed' });
      setInvalid(true);
      return;
    }
    resolveQr({ short_code: code, session_id: getSessionId(), user_agent_category: userAgentCategory(), referrer_type: referrerType() })
      .then(({ data }) => {
        if (!data?.ok || !data.destination?.startsWith('/') || data.destination.startsWith('//')) {
          trackEvent('qr_invalid', { short_code: code, reason: data?.reason || 'unknown' });
          setInvalid(true);
          return;
        }
        storeTouch(data.attribution);
        const { touched_at, ...props } = data.attribution;
        trackEventAndWait('qr_code_opened', props).finally(() => window.location.replace(data.destination));
      })
      .catch(() => {
        trackEvent('qr_invalid', { short_code: code, reason: 'error' });
        setInvalid(true);
      });
  }, [shortCode]);

  if (invalid) return <QrInvalid />;
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-background">
      <div className="w-8 h-8 border-4 border-amber-200 border-t-amber-500 rounded-full animate-spin" />
    </div>
  );
}