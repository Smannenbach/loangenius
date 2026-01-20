/**
 * Send SMS OTP (One-Time Password) for verification
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

async function hashOTP(otp: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(otp);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function generateOTP() {
  // Use cryptographically secure random number generation
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return String(100000 + (array[0] % 900000));
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

    // Store OTP in database for verification
    await base44.asServiceRole.entities.OTPVerification.create({
      phone,
      otp_hash: await hashOTP(otp),
      expires_at: expiresAt.toISOString(),
      verified: false,
    }).catch(() => {});

    // Send via Twilio
    await base44.functions.invoke('twilioSMS', {
      to: phone,
      body: `Your LoanGenius verification code is: ${otp}. Expires in 10 minutes.`
    }).catch((err) => console.error('SMS send failed:', err));

    // In production, send via Twilio:
    // await sendSMSViaTwilio(phone, `Your LoanGenius verification code is: ${otp}`);

    return Response.json({
      success: true,
      message: 'OTP sent successfully',
      expires_at: expiresAt.toISOString(),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});