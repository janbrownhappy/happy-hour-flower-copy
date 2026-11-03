import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { createResend } from '../../shared/resendClient.ts';
import { renderEmailTemplate } from '../../shared/renderEmailTemplate.ts';

const FROM = 'Happy Hour Flower <happy@updates.happyhourflower.com>';
const REPLY_TO = 'jan.brown@happyhourflower.com';

// Plain-text fallback derived from the HTML (improves spam scoring).
const toText = (html: string) => html
  .replace(/<(style|script|head)[\s\S]*?<\/\1>/gi, '')
  .replace(/<a [^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, '$2 ($1)')
  .replace(/<br\s*\/?>/gi, '\n')
  .replace(/<\/(p|div|h[1-6]|li|tr|table)>/gi, '\n')
  .replace(/<[^>]+>/g, '')
  .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;|&rsquo;/g, "'").replace(/&quot;/g, '"')
  .replace(/[ \t]+/g, ' ')
  .replace(/\n\s*\n\s*\n+/g, '\n\n')
  .trim();

const notesBlock = (notes, label, color, bg, textColor) =>
  notes
    ? `<div style="margin:20px 0;padding:12px 16px;background:${bg};border-left:3px solid ${color};border-radius:4px;"><p style="margin:0;color:${textColor};font-size:14px;"><strong>${label}:</strong> ${notes}</p></div>`
    : '';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    // The app owner's stored role is locked by the platform and can't be 'admin',
    // so allow the configured admin email through as well.
    const ownerEmail = (Deno.env.get('ADMIN_EMAIL') || '').toLowerCase();
    const isAdmin = user?.role === 'admin' || (!!ownerEmail && user?.email?.toLowerCase() === ownerEmail);
    if (!isAdmin) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { claimId, action, admin_notes } = await req.json();
    if (!claimId || !action) {
      return Response.json({ error: 'Missing claimId or action' }, { status: 400 });
    }

    const resend = createResend(Deno.env.get('RESEND_API_KEY'));
    const claim = await base44.asServiceRole.entities.VenueClaimRequest.get(claimId);
    if (!claim) {
      return Response.json({ error: 'Claim not found' }, { status: 404 });
    }

    const now = new Date().toISOString();

    if (action === 'approve') {
      // 1. Update claim status
      await base44.asServiceRole.entities.VenueClaimRequest.update(claimId, {
        status: 'approved',
        admin_notes: admin_notes || '',
        reviewed_by: user.id,
        reviewed_at: now,
      });

      // "Add a business" requests have no venue yet — create one from the proposed
      // details so the approved business actually appears in the venue list.
      if (!claim.venue_id && claim.request_type === 'add') {
        // Link the proposed category (e.g. "Food Truck") to its venue type so filters find it.
        const types = claim.proposed_category
          ? await base44.asServiceRole.entities.VenueType.filter({ name: claim.proposed_category })
          : [];
        const typeIds = types.map((t) => t.id);
        const newVenue = await base44.asServiceRole.entities.Venue.create({
          name: claim.venue_name,
          address: claim.proposed_address || '',
          city: claim.proposed_city || '',
          category: claim.proposed_category || '',
          phone: claim.proposed_phone || '',
          status: 'active',
          verification_status: 'verified',
          venue_type_ids: typeIds,
          subscription_tier: 'free',
          ...(claim.user_id ? { owner_id: claim.user_id } : {}),
        });
        claim.venue_id = newVenue.id;
        await base44.asServiceRole.entities.VenueClaimRequest.update(claimId, { venue_id: newVenue.id });
      }

      // Portal submissions come in without a linked user account (anonymous) and,
      // for "add" requests, without an existing venue. Only run the venue-linking
      // steps when we actually have both a venue and a claimant user to link.
      if (claim.venue_id && claim.user_id) {
        // 2. Update venue: set owner_id and verification_status
        await base44.asServiceRole.entities.Venue.update(claim.venue_id, {
          owner_id: claim.user_id,
          status: 'active',
          verification_status: 'verified',
        });

        // 3. Add VenueCollaborator record as owner
        const existingCollabs = await base44.asServiceRole.entities.VenueCollaborator.filter({
          venue_id: claim.venue_id,
          user_id: claim.user_id,
        });
        if (existingCollabs.length === 0) {
          await base44.asServiceRole.entities.VenueCollaborator.create({
            venue_id: claim.venue_id,
            user_id: claim.user_id,
            role: 'owner',
          });
        }

        // 4. Update user role to venue_owner if not already admin
        const claimantUser = await base44.asServiceRole.entities.User.get(claim.user_id).catch(() => null);
        if (claimantUser && claimantUser.role !== 'admin') {
          await base44.asServiceRole.entities.User.update(claim.user_id, { role: 'venue_owner' });
        }
      }

      // 5. Send approval email (content editable in Admin → Automatic Emails)
      const approvedEmail = await renderEmailTemplate(base44, 'claim_approved', {
        claimant_name: claim.claimant_name || 'there',
        venue_name: claim.venue_name || 'your venue',
        venue_id: claim.venue_id || '',
        admin_notes_block: notesBlock(admin_notes, 'Note from our team', '#f5a623', '#fef9f0', '#8a6900'),
      });
      if (approvedEmail) {
        const sent = await resend.emails.send({
          from: FROM,
          to: claim.claimant_email,
          subject: approvedEmail.subject,
          html: approvedEmail.html,
          text: toText(approvedEmail.html),
          replyTo: REPLY_TO,
        });
        console.log('claim_approved email result', JSON.stringify(sent));
        if (sent?.error) throw new Error(`Approval email failed: ${sent.error.message || JSON.stringify(sent.error)}`);
      } else {
        console.log('claim_approved template missing or inactive');
      }

      // 6. Log activity — only possible when a real venue is linked (ActivityLog requires venue_id).
      // "Add a business" requests have no venue yet, so there is nothing to log against.
      if (claim.venue_id) {
        await base44.asServiceRole.entities.ActivityLog.create({
          venue_id: claim.venue_id,
          user_id: user.id,
          user_name: user.full_name || user.email,
          action: 'settings_changed',
          description: `Claim approved for ${claim.claimant_name} (${claim.claimant_email})`,
        });
      }

      return Response.json({ success: true, action: 'approved' });

    } else if (action === 'reject') {
      // 1. Update claim status
      await base44.asServiceRole.entities.VenueClaimRequest.update(claimId, {
        status: 'rejected',
        admin_notes: admin_notes || '',
        reviewed_by: user.id,
        reviewed_at: now,
      });

      // 2. Reset venue verification_status back to unclaimed (only if a real venue is linked)
      if (claim.venue_id) {
        await base44.asServiceRole.entities.Venue.update(claim.venue_id, {
          verification_status: 'unclaimed',
        });
      }

      // 2. Send rejection email (content editable in Admin → Automatic Emails)
      const rejectedEmail = await renderEmailTemplate(base44, 'claim_rejected', {
        claimant_name: claim.claimant_name || 'there',
        venue_name: claim.venue_name || 'your venue',
        admin_notes_block: notesBlock(admin_notes, 'Reason', '#e53e3e', '#fff5f5', '#742a2a'),
      });
      if (rejectedEmail) {
        await resend.emails.send({
          from: FROM,
          to: claim.claimant_email,
          subject: rejectedEmail.subject,
          html: rejectedEmail.html,
          text: toText(rejectedEmail.html),
          replyTo: REPLY_TO,
        });
      }

      return Response.json({ success: true, action: 'rejected' });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});