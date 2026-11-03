// Central catalog of EVERY automated email the app sends.
//
// This is the single source of truth for:
//   1. The seed function (seedEmailTemplates) — upserts a DB EmailTemplate per entry.
//   2. The admin "Automatic Emails" screen — labels, audience, trigger, cadence, variables.
//
// Each sending function reads its content from the DB EmailTemplate (by `name`),
// so editing a template in the admin dashboard changes the live email — no code change.
//
// `defaultSubject` / `defaultBody` are the STARTING content (matches what the code
// sent before). Seeding never overwrites an existing template, so admin edits are safe.

const IMG = 'https://media.base44.com/images/public/6a1f45eb9cf7513caebbab49/c16180f90_Untitled1024x1024px512x512px256x256px.gif';

// Standard branded HTML wrapper for owner/admin emails (consumer emails get a footer appended by the sender).
function shell(inner) {
  return `<!DOCTYPE html>
<html>
<body style="font-family:'Nunito',sans-serif;background:#f8f4ef;padding:32px;color:#1a1a1a;">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:16px;padding:32px;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
    <div style="background:#fef3c7;padding:12px 24px;margin:-32px -32px 24px;border-radius:16px 16px 0 0;font-family:Georgia,serif;">
      <img src="https://media.base44.com/images/public/6a1f45eb9cf7513caebbab49/65d765106_HappyHourFlowerLogo.png" alt="Happy Hour Flower" width="40" height="40" style="width:40px;height:40px;max-width:40px;border-radius:50%;display:inline-block;vertical-align:middle;border:0;" />
      <span style="color:#000;font-weight:bold;font-size:18px;vertical-align:middle;margin-left:8px;">Happy Hour Flower</span>
    </div>
    ${inner}
    <hr style="margin:32px 0;border:none;border-top:1px solid #eee;" />
    <p style="font-size:12px;color:#aaa;text-align:center;">Happy Hour Flower · Greenville, SC</p>
  </div>
</body>
</html>`;
}

