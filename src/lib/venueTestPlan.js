export const DEMO_VENUE = { email: 'jan.brown+venue@happyhourflower.com', password: 'HHFlower-Review-2026!' };

export const VENUE_PREREQS = [
  'The demo account above owns a demo venue, "Demo Tap House (Review)", with hours, deals and photos already filled in.',
  'Platinum tier is enabled on the demo venue, so all owner features are available without a purchase.',
  'To test a purchase, register a new venue owner account (it starts on the free plan) and buy with your sandbox tester.',
  'Changes you make to the demo venue are safe to save. They only affect the demo listing.',
  'Wallet passes and push alerts depend on device settings and may not appear on every review device.',
];

export const VENUE_SECTIONS = [
  { id: 'v-login', title: 'Sign in', steps: [
    ['Open the app, tap Sign In and log in with the venue owner account.', 'You land on the Venue Owner dashboard showing "Demo Tap House (Review)".'],
  ]},
  { id: 'v-profile', title: 'Edit venue', steps: [
    ['Open the venue and edit its description or phone number, then save.', 'A confirmation appears and the change is shown right away.'],
    ['Review the venue photos.', 'The demo venue shows its existing photos.'],
  ]},
  { id: 'v-hours', title: 'Hours & deals', steps: [
    ['Open the hours and deals editor and change the happy hour time for one day.', 'The new time is saved for that day.'],
    ['Add a new deal (for example "$5 drafts") and save.', 'The deal appears in the list for that day.'],
    ['Open the venue as a customer would (view listing).', 'The updated hours and deal show on the public venue page.'],
  ]},
  { id: 'v-passes', title: 'Wallet passes', steps: [
    ['Open Wallet Passes and look at the coupon or loyalty card designs.', 'Existing pass designs are listed with their status.'],
    ['Create or edit a coupon design and save.', 'A preview of the pass appears and the design is saved.'],
  ]},
  { id: 'v-analytics', title: 'Analytics', steps: [
    ['Open the Analytics section of the dashboard.', 'Views, favorites and other activity for the venue are shown.'],
  ]},
  { id: 'v-billing', title: 'Plan & billing', steps: [
    ['Open the plan or billing section.', 'The venue shows the Platinum plan as active.'],
  ]},
  { id: 'v-account', title: 'Account', steps: [
    ['Open Profile and tap Delete Account.', 'It asks for confirmation before removing data.'],
    ['Open Settings → Support & Legal.', 'Support contact, Privacy and Terms open.'],
    ['Tap Sign Out.', 'You return to the home screen signed out.'],
  ]},
];