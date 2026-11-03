import { useState, useEffect } from 'react';
import isTestEnv from '@/lib/isTestEnv';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Crown, X } from 'lucide-react';
import { getConsumerAd } from '@/functions/getConsumerAd';
import { trackAdEvent } from '@/functions/trackAdEvent';
import safeUrl from '@/lib/safeUrl';

const SESSION_KEY = 'hhf_ad_shown';

// Shows ONE random ad to a free consumer, once per browser session.
// Includes an "upgrade to remove ads" call to action.
export default function ConsumerAdOverlay({ user }) {
  const navigate = useNavigate();
  const [ad, setAd] = useState(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!user || isTestEnv()) return;
    // Only once per session
    if (sessionStorage.getItem(SESSION_KEY)) return;

    getConsumerAd()
      .then((res) => {
        const found = res?.data?.ad;
        if (found) {
          setAd(found);
          setOpen(true);
          sessionStorage.setItem(SESSION_KEY, '1');
          trackAdEvent({ ad_campaign_id: found.id, event_type: 'impression', ad_type: found.type }).catch(() => {});
        }
      })
      .catch(() => {});
  }, [user]);

  const handleAdClick = () => {
    if (!ad) return;
    trackAdEvent({ ad_campaign_id: ad.id, event_type: 'click', ad_type: ad.type }).catch(() => {});
    if (ad.click_url) {
      if (safeUrl(ad.click_url)) window.open(safeUrl(ad.click_url), '_blank', 'noopener');
    } else if (ad.venue_id) {
      setOpen(false);
      navigate(`/venue/${ad.venue_id}`);
    }
  };

  if (!ad) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-[192px] p-0 overflow-hidden gap-0">
        <button
          onClick={handleAdClick}
          className="block w-full text-left"
          aria-label={`Ad: ${ad.title || ad.venue_name}`}
        >
          <img
            src={ad.image_url}
            alt={ad.title || ad.venue_name || 'Advertisement'}
            className="w-full h-auto object-cover"
          />
          {(ad.title || ad.venue_name) && (
            <div className="p-2">
              {ad.venue_name && <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{ad.venue_name}</p>}
              {ad.title && <p className="font-heading font-bold text-xs text-foreground mt-0.5">{ad.title}</p>}
            </div>
          )}
        </button>

        <div className="px-2 pb-2 pt-1 space-y-1.5 border-t border-border">
          <p className="text-[9px] text-muted-foreground text-center">Sponsored</p>
          <Button
            size="sm"
            onClick={() => {
              // Load the plans page first and let the ad finish closing, so the
              // overlay isn't torn down mid-animation (which left a blank screen).
              setOpen(false);
              import('@/pages/ConsumerPlans').finally(() => {
                setTimeout(() => {
                  document.body.style.pointerEvents = '';
                  navigate('/plans/consumer');
                }, 250);
              });
            }}
            className="w-full gap-1.5 text-[11px] h-8 px-2"
          >
            <Crown className="w-3 h-3" />
            Upgrade to remove ads
          </Button>
          <button
            onClick={() => setOpen(false)}
            className="w-full text-[10px] text-muted-foreground hover:text-foreground transition-colors py-0.5"
          >
            <X className="w-3 h-3 inline mr-1" />
            Continue with ads
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}