// Frontend registry of every automated email — labels, audience, trigger, cadence,
// and the variables each template supports. Mirrors base44/shared/emailCatalog.ts
// (the backend source of truth). Used by the admin "Automatic Emails" + "Email Templates"
// screens to show friendly names and insert-able variable chips for editing.

export const EMAIL_CATALOG = [
  // Consumer
  { name: 'consumer_welcome', label: 'Consumer Welcome Email', audience: 'consumer', trigger: 'On consumer signup', frequency: 'Once, on signup', description: 'Welcomes a new consumer the moment their profile is created.', variables: ['first_name'] },
  { name: 'waitlist_confirmation', label: 'Waitlist Signup Confirmation', audience: 'consumer', trigger: 'On waitlist signup', frequency: 'Once, on signup', description: 'Confirms a new waitlist signup from the landing page.', variables: ['first_name'] },
  { name: 'new_deal_neighborhood', label: 'New Deal in Neighborhood', audience: 'consumer', trigger: 'On venue deal added', frequency: 'Per event', description: 'Alerts users when a venue in their neighborhood adds a new deal.', variables: ['first_name', 'venue_name', 'deal_text', 'app_url'] },
  { name: 'new_venue_neighborhood', label: 'New Venue in Neighborhood', audience: 'consumer', trigger: 'On venue activated', frequency: 'Per event', description: 'Notifies users when a new venue goes live in their neighborhood.', variables: ['first_name', 'venue_name', 'app_url'] },
  { name: 'favorite_venue_update', label: 'Favorite Venue Update', audience: 'consumer', trigger: 'On venue happy hour update', frequency: 'Per event', description: 'Notifies users who favorited the venue when its happy hour details change.', variables: ['first_name', 'venue_name', 'app_url'] },
  { name: 'wallet_pass_notification', label: 'Wallet Pass Notification', audience: 'consumer', trigger: 'On wallet pass created/updated', frequency: 'Per event', description: 'Notifies fans of new or updated wallet passes.', variables: ['first_name', 'venue_name', 'pass_title', 'app_url'] },
  { name: 'issue_resolution', label: 'Issue Resolution Notification', audience: 'consumer', trigger: 'On listing issue resolved', frequency: 'Per event', description: 'Emails the reporter when their reported issue is resolved or dismissed.', variables: ['first_name', 'venue_name', 'resolution_note'] },
  { name: 'crew_checkin_notification', label: 'Crew Check-In Notification', audience: 'consumer', trigger: 'On shared check-in', frequency: 'Per event', description: 'Emails crew members when a premium user shares a check-in.', variables: ['first_name', 'friend_name', 'venue_name', 'note', 'app_url'] },
  { name: 'crew_invite', label: 'Crew Invite', audience: 'consumer', trigger: 'On crew invite sent', frequency: 'Per event', description: "Invites a friend to join the inviter's crew.", variables: ['inviter_name', 'app_url'] },

  // Venue Owner
  { name: 'venue_welcome', label: 'Venue Welcome Email', audience: 'owner', trigger: 'On venue created', frequency: 'Once, on creation', description: 'Welcomes a venue owner the moment their venue is created.', variables: ['first_name', 'venue_name'] },
  { name: 'expired_offer_notice', label: 'Expired Offer Notice', audience: 'owner', trigger: 'Scheduled', frequency: 'Daily · 8:00 AM', description: 'Tells the owner an offer expired; flags it for removal if untouched for 24h.', variables: ['first_name', 'venue_name', 'offer_text', 'app_url'] },
  { name: 'stalled_onboarding_nudge', label: 'Stalled Onboarding Nudge', audience: 'owner', trigger: 'Scheduled', frequency: 'Daily · 2:00 PM', description: 'Reminds owners approved 48h+ ago with incomplete listings to finish setup.', variables: ['first_name', 'venue_name', 'checklist', 'app_url'] },
  { name: 'low_health_score_nudge', label: 'Low Health Score Nudge', audience: 'owner', trigger: 'Scheduled', frequency: 'Weekly · Mon 2:00 PM', description: 'Nudges owners whose listings are incomplete to improve their profile.', variables: ['first_name', 'venue_name', 'health_score', 'app_url'] },
  { name: 'monthly_venue_reminder', label: 'Monthly Venue Reminder', audience: 'owner', trigger: 'Scheduled', frequency: 'Monthly · 1st, 1:00 PM', description: 'Reminds owners to update their happy hour details.', variables: ['first_name', 'venue_name', 'app_url'] },
  { name: 'weekly_ambassador_summary', label: 'Weekly Ambassador Summary', audience: 'owner', trigger: 'Scheduled', frequency: 'Weekly · Mon 1:00 PM', description: 'Referral sign-ups, earnings, and QR link for ambassador owners.', variables: ['first_name', 'referral_count', 'earnings', 'referral_link'] },
  { name: 'weekly_performance_report', label: 'Weekly Performance Report', audience: 'owner', trigger: 'Scheduled', frequency: 'Weekly · Mon 9:00 AM', description: 'Performance reports for premium & platinum owners.', variables: ['first_name', 'venue_name', 'views', 'favorites', 'reviews', 'app_url'] },
  { name: 'competitor_deal_alert', label: 'Competitor Deal Alert', audience: 'owner', trigger: 'On competitor deal update', frequency: 'Per event', description: 'Alerts owners who track that venue as a competitor.', variables: ['first_name', 'competitor_name', 'app_url'] },
  { name: 'review_momentum_nudge', label: 'Review Momentum Nudge', audience: 'owner', trigger: 'On new review', frequency: 'Per event', description: 'Emails owner when a venue gets 3+ 5-star reviews in 7 days.', variables: ['first_name', 'venue_name', 'review_count', 'app_url'] },
  { name: 'new_favorite_notification', label: 'New Favorite Notification', audience: 'owner', trigger: 'On venue favorited', frequency: 'Per event', description: 'Emails the owner when someone favorites their venue.', variables: ['venue_name', 'fan_name'] },
  { name: 'new_review_notification', label: 'New Review Notification', audience: 'owner', trigger: 'On new review', frequency: 'Per event', description: 'Emails the owner when a new review is posted.', variables: ['venue_name', 'reviewer_name', 'rating', 'comment'] },
  { name: 'ad_received', label: 'Ad Received (Payment Success)', audience: 'owner', trigger: 'On ad purchase', frequency: 'Per event', description: 'Sent after an ad purchase succeeds and the ad enters review.', variables: ['first_name', 'venue_name', 'tier'] },
  { name: 'ad_approved', label: 'Ad Approved', audience: 'owner', trigger: 'On ad approved', frequency: 'Per event', description: 'Sent when an admin approves an ad and it enters rotation.', variables: ['first_name', 'venue_name', 'tier'] },
  { name: 'ad_rejected', label: 'Ad Rejected', audience: 'owner', trigger: 'On ad rejected', frequency: 'Per event', description: 'Sent when an admin rejects an ad campaign.', variables: ['first_name', 'venue_name', 'ad_title', 'admin_note'] },

  // Admin
  { name: 'admin_weekly_summary', label: 'Admin Weekly Summary', audience: 'admin', trigger: 'Scheduled', frequency: 'Weekly · Mon 9:00 AM', description: 'Weekly platform summary for admins.', variables: ['new_venues', 'new_users', 'new_reviews', 'pending_claims'] },
  { name: 'new_venue_claim_alert', label: 'New Venue Claim Alert', audience: 'admin', trigger: 'On claim submitted', frequency: 'Per event', description: 'Emails the admin whenever an owner submits a venue claim.', variables: ['venue_name', 'claimant_name', 'claimant_email', 'app_url'] },
  { name: 'expiring_deals_alert', label: 'Expiring Deals Alert', audience: 'admin', trigger: 'Scheduled', frequency: 'Every 6 hours', description: 'Scans for deals expiring within 48h and alerts owners + admin.', variables: ['venue_name', 'deal_text', 'expires_at'] },

  // Legacy generic welcome (kept for compatibility)
  { name: 'welcome_email', label: 'Welcome Email (legacy)', audience: 'consumer', trigger: 'Manual / legacy', frequency: 'On demand', description: 'Legacy generic welcome template.', variables: ['user_name', 'app_url'] },
];

