/**
 * Send SMS OTP (One-Time Password) for verification
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { phone } = body;

    if (!phone) {
      return Response.json({ error: 'Missing phone number' }, { status: 400 });
    }

    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store OTP (you would create an OTPVerification entity)
    // For now, return OTP for testing
    console.log(`OTP for ${phone}: ${otp}`);

    // In production, send via Twilio:
    // await sendSMSViaTwilio(phone, `Your LoanGenius verification code is: ${otp}`);

    return Response.json({
      success: true,
      message: 'OTP sent successfully',
      expires_at: expiresAt.toISOString(),
      // Remove this in production:
      otp_for_testing: otp,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});