import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { createResend } from '../../shared/resendClient.ts';

// Proof-of-authorization for venue claims.
// - request (admin): emails the claimant a private upload link.
// - info / upload (public): gated by the claim's random proof_token.
const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED = /^(application\/pdf|image\/(png|jpe?g|webp|gif|heic|heif))$/i;

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const svc = base44.asServiceRole;
    const { action, claimId, token, fileName, contentType, base64 } = await req.json();
    if (!claimId) return Response.json({ error: 'claimId required' }, { status: 400 });
    const claim = await svc.entities.VenueClaimRequest.get(claimId).catch(() => null);
    if (!claim) return Response.json({ error: 'Claim not found' }, { status: 404 });
    const resend = createResend(Deno.env.get('RESEND_API_KEY'));

    if (action === 'request') {
      const user = await base44.auth.me().catch(() => null);
      const ownerEmails = ['jan.brown@happyhourflower.com', (Deno.env.get('ADMIN_EMAIL') || '').toLowerCase()];
      const isAdmin = user && (user.role === 'admin' || ownerEmails.includes(String(user.email || '').toLowerCase()));
      if (!isAdmin) return Response.json({ error: 'Forbidden' }, { status: 403 });
      const t = crypto.randomUUID();
      await svc.entities.VenueClaimRequest.update(claimId, { proof_token: t, proof_requested_at: new Date().toISOString() });
      const link = `https://happyhourflower.com/portal/proof/${claimId}?t=${t}`;
      const { error } = await resend.emails.send({
        to: claim.claimant_email,
        subject: `Please verify your claim for ${claim.venue_name}`,
        html: `<div style="background:#fef3c7;padding:16px 24px;max-width:560px;margin:auto;font-family:Georgia,serif;">
  <img src="https://media.base44.com/images/public/6a1f45eb9cf7513caebbab49/65d765106_HappyHourFlowerLogo.png" alt="Happy Hour Flower" width="40" height="40" style="width:40px;height:40px;max-width:40px;border-radius:50%;display:inline-block;vertical-align:middle;border:0;" />
  <span style="color:#000;font-weight:bold;font-size:18px;vertical-align:middle;margin-left:8px;">Happy Hour Flower</span>
</div>
<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:24px;color:#111827;background:#fff;">
  <h2 style="font-family:Georgia,serif;margin:0 0 8px;">One more step to claim ${claim.venue_name}</h2>
  <p style="color:#6b7280;margin:0 0 16px;">Hi ${claim.claimant_name || 'there'}, before we approve your claim we need proof that you represent this business.</p>
  <p>Please upload one of the following: a business license, a utility bill or lease in the business name, a liquor license, or a signed letter from the owner on company letterhead.</p>
  <p style="text-align:center;margin:28px 0;"><a href="${link}" style="background:#f59e0b;color:#000;padding:14px 28px;text-decoration:none;font-weight:bold;">Upload proof</a></p>
  <p style="font-size:13px;color:#6b7280;">Your document is stored privately and only seen by our review team.</p>
</div>`,
      });
      if (error) return Response.json({ error: error.message }, { status: 500 });
      return Response.json({ success: true });
    }

    // Public actions: require the exact token.
    if (!token || !claim.proof_token || token !== claim.proof_token) {
      return Response.json({ error: 'This link is invalid or has already been used.' }, { status: 403 });
    }

    if (action === 'info') {
      return Response.json({ venue_name: claim.venue_name, claimant_name: claim.claimant_name });
    }

    if (action === 'upload') {
      if (!base64 || !ALLOWED.test(contentType || '')) {
        return Response.json({ error: 'Please upload a PDF or image file.' }, { status: 400 });
      }
      const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
      if (bytes.length > MAX_BYTES) return Response.json({ error: 'File must be under 10MB.' }, { status: 400 });
      const file = new File([bytes], String(fileName || 'proof').slice(0, 120), { type: contentType });
      const { file_uri } = await svc.integrations.Core.UploadPrivateFile({ file });
      await svc.entities.VenueClaimRequest.update(claimId, { proof_url: file_uri, proof_token: null });
      await resend.emails.send({
        to: claim.claimant_email,
        subject: `We received your proof for ${claim.venue_name}`,
        html: `<div style="background:#fef3c7;padding:16px 24px;max-width:560px;margin:auto;font-family:Georgia,serif;">
  <img src="https://media.base44.com/images/public/6a1f45eb9cf7513caebbab49/65d765106_HappyHourFlowerLogo.png" alt="Happy Hour Flower" width="40" height="40" style="width:40px;height:40px;max-width:40px;border-radius:50%;display:inline-block;vertical-align:middle;border:0;" />
  <span style="color:#000;font-weight:bold;font-size:18px;vertical-align:middle;margin-left:8px;">Happy Hour Flower</span>
</div>
<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:24px;color:#111827;background:#fff;">
  <h2 style="font-family:Georgia,serif;margin:0 0 8px;">Thanks, your proof is in</h2>
  <p style="color:#6b7280;margin:0 0 16px;">Hi ${claim.claimant_name || 'there'}, we received your proof of authorization for <strong>${claim.venue_name}</strong>.</p>
  <p>Your claim is now under review. We will email you with a decision within 24 hours.</p>
  <p style="font-size:13px;color:#6b7280;">Questions? Just reply to this email.</p>
</div>`,
      }).catch(() => {});
      const adminEmail = Deno.env.get('ADMIN_EMAIL');
      if (adminEmail) {
        await resend.emails.send({
          to: adminEmail,
          subject: `Proof received for ${claim.venue_name}`,
          html: `<p>${claim.claimant_name} (${claim.claimant_email}) uploaded proof for their claim on <strong>${claim.venue_name}</strong>.</p><p><a href="https://happyhourflower.com/admin">Review it in the admin claims queue</a></p>`,
        }).catch(() => {});
      }
      return Response.json({ success: true });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}