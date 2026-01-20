/**
 * Verify Lead Contact - Send OTP and verify contact info
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
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

      // In production, send via Twilio/SendGrid
      console.log(`OTP for ${contact_value}: ${generatedOTP}`);

      return Response.json({
        ok: true,
        message: 'OTP sent',
        expires_at: expiresAt.toISOString(),
        // Remove in production:
        otp_for_testing: generatedOTP,
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