import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { format, subWeeks, startOfWeek, endOfWeek } from 'npm:date-fns@3.6.0';
import { createResend } from '../../shared/resendClient.ts';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // This function is called by automation - use service role
    const payload = await req.json();
    const { venueId } = payload || {};
    
    // Get all premium/platinum venues
    const allVenues = await base44.asServiceRole.entities.Venue.list();
    const premiumVenues = allVenues.filter(v => 
      (v.subscription_tier === 'premium' || v.subscription_tier === 'platinum') &&
      v.status === 'active'
    );
    
    // If specific venueId provided, filter to just that venue
    const venuesToSend = venueId 
      ? premiumVenues.filter(v => v.id === venueId)
      : premiumVenues;
    
    if (venuesToSend.length === 0) {
      return Response.json({ success: true, message: 'No premium venues to send reports to' });
    }
    
    // Calculate date range for past week
    const now = new Date();
    const oneWeekAgo = subWeeks(now, 1);
    const weekStart = startOfWeek(oneWeekAgo);
    const weekEnd = endOfWeek(now);
    
    const results = [];
    
    for (const venue of venuesToSend) {
      try {
        // Get venue owner - handle case where owner_id might not exist
        if (!venue.owner_id) {
          results.push({ venueId: venue.id, success: false, error: 'No venue owner' });
          continue;
        }
        
        const allUsers = await base44.asServiceRole.entities.User.list();
        const owner = allUsers.find(u => u.id === venue.owner_id);
        if (!owner || !owner.email) {
          results.push({ venueId: venue.id, success: false, error: 'No owner email' });
          continue;
        }
        
        // Get favorites for this venue
        const allFavorites = await base44.asServiceRole.entities.Favorite.filter({ venue_id: venue.id });
        const newFavoritesThisWeek = allFavorites.filter(f => {
          const favDate = new Date(f.created_date);
          return favDate >= oneWeekAgo;
        }).length;
        
        // Get recent reviews
        const allReviews = await base44.asServiceRole.entities.Review.filter({ venue_id: venue.id });
        const approvedReviews = allReviews.filter(r => r.status === 'approved');
        const newReviewsThisWeek = approvedReviews.filter(r => {
          const reviewDate = new Date(r.created_date);
          return reviewDate >= oneWeekAgo;
        }).length;

        // --- Reputation: rolling average rating + prior-week average for delta ---
        const avgRating = approvedReviews.length > 0
          ? approvedReviews.reduce((sum, r) => sum + (Number(r.rating) || 0), 0) / approvedReviews.length
          : 0;
        const priorReviews = approvedReviews.filter(r => new Date(r.created_date) <= oneWeekAgo);
        const priorAvgRating = priorReviews.length > 0
          ? priorReviews.reduce((sum, r) => sum + (Number(r.rating) || 0), 0) / priorReviews.length
          : 0;
        const ratingDelta = priorReviews.length > 0 ? avgRating - priorAvgRating : 0;

        // --- Offer performance: lifetime view/redeem totals + top deal by redemptions ---
        const offerStats = await base44.asServiceRole.entities.OfferStat.filter({ venue_id: venue.id });
        const totalOfferViews = offerStats.reduce((sum, o) => sum + (Number(o.view_count) || 0), 0);
        const totalRedeemClicks = offerStats.reduce((sum, o) => sum + (Number(o.redeem_click_count) || 0), 0);
        const topOffer = offerStats.reduce((best, o) => {
          const clicks = Number(o.redeem_click_count) || 0;
          if (!best || clicks > (Number(best.redeem_click_count) || 0)) return o;
          return best;
        }, null);

        // --- Check-ins this week vs last week ---
        const allCheckIns = await base44.asServiceRole.entities.CheckIn.filter({ venue_id: venue.id });
        const checkInsThisWeek = allCheckIns.filter(c => new Date(c.created_date) >= oneWeekAgo).length;
        const priorWeekStart = subWeeks(oneWeekAgo, 1);
        const checkInsLastWeek = allCheckIns.filter(c => {
          const d = new Date(c.created_date);
          return d >= priorWeekStart && d < oneWeekAgo;
        }).length;
        const checkInDelta = checkInsThisWeek - checkInsLastWeek;
        
        // Get activity logs
        const activityLogs = await base44.asServiceRole.entities.ActivityLog.filter({ venue_id: venue.id }, '-created_date', 50);
        const recentUpdates = activityLogs.filter(log => {
          const logDate = new Date(log.created_date);
          return logDate >= oneWeekAgo;
        }).length;
        
        // Calculate growth metrics
        const previousWeekStart = subWeeks(weekStart, 1);
        const previousWeekEnd = subWeeks(weekEnd, 1);
        
        const previousFavorites = allFavorites.filter(f => {
          const favDate = new Date(f.created_date);
          return favDate >= previousWeekStart && favDate <= previousWeekEnd;
        }).length;
        
        const growthRate = previousFavorites > 0 
          ? ((newFavoritesThisWeek - previousFavorites) / previousFavorites * 100).toFixed(1)
          : newFavoritesThisWeek > 0 ? '100' : '0';
        
        // Generate email content
        const subject = `📊 Your Weekly Performance Report - ${venue.name}`;
        
        const body = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: 'Nunito', Arial, sans-serif; line-height: 1.6; color: #1a1a1a; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 30px; border-radius: 12px 12px 0 0; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; font-family: 'Playfair Display', Georgia, serif; }
    .header p { margin: 10px 0 0; opacity: 0.9; }
    .metrics { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin: 30px 0; }
    .metric-card { background: #f9fafb; padding: 20px; border-radius: 8px; text-align: center; border: 1px solid #e5e7eb; }
    .metric-value { font-size: 32px; font-weight: bold; color: #f59e0b; margin-bottom: 5px; }
    .metric-label { font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; }
    .metric-change { font-size: 12px; margin-top: 8px; }
    .positive { color: #10b981; }
    .negative { color: #ef4444; }
    .section { margin: 30px 0; padding: 20px; background: #f9fafb; border-radius: 8px; }
    .section h2 { font-size: 18px; color: #1a1a1a; margin: 0 0 15px; font-family: 'Playfair Display', Georgia, serif; }
    .stat-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
    .stat-row:last-child { border-bottom: none; }
    .stat-label { color: #6b7280; }
    .stat-value { font-weight: 600; color: #1a1a1a; }
    .cta-button { display: inline-block; background: #f59e0b; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; }
    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; border-top: 1px solid #e5e7eb; margin-top: 30px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🌸 Weekly Performance Report</h1>
      <p>${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}</p>
    </div>
    
    <div style="text-align: center; margin: 20px 0;">
      <h2 style="margin: 0; color: #1a1a1a;">${venue.name}</h2>
      <p style="color: #6b7280; margin: 5px 0;">${venue.address || ''}</p>
    </div>
    
    <div class="metrics">
      <div class="metric-card">
        <div class="metric-value">${venue.view_count || 0}</div>
        <div class="metric-label">Total Views</div>
        <div class="metric-change positive">↗ Lifetime</div>
      </div>
      <div class="metric-card">
        <div class="metric-value">${venue.favorite_count || 0}</div>
        <div class="metric-label">Total Saves</div>
        <div class="metric-change ${parseInt(growthRate) >= 0 ? 'positive' : 'negative'}">
          ${parseInt(growthRate) >= 0 ? '↗' : '↘'} ${growthRate}% vs last week
        </div>
      </div>
      <div class="metric-card">
        <div class="metric-value">${newFavoritesThisWeek}</div>
        <div class="metric-label">New Saves</div>
        <div class="metric-change">This week</div>
      </div>
    </div>
    
    <div class="section">
      <h2>🍹 Offer Performance</h2>
      <div class="stat-row">
        <span class="stat-label">Total Offer Views</span>
        <span class="stat-value">${totalOfferViews}</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">Total Redemption Clicks</span>
        <span class="stat-value">${totalRedeemClicks}</span>
      </div>
      ${topOffer ? `
      <div class="stat-row">
        <span class="stat-label">🏆 Top Deal (${topOffer.day || '—'})</span>
        <span class="stat-value">${(topOffer.offer_text || 'Untitled deal').replace(/</g, '&lt;')}</span>
      </div>
      <div class="stat-row">
        <span class="stat-label" style="padding-left: 16px;">↳ Views / Redemptions</span>
        <span class="stat-value">${Number(topOffer.view_count) || 0} / ${Number(topOffer.redeem_click_count) || 0}</span>
      </div>` : `
      <div class="stat-row">
        <span class="stat-label">Top Deal</span>
        <span class="stat-value" style="color: #6b7280;">No offer activity yet</span>
      </div>`}
    </div>

    <div class="section">
      <h2>📍 Check-ins This Week</h2>
      <div style="text-align: center; padding: 10px 0;">
        <div class="metric-value">${checkInsThisWeek}</div>
        <div class="metric-label">People Checked In</div>
        <div class="metric-change ${checkInDelta >= 0 ? 'positive' : 'negative'}">
          ${checkInDelta >= 0 ? '↗' : '↘'} ${checkInDelta >= 0 ? '+' : ''}${checkInDelta} vs last week
        </div>
      </div>
    </div>

    <div class="section">
      <h2>⭐ Reputation</h2>
      ${approvedReviews.length > 0 ? `
      <div class="stat-row">
        <span class="stat-label">Average Rating</span>
        <span class="stat-value">
          ${avgRating.toFixed(1)} / 5
          ${ratingDelta !== 0 ? `<span class="${ratingDelta > 0 ? 'positive' : 'negative'}" style="font-size: 12px; margin-left: 6px;">${ratingDelta > 0 ? '↗' : '↘'} ${ratingDelta > 0 ? '+' : ''}${ratingDelta.toFixed(1)}</span>` : ''}
        </span>
      </div>
      <div class="stat-row">
        <span class="stat-label">New Reviews This Week</span>
        <span class="stat-value">${newReviewsThisWeek}</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">Total Reviews</span>
        <span class="stat-value">${approvedReviews.length}</span>
      </div>` : `
      <div class="stat-row">
        <span class="stat-label">Rating</span>
        <span class="stat-value" style="color: #6b7280;">No reviews yet</span>
      </div>`}
    </div>

    <div class="section">
      <h2>📈 This Week's Highlights</h2>
      <div class="stat-row">
        <span class="stat-label">New Fan Saves</span>
        <span class="stat-value">${newFavoritesThisWeek}</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">New Reviews</span>
        <span class="stat-value">${newReviewsThisWeek}</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">Profile Updates</span>
        <span class="stat-value">${recentUpdates}</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">Growth Rate</span>
        <span class="stat-value ${parseInt(growthRate) >= 0 ? 'positive' : 'negative'}">${growthRate}%</span>
      </div>
    </div>
    
    <div class="section">
      <h2>💡 Tips to Boost Visibility</h2>
      <ul style="color: #6b7280; padding-left: 20px; margin: 0;">
        <li>Update your happy hour deals to keep them fresh</li>
        <li>Add new photos to showcase your venue</li>
        <li>Respond to customer reviews promptly</li>
        <li>Use push notifications to engage your fans</li>
        <li>Mark your venue as "Featured" for premium placement</li>
      </ul>
    </div>
    
    <div style="text-align: center;">
      <a href="${'https://happyhourflower.com/venue-dashboard/' + venue.id}" class="cta-button">
        View Full Dashboard
      </a>
    </div>
    
    <div class="footer">
      <p>Questions? Contact us at support@happyhourflower.com</p>
      <p>© ${new Date().getFullYear()} Happy Hour Flower. All rights reserved.</p>
      <p style="margin-top: 10px;">
        <a href="#" style="color: #6b7280; text-decoration: underline;">Unsubscribe</a> from weekly reports
      </p>
    </div>
  </div>
</body>
</html>
        `.trim();
        
        const resend = createResend(Deno.env.get('RESEND_API_KEY'));
        const { error: sendError } = await resend.emails.send({
          from: 'Happy Hour Flower <happy@updates.happyhourflower.com>',
          to: [owner.email],
          subject: subject,
          html: body,
        });

        if (sendError) {
          results.push({ 
            venueId: venue.id, 
            venueName: venue.name,
            ownerEmail: owner.email,
            success: false,
            error: sendError.message || 'Failed to send email',
            metrics: {
              views: venue.view_count || 0,
              favorites: venue.favorite_count || 0,
              newFavorites: newFavoritesThisWeek,
              newReviews: newReviewsThisWeek,
              growthRate
            }
          });
        } else {
          results.push({ 
            venueId: venue.id, 
            venueName: venue.name,
            ownerEmail: owner.email,
            success: true,
            metrics: {
              views: venue.view_count || 0,
              favorites: venue.favorite_count || 0,
              newFavorites: newFavoritesThisWeek,
              newReviews: newReviewsThisWeek,
              growthRate
            }
          });
        }
        
      } catch (error) {
        results.push({ venueId: venue.id, success: false, error: error.message });
      }
    }
    
    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;
    
    return Response.json({ 
      success: true, 
      message: `Sent ${successCount} reports, ${failCount} failed`,
      results
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});