export const EMAIL_CATALOG_BY_NAME = Object.fromEntries(EMAIL_CATALOG.map((e) => [e.name, e]));

// Sample values used to render live previews with realistic content.
export const SAMPLE_VALUES = {
  first_name: 'Jane',
  user_name: 'Jane Smith',
  friend_name: 'Alex',
  inviter_name: 'Alex',
  fan_name: 'Maria Garcia',
  reviewer_name: 'Alex Johnson',
  claimant_name: 'Sam Rivera',
  claimant_email: 'sam@example.com',
  competitor_name: 'The Rusty Tap',
  venue_name: 'The Rusty Tap',
  pass_title: 'BOGO Draft Beers',
  deal_text: '$5 house margaritas, 4–7pm',
  offer_text: '2-for-1 wings',
  resolution_note: 'We updated the hours as you suggested. Thank you!',
  note: 'Grabbing drinks — come join!',
  checklist: '<li>✏️ Add a short description</li><li>🍸 Set your happy hour deals</li><li>📸 Upload photos</li>',
  health_score: '62',
  referral_count: '4',
  earnings: '$120',
  referral_link: 'https://happyhourflower.com/r/abc123',
  views: '248',
  favorites: '12',
  reviews: '5',
  new_venues: '7',
  new_users: '134',
  new_reviews: '22',
  pending_claims: '3',
  rating: '5',
  comment: 'Best happy hour in town!',
  tier: 'Premium',
  ad_title: 'Weekend Special',
  admin_note: 'Please remove pricing claims from the image.',
  expires_at: 'Aug 31, 2026',
  app_url: 'https://happyhourflower.com',
};

export function previewWithSampleData(text, name) {
  if (!text) return '';
  return String(text).replace(/\{\{(\w+)\}\}/g, (_, key) => SAMPLE_VALUES[key] ?? `{{${key}}}`);
}