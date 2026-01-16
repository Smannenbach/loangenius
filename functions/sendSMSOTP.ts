import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Send SMS OTP verification code via Twilio
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Allow unauthenticated access for public forms
    let user = null;
    try {
      user = await base44.auth.me();
    } catch {
      // Public form access
    }

    const { phone, code } = await req.json();

    if (!phone || !code) {
      return Response.json({ error: 'Phone and code are required' }, { status: 400 });
    }

    // Get Twilio credentials from environment
    const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    const fromPhone = Deno.env.get('TWILIO_PHONE_NUMBER');

    if (!accountSid || !authToken || !fromPhone) {
      console.error('Twilio credentials not configured');
      return Response.json({ error: 'SMS service not configured' }, { status: 500 });
    }

    // Format phone number
    let toPhone = phone.replace(/\D/g, '');
    if (toPhone.length === 10) {
      toPhone = `+1${toPhone}`;
    } else if (toPhone.length === 11 && toPhone.startsWith('1')) {
      toPhone = `+${toPhone}`;
    } else if (!toPhone.startsWith('+')) {
      toPhone = `+1${toPhone}`;
    }

    // Send SMS via Twilio API
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + btoa(`${accountSid}:${authToken}`),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          From: fromPhone,
          To: toPhone,
          Body: `Your LoanGenius verification code is: ${code}. This code expires in 10 minutes.`,
        }),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      console.error('Twilio error:', result);
      return Response.json({ error: result.message || 'Failed to send SMS' }, { status: 400 });
    }

    return Response.json({ 
      success: true, 
      sid: result.sid,
      to: toPhone 
    });
  } catch (error) {
    console.error('SMS OTP error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});