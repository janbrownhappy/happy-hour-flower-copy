import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import Stripe from 'npm:stripe@17.5.0';
import { trustedCollaborators } from '../../shared/venueAccess.ts';

// Returns the Stripe billing history (paid invoices) for a single venue.
// Charges are matched to the venue via the `venue_id` we store in each
// subscription's metadata at checkout (see createStripeCheckout).
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { venueId } = await req.json();
    if (!venueId) return Response.json({ error: 'venueId is required' }, { status: 400 });

    // Authorize: only the venue owner, an owner/editor collaborator, or an admin
    // may view billing for this venue.
    const venue = await base44.entities.Venue.get(venueId).catch(() => null);
    if (!venue) return Response.json({ error: 'Venue not found' }, { status: 404 });

    let allowed = user.role === 'admin' || venue.owner_id === user.id;
    if (!allowed) {
      const collabs = await trustedCollaborators(base44.asServiceRole, venue, { user_id: user.id });
      allowed = collabs.some(c => c.role === 'owner' || c.role === 'editor');
    }
    if (!allowed) {
      return Response.json({ error: 'You do not have permission to view billing for this venue' }, { status: 403 });
    }

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'), { apiVersion: '2024-12-18.acacia' });

    // Find subscriptions that belong to this venue. We look them up via the
    // customer's email, then keep only subscriptions whose metadata.venue_id
    // matches — so a multi-venue owner only sees this venue's charges.
    const subscriptionIds = new Set();
    // Resolve the owner's email to scope the customer search.
    let ownerEmail = user.email;
    if (venue.owner_id && venue.owner_id !== user.id) {
      const owners = await base44.asServiceRole.entities.User.filter({ id: venue.owner_id }).catch(() => []);
      if (owners[0]?.email) ownerEmail = owners[0].email;
    }

    const customerList = await stripe.customers.list({ email: ownerEmail, limit: 100 });
    const charges = [];

    for (const customer of customerList.data) {
      // Pull this customer's subscriptions and keep only ones for this venue.
      const subs = await stripe.subscriptions.list({ customer: customer.id, status: 'all', limit: 100 });
      for (const sub of subs.data) {
        if (sub.metadata?.venue_id === String(venueId)) subscriptionIds.add(sub.id);
      }

      // Page through the customer's invoices.
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
          // Match by subscription metadata for this venue. (subscriptionIds is
          // populated above; invoices without a matching sub are skipped.)
          if (!invSubId || !subscriptionIds.has(invSubId)) continue;
          if (inv.amount_paid <= 0 && inv.status !== 'paid') continue;
          charges.push({
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
          });
        }
        hasMore = page.has_more;
        if (hasMore) startingAfter = page.data[page.data.length - 1].id;
      }
    }

    // Newest first.
    charges.sort((a, b) => new Date(b.date) - new Date(a.date));

    const totalPaid = charges.reduce((sum, c) => sum + (c.status === 'paid' ? c.amount : 0), 0);

    return Response.json({
      venue_id: String(venueId),
      tier: venue.subscription_tier || 'free',
      charges,
      total_paid: Math.round(totalPaid * 100) / 100,
      currency: charges[0]?.currency || 'USD',
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});