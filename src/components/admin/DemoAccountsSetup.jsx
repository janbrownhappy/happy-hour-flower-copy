import { useState } from 'react';
import { setupDemoAccounts } from '@/functions/setupDemoAccounts';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, UserCheck, Copy, Check, AlertTriangle, Store, User } from 'lucide-react';
import { toast } from 'sonner';

const CONSUMER_EMAIL = 'jan.brown+user@happyhourflower.com';
const VENUE_EMAIL = 'jan.brown+venue@happyhourflower.com';
const DEMO_PASSWORD = 'HHFlower-Review-2026!';

const REVIEWER_NOTES = `App Review Test Accounts — Happy Hour Flower

CONSUMER ACCOUNT (browse deals, favorites, premium filters)
  Email:    ${CONSUMER_EMAIL}
  Password: ${DEMO_PASSWORD}
  Notes: Pre-configured with a complete profile and Premium access so all
  consumer features (advanced filters, custom lists, neighborhood deals)
  are testable without a subscription purchase.

VENUE OWNER ACCOUNT (owner dashboard, deals, wallet passes, analytics)
  Email:    ${VENUE_EMAIL}
  Password: ${DEMO_PASSWORD}
  Notes: Owns a demo venue ("Demo Tap House (Review)") with hours, deals
  and photos already filled in. Platinum tier is enabled so all owner
  features are available.

HOW TO TEST
  • Consumer: log in with the consumer account → Explore tab shows nearby
    happy hour deals; tap a venue to view details, save favorites.
  • Venue Owner: log in with the venue owner account → you land on the
    Venue Owner dashboard where you can edit the venue, deals, and hours.
  • In-app purchases: the demo accounts are already upgraded. To test a
    subscription purchase, register a new account (it starts on the free
    plan) and buy with your sandbox tester.
  • Account deletion is available under Profile → Delete Account.
  • Support is reachable under Settings → Support & Legal.`;

function DemoStatus({ r, done }) {
  if (!r) return null;
  const err = r.inviteError || r.roleError;
  if (err) return <p className="text-xs text-destructive mt-2">Error: {err}</p>;
  if (r.invited && !done) return <p className="text-xs text-amber-700 mt-2">Invite sent. Accept the invite email, then run this again to finish setup.</p>;
  return <p className="text-xs text-emerald-600 mt-2">{r.alreadyExisted ? 'Account exists' : 'Invited'} · setup {done || 'pending'}</p>;
}

export default function DemoAccountsSetup() {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);

  const handleSetup = async () => {
    setRunning(true);
    try {
      const res = await setupDemoAccounts({});
      setResult(res.data);
      toast.success('Demo accounts configured');
    } catch (e) {
      toast.error(e?.response?.data?.error || e.message || 'Setup failed');
    } finally {
      setRunning(false);
    }
  };

  const copyNotes = () => {
    navigator.clipboard.writeText(REVIEWER_NOTES);
    setCopied(true);
    toast.success('Reviewer notes copied');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-2xl space-y-5">
      <div>
        <h2 className="text-xl font-heading font-bold flex items-center gap-2">
          <UserCheck className="w-5 h-5 text-primary" /> Demo Accounts for App Review
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          One-click setup of the consumer and venue-owner accounts Apple &amp; Google reviewers use to test the full app.
        </p>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex gap-2">
        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <p className="text-xs text-amber-800">
          The accounts are invited by email. To finish, open each invite email and set the password below
          (<span className="font-mono font-semibold">{DEMO_PASSWORD}</span>), or have the reviewer use "Forgot Password" with that password. Profiles, premium access, and the demo venue are configured automatically.
        </p>
      </div>

      <Button onClick={handleSetup} disabled={running} className="gap-2">
        {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserCheck className="w-4 h-4" />}
        {running ? 'Configuring…' : 'Create / Refresh Demo Accounts'}
      </Button>

      {/* Credentials */}
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="border rounded-lg p-4 bg-card">
          <div className="flex items-center gap-2 mb-2">
            <User className="w-4 h-4 text-primary" />
            <span className="font-semibold text-sm">Consumer</span>
            <Badge variant="outline" className="ml-auto">Premium</Badge>
          </div>
          <p className="text-xs text-muted-foreground">Email</p>
          <p className="text-sm font-mono break-all">{CONSUMER_EMAIL}</p>
          <p className="text-xs text-muted-foreground mt-2">Password</p>
          <p className="text-sm font-mono">{DEMO_PASSWORD}</p>
          <DemoStatus r={result?.results?.user} done={result?.results?.user?.profile} />

        </div>
        <div className="border rounded-lg p-4 bg-card">
          <div className="flex items-center gap-2 mb-2">
            <Store className="w-4 h-4 text-primary" />
            <span className="font-semibold text-sm">Venue Owner</span>
            <Badge variant="outline" className="ml-auto">Platinum</Badge>
          </div>
          <p className="text-xs text-muted-foreground">Email</p>
          <p className="text-sm font-mono break-all">{VENUE_EMAIL}</p>
          <p className="text-xs text-muted-foreground mt-2">Password</p>
          <p className="text-sm font-mono">{DEMO_PASSWORD}</p>
          <DemoStatus r={result?.results?.venue} done={result?.results?.venue?.venue} />

        </div>
      </div>

      {/* Reviewer notes */}
      <div className="border rounded-lg bg-card overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2.5 border-b bg-muted/40">
          <span className="font-semibold text-sm">Reviewer Notes (paste into App Store Connect / Play Console)</span>
          <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={copyNotes}>
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied' : 'Copy'}
          </Button>
        </div>
        <pre className="text-xs p-4 whitespace-pre-wrap font-mono leading-relaxed text-muted-foreground allow-select">{REVIEWER_NOTES}</pre>
      </div>
    </div>
  );
}