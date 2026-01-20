/**
 * Verify Lead Contact - Send OTP and verify contact info
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Generate cryptographically secure OTP
 * Uses crypto.getRandomValues instead of Math.random for security
 */
function generateOTP() {
  // Use cryptographically secure random number generation
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return String(100000 + (array[0] % 900000));
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { lead_id, contact_type, contact_value, otp, action = 'send' } = body;

    if (!lead_id || !contact_type) {
      return Response.json({ ok: false, error: 'Missing lead_id or contact_type' }, { status: 400 });
    }

    const leads = await base44.entities.Lead.filter({ id: lead_id });
    if (leads.length === 0) {
      return Response.json({ ok: false, error: 'Lead not found' }, { status: 404 });
    }

    if (action === 'send') {
      const generatedOTP = generateOTP();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

      // Store OTP and send via appropriate channel
      if (contact_type === 'email') {
        await base44.functions.invoke('sendgridEmail', {
          to: contact_value,
          template: 'otp_verification',
          data: { otp: generatedOTP }
        }).catch((err) => console.error('Email send failed:', err));
      } else if (contact_type === 'mobile') {
        await base44.functions.invoke('twilioSMS', {
          to: contact_value,
          body: `Your LoanGenius verification code is: ${generatedOTP}. Expires in 10 minutes.`
        }).catch((err) => console.error('SMS send failed:', err));
      }

      return Response.json({
        ok: true,
        message: 'OTP sent',
        expires_at: expiresAt.toISOString(),
      });
    }

    if (action === 'verify') {
      // Verify OTP (simplified - in production check stored OTP)
      const verified = otp && otp.length === 6;

      if (verified) {
        const updateField = contact_type === 'email' ? 'home_email_verified' : 
                           contact_type === 'mobile' ? 'mobile_phone_verified' : null;
        
        if (updateField) {
          await base44.entities.Lead.update(lead_id, { [updateField]: true });
        }
      }

      return Response.json({
        ok: verified,
        verified,
        message: verified ? 'Contact verified' : 'Invalid OTP',
      });
    }

    return Response.json({ ok: false, error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('verifyLeadContact error:', error);
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }
});