import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { createResend } from '../../shared/resendClient.ts';

// Generate a 6-digit OTP
function generateOTP() {
    const n = crypto.getRandomValues(new Uint32Array(1))[0] % 900000;
    return (100000 + n).toString();
}

const MAX_OTP_ATTEMPTS = 5;

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (user.role !== 'admin') {
            await base44.asServiceRole.entities.ActivityLog.create({
                venue_id: 'system',
                user_id: user.id,
                user_name: user.full_name,
                action: 'admin_breach_attempt',
                description: `Non-admin user ${user.email} attempted to access admin portal`,
                changes: { role: user.role, email: user.email }
            }).catch(() => {});
            return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
        }

        const body = await req.json();
        const { action } = body;

        if (action === 'send_otp') {
            // Generate OTP, store it with expiry, send via email
            const otp = generateOTP();
            const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 min

            await base44.auth.updateMe({
                admin_otp: otp,
                admin_otp_expires_at: expiresAt,
                admin_otp_attempts: 0
            });

            // Send OTP email via Resend
            const resend = createResend(Deno.env.get('RESEND_API_KEY'));
            const { error: sendError } = await resend.emails.send({
                from: 'Happy Hour Flower <happy@updates.happyhourflower.com>',
                to: [user.email],
                subject: 'Admin Portal - Your verification code',
                text: `Your Happy Hour Flower admin verification code is: ${otp}\n\nThis code expires in 10 minutes.\n\nIf you did not request this, please ignore this email.`,
                html: `<p>Your Happy Hour Flower admin verification code is:</p><h1 style="font-size:36px;letter-spacing:8px;font-family:monospace;">${otp}</h1><p>This code expires in 10 minutes.</p><p>If you did not request this, please ignore this email.</p>`,
            });

            if (sendError) {
                return Response.json({ error: 'Failed to send OTP email: ' + sendError.message }, { status: 500 });
            }

            return Response.json({ success: true, message: 'OTP sent to ' + user.email });

        } else if (action === 'verify_otp') {
            const { otp } = body;
            
            if (!otp) {
                return Response.json({ error: 'OTP is required' }, { status: 400 });
            }

            const storedOtp = user.admin_otp;
            const expiresAt = user.admin_otp_expires_at;

            if (!storedOtp || !expiresAt) {
                return Response.json({ error: 'No OTP found. Please request a new code.' }, { status: 400 });
            }

            if (new Date() > new Date(expiresAt)) {
                return Response.json({ error: 'OTP has expired. Please request a new code.' }, { status: 400 });
            }

            if (String(otp).trim() !== storedOtp) {
                // Burn the code after too many wrong guesses so it can't be brute-forced.
                const attempts = (Number(user.admin_otp_attempts) || 0) + 1;
                if (attempts >= MAX_OTP_ATTEMPTS) {
                    await base44.auth.updateMe({ admin_otp: null, admin_otp_expires_at: null, admin_otp_attempts: 0 });
                    return Response.json({ error: 'Too many incorrect attempts. Please request a new code.' }, { status: 429 });
                }
                await base44.auth.updateMe({ admin_otp_attempts: attempts });
                return Response.json({ error: 'Invalid verification code.' }, { status: 400 });
            }

            // Clear OTP and mark session verified
            await base44.auth.updateMe({
                admin_otp: null,
                admin_otp_expires_at: null,
                admin_otp_attempts: 0,
                admin_verified: true,
                admin_verified_at: new Date().toISOString()
            });

            return Response.json({ success: true, message: 'Admin authentication verified' });
        }

        return Response.json({ error: 'Invalid action' }, { status: 400 });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});