import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { secrets } from 'base44:runtime';

// Fixed demo identities used for Apple / Google app review.
const DEMO_USER_EMAIL = 'jan.brown+user@happyhourflower.com';
const DEMO_VENUE_EMAIL = 'jan.brown+venue@happyhourflower.com';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const admin = await base44.auth.me();
    if (!admin || admin.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const svc = base44.asServiceRole;
    const results = { user: {}, venue: {} };

    // --- 1. Ensure both demo users exist (invite if missing) ---
    const allUsers = await svc.entities.User.list();
    const findUser = (email) => allUsers.find(u => (u.email || '').toLowerCase() === email.toLowerCase());

    let demoUser = findUser(DEMO_USER_EMAIL);
    if (!demoUser) {
      try {
        await base44.users.inviteUser(DEMO_USER_EMAIL, 'user');
        results.user.invited = true;
      } catch (e) {
        results.user.inviteError = e.message;
      }
    } else {
      results.user.alreadyExisted = true;
    }

    let demoVenueOwner = findUser(DEMO_VENUE_EMAIL);
    if (!demoVenueOwner) {
      try {
        await base44.users.inviteUser(DEMO_VENUE_EMAIL, 'user');
        results.venue.invited = true;
      } catch (e) {
        results.venue.inviteError = e.message;
      }
    } else {
      results.venue.alreadyExisted = true;
    }

    // Re-fetch users so we can pick up any freshly invited records
    const refreshedUsers = await svc.entities.User.list();
    demoUser = refreshedUsers.find(u => (u.email || '').toLowerCase() === DEMO_USER_EMAIL.toLowerCase());
    demoVenueOwner = refreshedUsers.find(u => (u.email || '').toLowerCase() === DEMO_VENUE_EMAIL.toLowerCase());

    // --- 2. Configure the demo CONSUMER profile (premium + filled out) ---
    if (demoUser) {
      const existingProfiles = await svc.entities.Profile.filter({ created_by_id: demoUser.id });
      const profileData = {
        email: DEMO_USER_EMAIL,
        display_name: 'Demo Reviewer',
        zip_code: '29601',
        date_of_birth: '1990-01-01',
        is_premium: true,
        subscription_tier: 'premium',
        subscription_status: 'active',
        location_preferences: { state: 'SC', city: 'Greenville', zip_code: '29601', last_updated: new Date().toISOString() },
      };
      if (existingProfiles.length > 0) {
        await svc.entities.Profile.update(existingProfiles[0].id, profileData);
        results.user.profile = 'updated';
      } else {
        await svc.entities.Profile.create({ ...profileData, created_by_id: demoUser.id });
        results.user.profile = 'created';
      }
    }

    // --- 3. Configure the demo VENUE OWNER (role + premium profile) ---
    if (demoVenueOwner) {
      if (demoVenueOwner.role !== 'admin') {
        try {
          await svc.entities.User.update(demoVenueOwner.id, { role: 'venue_owner' });
          results.venue.role = 'venue_owner';
        } catch (e) {
          results.venue.roleError = e.message;
        }
      }

      const ownerProfiles = await svc.entities.Profile.filter({ created_by_id: demoVenueOwner.id });
      const ownerProfileData = {
        email: DEMO_VENUE_EMAIL,
        display_name: 'Demo Venue Owner',
        zip_code: '29601',
        date_of_birth: '1990-01-01',
        is_premium: true,
        subscription_tier: 'platinum',
        subscription_status: 'active',
      };
      if (ownerProfiles.length > 0) {
        await svc.entities.Profile.update(ownerProfiles[0].id, ownerProfileData);
      } else {
        await svc.entities.Profile.create({ ...ownerProfileData, created_by_id: demoVenueOwner.id });
      }

      // --- 4. Ensure a demo venue exists and is owned by the demo venue owner ---
      const allVenues = await svc.entities.Venue.list();
      let demoVenue = allVenues.find(v => v.slug === 'demo-venue-review');
      const venueData = {
        slug: 'demo-venue-review',
        name: 'Demo Tap House (Review)',
        address: '101 Main St',
        city: 'Greenville',
        zip_code: '29601',
        neighborhood: 'GVL-01 Downtown / Main Street',
        category: 'Bar & Grill',
        price_level: 2,
        phone: '(864) 555-0100',
        website: 'https://happyhourflower.com',
        reservation_policy: 'accepted',
        happy_hour_start: '16:00',
        happy_hour_end: '18:00',
        days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        deals: ['$5 House Wines', '$1 Off All Drafts', 'Half-Price Appetizers'],
        photo_urls: ['https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=1200'],
        rating: 4.6,
        review_count: 24,
        tags: ['Happy Hour', 'Craft Beer', 'Patio'],
        status: 'active',
        verification_status: 'verified',
        subscription_tier: 'platinum',
        owner_id: demoVenueOwner.id,
        description: 'A demo venue pre-configured for app store review. Showcases happy hour hours, deals, and owner features.',
      };
      if (demoVenue) {
        await svc.entities.Venue.update(demoVenue.id, venueData);
        results.venue.venue = 'updated';
      } else {
        demoVenue = await svc.entities.Venue.create(venueData);
        results.venue.venue = 'created';
      }
      results.venue.venueId = demoVenue.id;
    }

    const summary = `consumer: ${results.user.inviteError || results.user.profile || (results.user.invited ? 'invited' : 'pending')}; venue owner: ${results.venue.inviteError || results.venue.roleError || results.venue.venue || (results.venue.invited ? 'invited' : 'pending')}`;
    await svc.functions.invoke('notifySlack', { category: 'accounts', event: 'demo_setup', data: { summary }, internal_key: secrets.get('HHF_WEBHOOK_KEY') }).catch(() => {});

    return Response.json({
      success: true,
      credentials: {
        consumer: { email: DEMO_USER_EMAIL },
        venueOwner: { email: DEMO_VENUE_EMAIL },
      },
      results,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});