import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import Stripe from 'npm:stripe@17.5.0';

// Returns the Stripe billing history across ALL venues owned by the current user,
// grouped per venue. Charges are matched to a venue via the `venue_id` stored in
// each subscription's metadata at checkout (see createStripeCheckout).
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // All venues this user owns.
    const venues = await base44.entities.Venue.filter({ owner_id: user.id }).catch(() => []);
    const venueNameById = {};
    for (const v of venues) venueNameById[String(v.id)] = v.name;

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'), { apiVersion: '2024-12-18.acacia' });

    // Map subscription id -> venue id (from subscription metadata).
    const subToVenue = {};
    // Charges grouped by venue id.
    const byVenue = {};

    const customerList = await stripe.customers.list({ email: user.email, limit: 100 });

    for (const customer of customerList.data) {
      const subs = await stripe.subscriptions.list({ customer: customer.id, status: 'all', limit: 100 });
      for (const sub of subs.data) {
        if (sub.metadata?.venue_id) subToVenue[sub.id] = String(sub.metadata.venue_id);
      }

      let hasMore = true;
      let startingAfter;
      while (hasMore) {
        const page = await stripe.invoices.list({
          customer: customer.id,
          limit: 100,
          ...(startingAfter ? { starting_after: startingAfter } : {}),
        });
        for (const inv of page.data) {
          const invSubId = typeof inv.subscription === 'string' ? inv.subscription : inv.subscription?.id;
          const venueId = invSubId ? subToVenue[invSubId] : null;
          if (!venueId) continue;
          if (inv.amount_paid <= 0 && inv.status !== 'paid') continue;
          const charge = {
            id: inv.id,
            number: inv.number,
            amount: (inv.amount_paid || inv.amount_due || 0) / 100,
            currency: (inv.currency || 'usd').toUpperCase(),
            status: inv.status,
            date: inv.created ? new Date(inv.created * 1000).toISOString() : null,
            description: inv.lines?.data?.[0]?.description || 'Subscription',
            invoice_url: inv.hosted_invoice_url || null,
            pdf_url: inv.invoice_pdf || null,
            transaction_id: typeof inv.charge === 'string' ? inv.charge : (inv.charge?.id || null),
          };
          if (!byVenue[venueId]) byVenue[venueId] = [];
          byVenue[venueId].push(charge);
        }
        hasMore = page.has_more;
        if (hasMore) startingAfter = page.data[page.data.length - 1].id;
      }
    }

    // Build per-venue summaries (only venues that have charges).
    const venuesOut = Object.entries(byVenue).map(([venueId, charges]) => {
      charges.sort((a, b) => new Date(b.date) - new Date(a.date));
      const totalPaid = charges.reduce((s, c) => s + (c.status === 'paid' ? c.amount : 0), 0);
      return {
        venue_id: venueId,
        venue_name: venueNameById[venueId] || 'Unknown venue',
        charges,
        total_paid: Math.round(totalPaid * 100) / 100,
        currency: charges[0]?.currency || 'USD',
      };
    });

    venuesOut.sort((a, b) => b.total_paid - a.total_paid);

    const grandTotal = venuesOut.reduce((s, v) => s + v.total_paid, 0);

    return Response.json({
      venues: venuesOut,
      grand_total: Math.round(grandTotal * 100) / 100,
      currency: venuesOut[0]?.currency || 'USD',
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});