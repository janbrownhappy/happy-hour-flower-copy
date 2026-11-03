import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { createResend } from '../../shared/resendClient.ts';

const EMAIL_TEMPLATE = `
<!DOCTYPE html>
<html>
<body style="font-family:'Nunito',sans-serif;background:#f8f4ef;padding:32px;color:#1a1a1a;">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:16px;padding:32px;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
    <div style="text-align:center;margin-bottom:24px;">
      <img src="https://media.base44.com/images/public/6a1f45eb9cf7513caebbab49/c16180f90_Untitled1024x1024px512x512px256x256px.gif" alt="Happy Hour Flower" style="width:64px;height:64px;border-radius:50%;" />
    </div>
    <h2 style="color:#f5a623;margin-bottom:16px;">🌸 Keep Your Happy Hours Fresh!</h2>
    <p style="color:#666;margin-bottom:16px;">Hi {{owner_name}},</p>
    <p style="color:#666;margin-bottom:16px;">It's time to refresh your venue's happy hour details! Keeping your information up-to-date helps attract more customers and ensures they have the best experience.</p>
    
    <div style="background:#fef9f0;border-left:3px solid #f5a623;padding:16px;border-radius:4px;margin:20px 0;">
      <h3 style="color:#f5a623;margin:0 0 12px 0;font-size:16px;">Quick Updates to Consider:</h3>
      <ul style="color:#666;line-height:2;margin:0;padding-left:20px;">
        <li>✅ Review your <strong>happy hour schedule</strong> and times</li>
        <li>✅ Update your <strong>current deals and specials</strong></li>
        <li>✅ Add fresh <strong>photos</strong> of your venue</li>
        <li>✅ Post upcoming <strong>events</strong> for the month</li>
        <li>✅ Check your <strong>venue information</strong> (address, phone, description)</li>
      </ul>
    </div>
    
    <div style="text-align:center;margin:28px 0;">
      <a href="https://happyhourflower.com/venue-owner" style="display:inline-block;background:#f5a623;color:#ffffff;padding:14px 32px;text-decoration:none;border-radius:8px;font-weight:bold;font-size:16px;">Go to Owner Dashboard</a>
    </div>
    
    <p style="color:#666;margin-top:20px;">Venues with updated happy hours see <strong>3x more engagement</strong> from our community!</p>
    
    <hr style="margin:32px 0;border:none;border-top:1px solid #eee;" />
    <p style="font-size:12px;color:#aaa;text-align:center;">Happy Hour Flower · Greenville, SC</p>
  </div>
</body>
</html>
`;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verify admin user (this is a scheduled task)
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get all venues with owners
    const venues = await base44.asServiceRole.entities.Venue.filter({
      owner_id: { $exists: true },
      status: 'active',
    });

    // Group by owner to avoid duplicate emails
    const ownersByEmail = {};
    venues.forEach(venue => {
      if (!venue.owner_id) return;
      ownersByEmail[venue.owner_id] = ownersByEmail[venue.owner_id] || [];
      ownersByEmail[venue.owner_id].push(venue);
    });

    let sentCount = 0;
    let failedCount = 0;

    // Send email to each owner
    for (const [ownerId, ownerVenues] of Object.entries(ownersByEmail)) {
      try {
        // Get owner user details
        const owner = await base44.asServiceRole.entities.User.get(ownerId);
        if (!owner || !owner.email) continue;

        // Get venue names for personalization
        const venueNames = ownerVenues.map(v => v.name).join(', ');
        
        // Personalize email template
        const personalizedEmail = EMAIL_TEMPLATE
          .replace('{{owner_name}}', owner.full_name || owner.email.split('@')[0])
          .replace('{{venue_names}}', venueNames);

        const resend = createResend(Deno.env.get('RESEND_API_KEY'));
        const { error: sendError } = await resend.emails.send({
          from: 'Happy Hour Flower <happy@updates.happyhourflower.com>',
          to: [owner.email],
          subject: `🌸 Time to Update Your Happy Hour at ${ownerVenues.length > 1 ? 'Your Venues' : ownerVenues[0].name}`,
          html: personalizedEmail,
        });
        if (sendError) throw new Error(sendError.message);

        sentCount++;
      } catch (error) {
        console.error(`Failed to send email to owner ${ownerId}:`, error.message);
        failedCount++;
      }
    }

    return Response.json({ 
      success: true, 
      sent: sentCount, 
      failed: failedCount,
      total_owners: Object.keys(ownersByEmail).length 
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});