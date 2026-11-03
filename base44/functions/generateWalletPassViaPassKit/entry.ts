import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { buildPassBody, createPass } from '../../shared/walletwallet.ts';

// Issues this customer's Apple + Google Wallet pass through WalletWallet.
// (Name kept so existing screens keep working; PassKit is no longer used.)
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { passInstanceId } = await req.json();
    if (!passInstanceId) return Response.json({ error: 'passInstanceId required' }, { status: 400 });

    const inst = await base44.asServiceRole.entities.PassInstance.get(passInstanceId);
    if (!inst) return Response.json({ error: 'Pass instance not found' }, { status: 404 });

    // Only the customer, whoever issued it, or an admin
    if (user.role !== 'admin' && inst.consumer_user_id !== user.id && inst.created_by_id !== user.id) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (inst.apple_pass_url && inst.passkit_id) {
      return Response.json({ success: true, pass_url: inst.apple_pass_url, serial_number: inst.serial_number });
    }

    const tpl = await base44.asServiceRole.entities.WalletPass.get(inst.wallet_pass_id);
    if (!tpl) return Response.json({ error: 'Wallet pass template not found' }, { status: 404 });

    const res = await createPass(buildPassBody(tpl, inst));
    await base44.asServiceRole.entities.PassInstance.update(inst.id, {
      apple_pass_url: (res.shareUrl = (res.shareUrl || '').replace('https://pass.walletwallet.dev', 'https://passes.happyhourflower.com')),
      passkit_id: res.serialNumber, // WalletWallet serial, used for live updates
    });

    return Response.json({ success: true, pass_url: res.shareUrl, google_save_url: res.googleSaveUrl, serial_number: inst.serial_number });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
});