export const EMAIL_CATALOG = [
  // ---------- CONSUMER ----------
  {
    name: 'consumer_welcome',
    label: 'Consumer Welcome Email',
    audience: 'consumer',
    trigger: 'On consumer signup',
    frequency: 'Once, on signup',
    description: 'Welcomes a new consumer the moment their profile is created.',
    variables: ['first_name'],
    defaultSubject: 'Welcome to Happy Hour Flower, {{first_name}}! 🌸',
    defaultBody: `<div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#1a1a1a"><h1 style="color:#d97706;font-size:24px;margin-bottom:8px">Welcome, {{first_name}}! 🌸</h1><p style="font-size:16px;line-height:1.6">We're so glad you're here. Happy Hour Flower helps you discover the best happy hours, deals, and spots in your neighborhood.</p><div style="background:#fffbeb;border:1px solid #fcd34d;border-radius:8px;padding:16px;margin:20px 0"><p style="margin:0 0 8px;font-weight:bold">Here's how to get started:</p><ul style="margin:0;padding-left:20px;line-height:1.8"><li>🔍 <strong>Explore</strong> venues and happy hours near you</li><li>❤️ <strong>Favorite</strong> the spots you love to get deal alerts</li><li>📍 <strong>Set your neighborhood</strong> for personalized recommendations</li></ul></div><p style="font-size:16px;line-height:1.6">Cheers to your next great happy hour!</p><p style="font-size:16px">— The Happy Hour Flower Team 🌸</p></div>`,
  },
  {
    name: 'waitlist_confirmation',
    label: 'Waitlist Signup Confirmation',
    audience: 'consumer',
    trigger: 'On waitlist signup',
    frequency: 'Once, on signup',
    description: 'Confirms a new waitlist signup from the landing page.',
    variables: ['first_name'],
    defaultSubject: "You're on the list! 🌸 Welcome to Happy Hour Flower",
    defaultBody: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px; background-color: #fafaf9;"><div style="text-align: center; margin-bottom: 24px;"><h1 style="color: #d97706; font-size: 28px; margin: 0;">Happy Hour Flower 🌸</h1></div><div style="background: white; border-radius: 12px; padding: 32px;"><h2 style="color: #1c1917; margin-top: 0;">Hey {{first_name}}, you're in! 🎉</h2><p style="color: #57534e; line-height: 1.6;">Thanks for joining the Happy Hour Flower waitlist! When we launch, you'll be the first to know — and early members get <strong>free access forever</strong>.</p></div></div>`,
  },
  {
    name: 'new_deal_neighborhood',
    label: 'New Deal in Neighborhood',
    audience: 'consumer',
    trigger: 'On venue deal added',
    frequency: 'Per event',
    description: 'Alerts users when a venue in their neighborhood adds a new deal.',
    variables: ['first_name', 'venue_name', 'deal_text', 'app_url'],
    defaultSubject: '🍹 New deal at {{venue_name}}!',
    defaultBody: shell(`<p style="color:#666;">Hi {{first_name}},</p><h2 style="color:#f5a623;margin:8px 0 16px;">{{venue_name}} just added a new deal</h2><p>{{deal_text}}</p><div style="text-align:center;margin:28px 0;"><a href="{{app_url}}" style="background:#f5a623;color:#fff;text-decoration:none;padding:12px 28px;border-radius:10px;font-weight:700;display:inline-block;">See the Deal</a></div>`),
  },
  {
    name: 'new_venue_neighborhood',
    label: 'New Venue in Neighborhood',
    audience: 'consumer',
    trigger: 'On venue activated',
    frequency: 'Per event',
    description: 'Notifies users when a new venue goes live in their neighborhood.',
    variables: ['first_name', 'venue_name', 'app_url'],
    defaultSubject: '🌸 New spot in your neighborhood: {{venue_name}}',
    defaultBody: shell(`<p style="color:#666;">Hi {{first_name}},</p><h2 style="color:#f5a623;margin:8px 0 16px;">{{venue_name}} just joined Happy Hour Flower</h2><p>A new venue in your saved neighborhood is now live. Check out their happy hours and deals!</p><div style="text-align:center;margin:28px 0;"><a href="{{app_url}}" style="background:#f5a623;color:#fff;text-decoration:none;padding:12px 28px;border-radius:10px;font-weight:700;display:inline-block;">Explore {{venue_name}}</a></div>`),
  },
  {
    name: 'favorite_venue_update',
    label: 'Favorite Venue Update',
    audience: 'consumer',
    trigger: 'On venue happy hour update',
    frequency: 'Per event',
    description: 'Notifies users who favorited the venue when its happy hour details change.',
    variables: ['first_name', 'venue_name', 'app_url'],
    defaultSubject: '📣 {{venue_name}} updated their happy hour',
    defaultBody: shell(`<p style="color:#666;">Hi {{first_name}},</p><h2 style="color:#f5a623;margin:8px 0 16px;">{{venue_name}} just updated their happy hour</h2><p>One of your favorite spots changed their deals or schedule. Take a look so you don't miss out!</p><div style="text-align:center;margin:28px 0;"><a href="{{app_url}}" style="background:#f5a623;color:#fff;text-decoration:none;padding:12px 28px;border-radius:10px;font-weight:700;display:inline-block;">View {{venue_name}}</a></div>`),
  },
  {
    name: 'wallet_pass_notification',
    label: 'Wallet Pass Notification',
    audience: 'consumer',
    trigger: 'On wallet pass created/updated',
    frequency: 'Per event',
    description: 'Notifies fans of new or updated wallet passes.',
    variables: ['first_name', 'venue_name', 'pass_title', 'app_url'],
    defaultSubject: '🎟️ New pass from {{venue_name}}',
    defaultBody: shell(`<p style="color:#666;">Hi {{first_name}},</p><h2 style="color:#f5a623;margin:8px 0 16px;">{{venue_name}} has a new pass for you</h2><p><strong>{{pass_title}}</strong> is ready to add to your wallet.</p><div style="text-align:center;margin:28px 0;"><a href="{{app_url}}" style="background:#f5a623;color:#fff;text-decoration:none;padding:12px 28px;border-radius:10px;font-weight:700;display:inline-block;">Get My Pass</a></div>`),
  },
  {
    name: 'issue_resolution',
    label: 'Issue Resolution Notification',
    audience: 'consumer',
    trigger: 'On listing issue resolved',
    frequency: 'Per event',
    description: 'Emails the reporter when their reported issue is resolved or dismissed.',
    variables: ['first_name', 'venue_name', 'resolution_note'],
    defaultSubject: '✅ Update on the issue you reported',
    defaultBody: shell(`<p style="color:#666;">Hi {{first_name}},</p><h2 style="color:#f5a623;margin:8px 0 16px;">Thanks for helping us keep listings accurate</h2><p>The issue you reported for <strong>{{venue_name}}</strong> has been reviewed.</p><p>{{resolution_note}}</p>`),
  },
  {
    name: 'crew_checkin_notification',
    label: 'Crew Check-In Notification',
    audience: 'consumer',
    trigger: 'On shared check-in',
    frequency: 'Per event',
    description: 'Emails crew members when a premium user shares a check-in.',
    variables: ['first_name', 'friend_name', 'venue_name', 'note', 'app_url'],
    defaultSubject: '🍻 {{friend_name}} just checked in at {{venue_name}}',
    defaultBody: shell(`<p style="color:#666;">Hi {{first_name}},</p><h2 style="color:#f5a623;margin:8px 0 16px;">{{friend_name}} is out at {{venue_name}}</h2><p>{{note}}</p><div style="text-align:center;margin:28px 0;"><a href="{{app_url}}" style="background:#f5a623;color:#fff;text-decoration:none;padding:12px 28px;border-radius:10px;font-weight:700;display:inline-block;">Join Them</a></div>`),
  },
  {
    name: 'crew_invite',
    label: 'Crew Invite',
    audience: 'consumer',
    trigger: 'On crew invite sent',
    frequency: 'Per event',
    description: "Invites a friend to join the inviter's crew.",
    variables: ['inviter_name', 'app_url'],
    defaultSubject: "🎉 {{inviter_name}} invited you to their crew on Happy Hour Flower",
    defaultBody: shell(`<h2 style="color:#f5a623;margin:8px 0 16px;">{{inviter_name}} wants you on their crew!</h2><p>Join their crew on Happy Hour Flower to share check-ins and discover happy hours together.</p><div style="text-align:center;margin:28px 0;"><a href="{{app_url}}" style="background:#f5a623;color:#fff;text-decoration:none;padding:12px 28px;border-radius:10px;font-weight:700;display:inline-block;">Accept Invite</a></div>`),
  },

  // ---------- VENUE OWNER ----------
  {
    name: 'venue_welcome',
    label: 'Venue Welcome Email',
    audience: 'owner',
    trigger: 'On venue created',
    frequency: 'Once, on creation',
    description: 'Welcomes a venue owner the moment their venue is created.',
    variables: ['first_name', 'venue_name'],
    defaultSubject: 'Welcome to Happy Hour Flower, {{venue_name}}! 🍻',
    defaultBody: `<div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#1a1a1a"><h1 style="color:#d97706;font-size:24px;margin-bottom:8px">Welcome aboard, {{first_name}}! 🍻</h1><p style="font-size:16px;line-height:1.6"><strong>{{venue_name}}</strong> is now part of Happy Hour Flower — the easiest way for local guests to discover your happy hours and deals.</p><div style="background:#fffbeb;border:1px solid #fcd34d;border-radius:8px;padding:16px;margin:20px 0"><p style="margin:0 0 8px;font-weight:bold">Get the most out of your listing:</p><ul style="margin:0;padding-left:20px;line-height:1.8"><li>🕒 <strong>Add your happy hour times & deals</strong></li><li>📸 <strong>Upload photos</strong> to make your listing shine</li><li>🎟️ <strong>Create wallet coupons & loyalty cards</strong></li><li>📊 <strong>Track views, favorites, and reviews</strong></li></ul></div><p style="font-size:16px">Cheers to more guests through your door!</p><p style="font-size:16px">— The Happy Hour Flower Team 🌸</p></div>`,
  },
  {
    name: 'expired_offer_notice',
    label: 'Expired Offer Notice',
    audience: 'owner',
    trigger: 'Scheduled',
    frequency: 'Daily · 8:00 AM',
    description: 'Tells the owner an offer expired; flags it for removal if untouched for 24h.',
    variables: ['first_name', 'venue_name', 'offer_text', 'app_url'],
    defaultSubject: '⏰ An offer at {{venue_name}} has expired',
    defaultBody: shell(`<p style="color:#666;">Hi {{first_name}},</p><h2 style="color:#f5a623;margin:8px 0 16px;">An offer just expired</h2><p>Your offer <strong>{{offer_text}}</strong> at {{venue_name}} has expired. Update or remove it to keep your listing fresh.</p><div style="text-align:center;margin:28px 0;"><a href="{{app_url}}" style="background:#f5a623;color:#fff;text-decoration:none;padding:12px 28px;border-radius:10px;font-weight:700;display:inline-block;">Update My Deals</a></div>`),
  },
  {
    name: 'stalled_onboarding_nudge',
    label: 'Stalled Onboarding Nudge',
    audience: 'owner',
    trigger: 'Scheduled',
    frequency: 'Daily · 2:00 PM',
    description: 'Reminds owners approved 48h+ ago with incomplete listings to finish setup.',
    variables: ['first_name', 'venue_name', 'checklist', 'app_url'],
    defaultSubject: "Let's finish setting up {{venue_name}} 🌸",
    defaultBody: shell(`<p style="color:#666;">Hi {{first_name}},</p><h2 style="color:#f5a623;margin:8px 0 16px;">Your venue is almost ready!</h2><p>You claimed <strong>{{venue_name}}</strong> but haven't finished setting up your listing yet. A complete profile gets discovered far more often — here's what's left:</p><ul style="padding-left:20px;line-height:2;">{{checklist}}</ul><div style="text-align:center;margin:28px 0;"><a href="{{app_url}}" style="background:#f5a623;color:#fff;text-decoration:none;padding:12px 28px;border-radius:10px;font-weight:700;display:inline-block;">Finish My Setup</a></div>`),
  },
  {
    name: 'low_health_score_nudge',
    label: 'Low Health Score Nudge',
    audience: 'owner',
    trigger: 'Scheduled',
    frequency: 'Weekly · Mon 2:00 PM',
    description: 'Nudges owners whose listings are incomplete to improve their profile.',
    variables: ['first_name', 'venue_name', 'health_score', 'app_url'],
    defaultSubject: 'Boost your visibility for {{venue_name}} 🌸',
    defaultBody: shell(`<p style="color:#666;">Hi {{first_name}},</p><h2 style="color:#f5a623;margin:8px 0 16px;">Your listing could be working harder</h2><p><strong>{{venue_name}}</strong> has a profile completeness score of <strong>{{health_score}}/100</strong>. Listings with complete profiles get far more views. A few quick updates can make a big difference.</p><div style="text-align:center;margin:28px 0;"><a href="{{app_url}}" style="background:#f5a623;color:#fff;text-decoration:none;padding:12px 28px;border-radius:10px;font-weight:700;display:inline-block;">Improve My Listing</a></div>`),
  },
  {
    name: 'monthly_venue_reminder',
    label: 'Monthly Venue Reminder',
    audience: 'owner',
    trigger: 'Scheduled',
    frequency: 'Monthly · 1st, 1:00 PM',
    description: 'Reminds owners to update their happy hour details.',
    variables: ['first_name', 'venue_name', 'app_url'],
    defaultSubject: 'Time for a monthly refresh of {{venue_name}} 🌸',
    defaultBody: shell(`<p style="color:#666;">Hi {{first_name}},</p><h2 style="color:#f5a623;margin:8px 0 16px;">Keep {{venue_name}} looking fresh</h2><p>It's a new month! Take a minute to make sure your happy hour times, deals, and photos are up to date so guests always see the latest.</p><div style="text-align:center;margin:28px 0;"><a href="{{app_url}}" style="background:#f5a623;color:#fff;text-decoration:none;padding:12px 28px;border-radius:10px;font-weight:700;display:inline-block;">Update My Listing</a></div>`),
  },
  {
    name: 'weekly_ambassador_summary',
    label: 'Weekly Ambassador Summary',
    audience: 'owner',
    trigger: 'Scheduled',
    frequency: 'Weekly · Mon 1:00 PM',
    description: 'Referral sign-ups, earnings, and QR link for ambassador owners.',
    variables: ['first_name', 'referral_count', 'earnings', 'referral_link'],
    defaultSubject: '🎯 Your weekly referral summary',
    defaultBody: shell(`<p style="color:#666;">Hi {{first_name}},</p><h2 style="color:#f5a623;margin:8px 0 16px;">Your referrals this week</h2><p>You've referred <strong>{{referral_count}}</strong> sign-ups and earned <strong>{{earnings}}</strong>.</p><p>Keep sharing your link to earn more:</p><p style="text-align:center;"><a href="{{referral_link}}" style="color:#f5a623;">{{referral_link}}</a></p>`),
  },
  {
    name: 'weekly_performance_report',
    label: 'Weekly Performance Report',
    audience: 'owner',
    trigger: 'Scheduled',
    frequency: 'Weekly · Mon 9:00 AM',
    description: 'Performance reports for premium & platinum owners.',
    variables: ['first_name', 'venue_name', 'views', 'favorites', 'reviews', 'app_url'],
    defaultSubject: '📊 {{venue_name}} — your weekly performance',
    defaultBody: shell(`<p style="color:#666;">Hi {{first_name}},</p><h2 style="color:#f5a623;margin:8px 0 16px;">This week at {{venue_name}}</h2><ul style="padding-left:20px;line-height:2;"><li>👀 <strong>{{views}}</strong> profile views</li><li>❤️ <strong>{{favorites}}</strong> new favorites</li><li>⭐ <strong>{{reviews}}</strong> new reviews</li></ul><div style="text-align:center;margin:28px 0;"><a href="{{app_url}}" style="background:#f5a623;color:#fff;text-decoration:none;padding:12px 28px;border-radius:10px;font-weight:700;display:inline-block;">View Full Dashboard</a></div>`),
  },
  {
    name: 'competitor_deal_alert',
    label: 'Competitor Deal Alert',
    audience: 'owner',
    trigger: 'On competitor deal update',
    frequency: 'Per event',
    description: 'Alerts owners who track that venue as a competitor.',
    variables: ['first_name', 'competitor_name', 'app_url'],
    defaultSubject: '👀 {{competitor_name}} just updated their deals',
    defaultBody: shell(`<p style="color:#666;">Hi {{first_name}},</p><h2 style="color:#f5a623;margin:8px 0 16px;">A venue you're watching just changed their happy hour deals</h2><p><strong>{{competitor_name}}</strong> — one of your tracked competitors — just updated their deals. Now's a good time to review your own and stay ahead.</p><div style="text-align:center;margin:28px 0;"><a href="{{app_url}}" style="background:#f5a623;color:#fff;text-decoration:none;padding:12px 28px;border-radius:10px;font-weight:700;display:inline-block;">Review My Deals</a></div>`),
  },
  {
    name: 'review_momentum_nudge',
    label: 'Review Momentum Nudge',
    audience: 'owner',
    trigger: 'On new review',
    frequency: 'Per event',
    description: 'Emails owner when a venue gets 3+ 5-star reviews in 7 days.',
    variables: ['first_name', 'venue_name', 'review_count', 'app_url'],
    defaultSubject: '🔥 {{venue_name}} is on a roll — capitalize on your momentum!',
    defaultBody: shell(`<p style="color:#666;">Hi {{first_name}},</p><h2 style="color:#f5a623;margin:8px 0 16px;">{{venue_name}} just earned {{review_count}} five-star reviews this week! ⭐⭐⭐⭐⭐</h2><p>Your customers are loving you right now — this is the perfect moment to keep the traffic flowing.</p><div style="margin:20px 0;padding:16px;background:#fef9f0;border-left:3px solid #f5a623;border-radius:6px;"><p style="margin:0 0 8px;font-weight:700;color:#8a6900;">Ideas to capitalize:</p><ul style="margin:0;padding-left:20px;line-height:1.9;color:#5a4a20;"><li>Launch a limited-time special to reward your fans</li><li>Add a new happy hour deal for the coming week</li><li>Promote an upcoming event on your listing</li></ul></div><div style="text-align:center;margin:28px 0;"><a href="{{app_url}}" style="background:#f5a623;color:#fff;text-decoration:none;padding:12px 28px;border-radius:10px;font-weight:700;display:inline-block;">Add a New Deal</a></div>`),
  },
  {
    name: 'new_favorite_notification',
    label: 'New Favorite Notification',
    audience: 'owner',
    trigger: 'On venue favorited',
    frequency: 'Per event',
    description: 'Emails the owner when someone favorites their venue.',
    variables: ['venue_name', 'fan_name'],
    defaultSubject: '❤️ Someone favorited {{venue_name}}!',
    defaultBody: shell(`<h2 style="color:#f5a623;margin:8px 0 16px;">You have a new fan!</h2><p><strong>{{fan_name}}</strong> just favorited <strong>{{venue_name}}</strong>. They'll now get alerts about your deals and updates.</p>`),
  },
  {
    name: 'new_review_notification',
    label: 'New Review Notification',
    audience: 'owner',
    trigger: 'On new review',
    frequency: 'Per event',
    description: 'Emails the owner when a new review is posted.',
    variables: ['venue_name', 'reviewer_name', 'rating', 'comment'],
    defaultSubject: '⭐ New review for {{venue_name}}',
    defaultBody: shell(`<h2 style="color:#f5a623;margin:8px 0 16px;">New review for {{venue_name}}</h2><p><strong>{{reviewer_name}}</strong> left a {{rating}}-star review:</p><blockquote style="border-left:3px solid #f5a623;padding-left:16px;margin:16px 0;color:#555;">{{comment}}</blockquote>`),
  },

  {
    name: 'venue_submission_received',
    label: 'Submission Received (Claim / Add a Business)',
    audience: 'owner',
    trigger: 'On claim or new-business submitted',
    frequency: 'Per event',
    description: 'Acknowledgment sent to the person who submitted a venue claim or a new business.',
    variables: ['claimant_name', 'venue_name', 'submission_type', 'details_table'],
    defaultSubject: 'We received your {{submission_type}} for "{{venue_name}}"',
    defaultBody: shell(`<p style="color:#666;">Hi {{claimant_name}},</p><h2 style="color:#f5a623;margin:8px 0 16px;">Thanks — we've got your submission</h2><p>We received your {{submission_type}} for <strong>{{venue_name}}</strong>.</p><table style="width:100%;border-collapse:collapse;margin:16px 0;">{{details_table}}</table><p>Our team reviews submissions manually — you'll get another email as soon as it's approved (usually within 1–2 business days). No action is needed from you right now.</p><p>If any details need correcting, just reply to this email.</p>`),
  },
  {
    name: 'claim_approved',
    label: 'Claim Approved — Owner Onboarding',
    audience: 'owner',
    trigger: 'On claim approved by admin',
    frequency: 'Per event',
    description: 'Sent to the claimant when an admin approves their venue claim, with onboarding steps.',
    variables: ['claimant_name', 'venue_name', 'venue_id', 'admin_notes_block'],
    defaultSubject: '✅ Your claim for "{{venue_name}}" has been approved!',
    defaultBody: shell(`<p style="color:#666;margin-bottom:8px;">Hi {{claimant_name}},</p>
<h2 style="color:#f5a623;margin-bottom:16px;">🎉 Welcome to Happy Hour Flower!</h2>
<p>Your venue claim has been approved. Here's how to complete your onboarding:</p>
<ol style="padding-left:20px;line-height:2;">
  <li><strong>Log in to your account</strong> at <a href="https://happyhourflower.com/login" style="color:#f5a623;">happyhourflower.com/login</a></li>
  <li><strong>Find your venue</strong> — your claimed venue will appear on your dashboard.</li>
  <li><strong>Complete your listing</strong> — click <em>"Edit Listing"</em> then update your venue info, happy hour schedule and deals, photos, amenities, and events.</li>
  <li><strong>Submit for review</strong> — we typically approve listings within 24 hours.</li>
  <li><strong>Upgrade your plan</strong> (optional) — visit <a href="https://happyhourflower.com/site/pricing/venues" style="color:#f5a623;">our plans page</a> to unlock unlimited photos, priority placement, and more.</li>
</ol>
<p style="margin-top:24px;">Have questions? Reply to this email or visit our support page.</p>
{{admin_notes_block}}`),
  },
  {
    name: 'claim_rejected',
    label: 'Claim Denied',
    audience: 'owner',
    trigger: 'On claim denied by admin',
    frequency: 'Per event',
    description: 'Sent to the claimant when an admin denies their venue claim.',
    variables: ['claimant_name', 'venue_name', 'admin_notes_block'],
    defaultSubject: 'Update on your claim for "{{venue_name}}"',
    defaultBody: shell(`<p style="color:#666;">Hi {{claimant_name}},</p><p>Thank you for your interest in claiming <strong>{{venue_name}}</strong> on Happy Hour Flower.</p><p>After reviewing your request, we were unable to verify your authorization to manage this venue at this time.</p>{{admin_notes_block}}<p>If you believe this is an error, please reply to this email with additional documentation proving your authorization.</p>`),
  },

  // ---------- ADMIN ----------
  {
    name: 'admin_weekly_summary',
    label: 'Admin Weekly Summary',
    audience: 'admin',
    trigger: 'Scheduled',
    frequency: 'Weekly · Mon 9:00 AM',
    description: 'Weekly platform summary for admins.',
    variables: ['new_venues', 'new_users', 'new_reviews', 'pending_claims'],
    defaultSubject: '📈 Happy Hour Flower — your weekly summary',
    defaultBody: shell(`<h2 style="color:#f5a623;margin:8px 0 16px;">This week on Happy Hour Flower</h2><ul style="padding-left:20px;line-height:2;"><li>🏪 <strong>{{new_venues}}</strong> new venues</li><li>👤 <strong>{{new_users}}</strong> new users</li><li>⭐ <strong>{{new_reviews}}</strong> new reviews</li><li>📋 <strong>{{pending_claims}}</strong> pending claims</li></ul>`),
  },
  {
    name: 'new_venue_claim_alert',
    label: 'New Venue Claim Alert',
    audience: 'admin',
    trigger: 'On claim submitted',
    frequency: 'Per event',
    description: 'Emails the admin whenever an owner submits a venue claim.',
    variables: ['venue_name', 'claimant_name', 'claimant_email', 'claimant_phone', 'relationship', 'submission_type', 'details_table', 'app_url'],
    defaultSubject: '📋 New {{submission_type}}: {{venue_name}}',
    defaultBody: shell(`<h2 style="color:#f5a623;margin:8px 0 16px;">New {{submission_type}} submitted</h2><p><strong>{{claimant_name}}</strong> ({{claimant_email}} · {{claimant_phone}}, {{relationship}}) submitted a {{submission_type}} for <strong>{{venue_name}}</strong>.</p><table style="width:100%;border-collapse:collapse;margin:16px 0;">{{details_table}}</table><div style="text-align:center;margin:28px 0;"><a href="{{app_url}}" style="background:#f5a623;color:#fff;text-decoration:none;padding:12px 28px;border-radius:10px;font-weight:700;display:inline-block;">Review Claim</a></div>`),
  },
  {
    name: 'expiring_deals_alert',
    label: 'Expiring Deals Alert',
    audience: 'admin',
    trigger: 'Scheduled',
    frequency: 'Every 6 hours',
    description: 'Scans for deals expiring within 48h and alerts owners + admin.',
    variables: ['venue_name', 'deal_text', 'expires_at'],
    defaultSubject: '⏳ Deal expiring soon at {{venue_name}}',
    defaultBody: shell(`<h2 style="color:#f5a623;margin:8px 0 16px;">A deal is about to expire</h2><p>The deal <strong>{{deal_text}}</strong> at {{venue_name}} expires on {{expires_at}}.</p>`),
  },
];

// Convenience map by template name.
export const EMAIL_CATALOG_BY_NAME = Object.fromEntries(EMAIL_CATALOG.map((e) => [e.name, e]));