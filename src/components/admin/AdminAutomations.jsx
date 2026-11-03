import { Badge } from '@/components/ui/badge';
import { Clock, Zap, CalendarClock, RefreshCw } from 'lucide-react';

// Snapshot of the app's configured automations. Scheduled ones list their cadence;
// event-driven ones list what triggers them. Keep in sync with the automations config.
const SCHEDULED = [
  { name: 'Process Expired Venue Offers', frequency: 'Daily · 8:00 AM', desc: 'Emails owners when an offer expires, then flags it for admin removal if untouched for 24h.', active: true },
  { name: 'Auto-expire Wallet Passes', frequency: 'Hourly', desc: 'Marks issued coupons past their expiry date as expired.', active: true },
  { name: 'Venue Health Score', frequency: 'Weekly · Mon 2:00 PM', desc: 'Scores every owned listing for completeness and nudges owners with weak profiles.', active: true },
  { name: 'Stalled Onboarding Nudge', frequency: 'Daily · 2:00 PM', desc: 'Reminds owners approved 48h+ ago with incomplete listings to finish setup.', active: true },
  { name: 'Weekly Neighborhood Digest', frequency: 'Weekly · Mon 1:00 PM', desc: "Emails users the newest venues added to their saved neighborhood.", active: true },
  { name: 'Admin Weekly Summary Email', frequency: 'Weekly · Mon 9:00 AM', desc: 'Sends admins a weekly platform summary.', active: true },
  { name: 'Monthly Venue Owner Reminder', frequency: 'Monthly · 1st, 1:00 PM', desc: 'Reminds venue owners to update their happy hour details.', active: true },
  { name: 'Weekly Ambassador Referral Summary', frequency: 'Weekly · Mon 1:00 PM', desc: 'Emails owners their referral sign-ups, earnings, and QR link.', active: true },
  { name: 'Weekly Performance Report (Premium)', frequency: 'Weekly · Mon 9:00 AM', desc: 'Sends weekly performance reports to premium & platinum venue owners.', active: true },
  { name: 'Check Expiring Deals', frequency: 'Every 6 hours', desc: 'Scans listings for deals expiring within 48h and reminds owners + admin.', active: false },
];

const EVENT_DRIVEN = [
  { name: 'Notify Crew of Shared Check-Ins', trigger: 'On check-in shared', desc: 'Emails/SMS crew when a premium user shares a check-in.', active: true },
  { name: 'Competitor Deal Alert', trigger: 'On venue deal update', desc: 'Alerts owners who track that venue as a competitor.', active: true },
  { name: 'Review Momentum Nudge', trigger: 'On new review', desc: 'Emails owner when a venue gets 3+ 5-star reviews in 7 days.', active: true },
  { name: 'Issue Resolution Notification', trigger: 'On listing issue resolved', desc: 'Emails the reporter when an issue is resolved or dismissed.', active: true },
  { name: 'New Venue Claim Alert', trigger: 'On claim submitted', desc: 'Emails the admin whenever an owner submits a venue claim.', active: true },
  { name: 'New Deal Neighborhood Alert', trigger: 'On venue deal added', desc: 'Emails users when a venue in their neighborhood adds a new deal.', active: true },
  { name: 'New Venue Neighborhood Alert', trigger: 'On venue activated', desc: 'Notifies users when a new venue goes live in their neighborhood.', active: true },
  { name: 'Favorite Venue Update', trigger: 'On venue happy hour update', desc: 'Notifies users who favorited the venue.', active: true },
  { name: 'New Favorite Notification', trigger: 'On venue favorited', desc: 'Emails the venue owner when someone favorites them.', active: true },
  { name: 'New Review Notification', trigger: 'On new review', desc: 'Emails the venue owner when a new review is posted.', active: true },
  { name: 'Wallet Pass Notification', trigger: 'On wallet pass created/updated', desc: 'Notifies fans of new or updated wallet passes.', active: true },
  { name: 'Waitlist Signup Confirmation', trigger: 'On waitlist signup', desc: 'Sends a confirmation email to new waitlist signups.', active: true },
  { name: 'MailerLite — Sync Profiles', trigger: 'On profile create/update', desc: 'Routes consumer profiles into the mapped MailerLite group.', active: true },
  { name: 'MailerLite — Sync Venues', trigger: 'On venue activated', desc: 'Syncs active venues to MailerLite.', active: true },
  { name: 'MailerLite — Sync Leads', trigger: 'On lead captured', desc: 'Adds captured leads to MailerLite sequences.', active: true },
  { name: 'MailerLite — Sync Waitlist', trigger: 'On waitlist signup', desc: 'Adds waitlist signups to the nurture sequence.', active: true },
  { name: 'MailerLite — Unsubscribe on Delete', trigger: 'On profile/venue delete', desc: 'Soft-unsubscribes the matching MailerLite subscriber.', active: true },
];

function AutomationRow({ item, badge, badgeIcon }) {
  return (
    <div className="border border-border rounded-lg p-4 bg-card flex items-start justify-between gap-4">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-semibold text-sm">{item.name}</p>
          {!item.active && <Badge variant="secondary" className="text-xs">Paused</Badge>}
        </div>
        <p className="text-xs text-muted-foreground mt-1">{item.desc}</p>
      </div>
      <Badge variant="outline" className="gap-1.5 shrink-0 whitespace-nowrap">
        {badgeIcon}
        {badge}
      </Badge>
    </div>
  );
}

export default function AdminAutomations() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-heading font-bold">Automations</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Everything the platform does automatically — on a schedule or in response to an event.
        </p>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-3">
          <CalendarClock className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
            Scheduled ({SCHEDULED.length})
          </h3>
        </div>
        <div className="space-y-2">
          {SCHEDULED.map((item) => (
            <AutomationRow
              key={item.name}
              item={item}
              badge={item.frequency}
              badgeIcon={<Clock className="w-3.5 h-3.5" />}
            />
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-3">
          <Zap className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
            Event-Driven ({EVENT_DRIVEN.length})
          </h3>
        </div>
        <div className="space-y-2">
          {EVENT_DRIVEN.map((item) => (
            <AutomationRow
              key={item.name}
              item={item}
              badge={item.trigger}
              badgeIcon={<RefreshCw className="w-3.5 h-3.5" />}
            />
          ))}
        </div>
      </div>
    </div>
  );
}