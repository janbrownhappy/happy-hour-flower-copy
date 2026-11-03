export const DEMO_CONSUMER = { email: 'jan.brown+user@happyhourflower.com', password: 'HHFlower-Review-2026!' };

export const PREREQS = [
  'The demo account above comes with a complete profile already set up. You can also create a new account with any email you can receive a code at.',
  'Use a birth date that makes you 21 or older. The app is for adults only.',
  'Location permission is optional. If you decline it, choose an area by hand instead.',
  'Venue data covers Greenville, SC and the surrounding Upstate area. Zip 29601 works well.',
  'The demo account already has Premium, so advanced filters, custom lists and neighborhood deals work without a purchase. To test a purchase, register a new account (it starts on the free plan) and buy with your sandbox tester.',
  'Wallet passes and push alerts depend on device settings and may not appear on every review device.',
];

export const SECTIONS = [
  { id: 'onboarding', title: 'Account & age check', steps: [
    ['Open the app and tap Sign In. Log in with the demo account, or tap Sign Up to make a new one.', 'You are signed in. New accounts get a 6-digit email code to verify.'],
    ['New accounts only: enter a birth date and zip code 29601.', 'Under-21 dates are blocked. A valid date continues to the app.'],
  ]},
  { id: 'discovery', title: 'Find happy hours', steps: [
    ['Open the Explore tab.', 'A list of nearby venues with happy hour times and deals appears.'],
    ['Tap Filters and pick a day, a price level and an amenity like Patio.', 'The list updates to show only matching venues.'],
    ['Use a premium filter (for example neighborhood deals or a custom list).', 'It works without asking you to upgrade.'],
    ['Open the Map tab.', 'Venue pins appear on the map. Tapping a pin shows the venue name.'],
  ]},
  { id: 'details', title: 'Venue details', steps: [
    ['Tap any venue card.', 'The venue page shows photos, address, happy hour hours by day and deals.'],
    ['Tap the address, phone or website link.', 'Maps, the phone dialer or the browser opens.'],
  ]},
  { id: 'favorites', title: 'Favorites', steps: [
    ['On a venue page, tap the heart icon.', 'The heart fills in and a confirmation appears.'],
    ['Open the Favorites tab.', 'The saved venue is listed. Tapping the heart again removes it.'],
  ]},
  { id: 'checkin', title: 'Check-in', steps: [
    ['On a venue page, tap Check In.', 'A confirmation appears and the check-in is recorded.'],
    ['Open Profile and look at recent check-ins.', 'The venue appears in your check-in history.'],
  ]},
  { id: 'loyalty', title: 'Loyalty & passes', steps: [
    ['Open a venue that offers a coupon or loyalty card and tap to get it.', 'A pass opens in the app with a QR code. Some venues may not offer one.'],
    ['Open Profile and find My Passes.', 'Any pass you collected is listed with its status.'],
  ]},
  { id: 'profile', title: 'Profile & account', steps: [
    ['Open Profile and edit your name or zip code, then save.', 'Changes are saved and shown right away.'],
    ['Open Profile and tap Delete Account.', 'It asks for confirmation before removing data.'],
    ['Open Settings → Support & Legal.', 'Support contact, Privacy and Terms open.'],
    ['Tap Sign Out.', 'You return to the home screen signed out.'],
  ]},
];