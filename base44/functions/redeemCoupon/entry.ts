import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { buildPassBody, updatePass, voidPass } from '../../shared/walletwallet.ts';
import { canActForVenue } from '../../shared/venueAccess.ts';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins, venue_owners, and venue_staff can redeem passes
    const allowedRoles = ['admin', 'venue_owner', 'venue_staff'];
    if (!allowedRoles.includes(user.role)) {
      return Response.json({ error: 'Forbidden: Staff access required.' }, { status: 403 });
    }

    const { redemption_code } = await req.json();
    if (!redemption_code) {
      return Response.json({ error: 'redemption_code is required' }, { status: 400 });
    }

    // Find the pass instance by redemption code
    const instances = await base44.asServiceRole.entities.PassInstance.filter({
      redemption_code: redemption_code.trim()
    });

    if (instances.length === 0) {
      return Response.json({ valid: false, error: 'Invalid redemption code. Pass not found.' }, { status: 404 });
    }

    const instance = instances[0];

    // The pass must belong to a venue the caller manages or staffs.
    if (!(await canActForVenue(base44.asServiceRole, user, instance.venue_id))) {
      return Response.json({ valid: false, error: 'Invalid redemption code. Pass not found.' }, { status: 404 });
    }

    // Check if already redeemed
    if (instance.status === 'redeemed') {
      return Response.json({
        valid: false,
        error: 'This coupon has already been redeemed.',
        redeemed_at: instance.redeemed_at
      }, { status: 409 });
    }

    // Check if voided
    if (instance.status === 'voided') {
      return Response.json({ valid: false, error: 'This coupon has been voided.' }, { status: 410 });
    }

    // Check expiration
    if (instance.expires_at) {
      const now = new Date();
      const expires = new Date(instance.expires_at);
      if (now > expires) {
        // Mark as expired if not already
        await base44.asServiceRole.entities.PassInstance.update(instance.id, { status: 'expired' });
        return Response.json({ valid: false, error: 'This coupon has expired.' }, { status: 410 });
      }
    }

    const now = new Date().toISOString();

    // Loyalty cards: each scan adds a stamp; hitting the target earns the reward and resets the card
    if (instance.pass_type === 'loyalty_card') {
      const max = instance.loyalty_max_points || 10;
      const next = (instance.loyalty_points || 0) + 1;
      const rewardEarned = next >= max;
      const points = rewardEarned ? 0 : next;
      await base44.asServiceRole.entities.PassInstance.update(instance.id, { loyalty_points: points });
      const venue = await base44.asServiceRole.entities.Venue.get(instance.venue_id).catch(() => null);
      await base44.asServiceRole.entities.LoyaltyStamp.create({
        pass_instance_id: instance.id,
        wallet_pass_id: instance.wallet_pass_id,
        venue_id: instance.venue_id,
        owner_id: venue?.owner_id || '',
        consumer_name: instance.consumer_name,
        stamped_by_user_id: user.id,
        points_after: points,
        reward_earned: rewardEarned,
        stamped_at: now,
      });
      const tpl = await base44.asServiceRole.entities.WalletPass.get(instance.wallet_pass_id).catch(() => null);
      if (tpl && rewardEarned) await base44.asServiceRole.entities.WalletPass.update(tpl.id, { total_redeemed: (tpl.total_redeemed || 0) + 1 });
      // Live-update the card on the customer's phone
      if (tpl && instance.passkit_id) {
        await updatePass(instance.passkit_id, buildPassBody(tpl, { ...instance, loyalty_points: points })).catch(() => {});
      }
      return Response.json({
        valid: true,
        stamp: true,
        reward_earned: rewardEarned,
        loyalty_points: rewardEarned ? max : points,
        loyalty_max_points: max,
        message: rewardEarned ? 'Reward earned! Give the reward — card reset to 0.' : `Stamp added: ${points} of ${max}`,
        consumer_name: instance.consumer_name,
        redeemed_at: now,
      });
    }

    // Mark as redeemed
    await base44.asServiceRole.entities.PassInstance.update(instance.id, {
      status: 'redeemed',
      redeemed_at: now,
      redeemed_by_user_id: user.id
    });

    // Increment redeemed count on the template
    const template = await base44.asServiceRole.entities.WalletPass.filter({ id: instance.wallet_pass_id });
    if (template.length > 0) {
      const t = template[0];
      await base44.asServiceRole.entities.WalletPass.update(t.id, {
        total_redeemed: (t.total_redeemed || 0) + 1
      });
      // Void the pass on the customer's phone so it can't be reused (works on the free plan)
      if (instance.passkit_id) {
        await voidPass(instance.passkit_id).catch(() => {});
      }
    }

    return Response.json({
      valid: true,
      message: 'Coupon successfully redeemed!',
      consumer_name: instance.consumer_name,
      consumer_email: instance.consumer_email,
      redeemed_at: now
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});