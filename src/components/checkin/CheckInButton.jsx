import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { MapPin, Check, Loader2, Users } from 'lucide-react';

export default function CheckInButton({ venue }) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState('');
  const [shareWithCrew, setShareWithCrew] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [checkedIn, setCheckedIn] = useState(false);

  // Has this user already checked in here recently (last 4 hours)? Also load premium status.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const authed = await base44.auth.isAuthenticated();
      if (!authed) return;
      const me = await base44.auth.me();
      const mine = await base44.entities.CheckIn.filter(
        { created_by_id: me.id, venue_id: venue.id }, '-checked_in_at', 1
      ).catch(() => []);
      const last = mine[0];
      if (last?.checked_in_at) {
        const hoursAgo = (Date.now() - new Date(last.checked_in_at).getTime()) / 3600000;
        if (!cancelled && hoursAgo < 4) setCheckedIn(true);
      }
      // Crew sharing is a premium-only feature
      const profiles = await base44.entities.Profile.filter({ created_by_id: me.id }).catch(() => []);
      const p = profiles[0];
      const premium = !!(p?.is_premium || p?.subscription_status === 'active');
      if (!cancelled) {
        setIsPremium(premium);
        setShareWithCrew(premium);
      }
    })();
    return () => { cancelled = true; };
  }, [venue.id]);

  const handleCheckIn = async () => {
    const authed = await base44.auth.isAuthenticated();
    if (!authed) { base44.auth.redirectToLogin(); return; }

    // Optimistically reflect the check-in instantly, then persist in the background.
    const noteText = note.trim();
    const wasShared = shareWithCrew && isPremium;
    setCheckedIn(true);
    setOpen(false);
    setNote('');
    setSubmitting(true);
    try {
      const me = await base44.auth.me();
      await base44.entities.CheckIn.create({
        user_id: me.id,
        user_name: me.full_name || me.email,
        venue_id: venue.id,
        venue_name: venue.name,
        note: noteText || undefined,
        shared_with_crew: wasShared,
        checked_in_at: new Date().toISOString(),
      });
      // Crew notifications are sent server-side when a shared check-in is saved.
    } catch {
      // Roll back the optimistic state if the check-in failed to persist.
      setCheckedIn(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        className="w-full"
        variant={checkedIn ? 'outline' : 'default'}
      >
        {checkedIn ? (
          <><Check className="w-4 h-4 mr-2 text-green-600" /> Checked In — Check in again</>
        ) : (
          <><MapPin className="w-4 h-4 mr-2" /> Check In Here</>
        )}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary" /> Check in at {venue.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <Textarea
              placeholder={isPremium ? "Add a note for your crew (optional)…" : "Add a note (optional)…"}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
            />
            {isPremium && (
              <div className="flex items-center justify-between bg-muted/40 rounded-xl p-3">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" />
                  <div>
                    <p className="text-sm font-medium">Share with my crew</p>
                    <p className="text-xs text-muted-foreground">Let your crew know you're here</p>
                  </div>
                </div>
                <Switch checked={shareWithCrew} onCheckedChange={setShareWithCrew} />
              </div>
            )}
            <Button onClick={handleCheckIn} disabled={submitting} className="w-full">
              {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Checking in…</> : 'Confirm Check In'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}