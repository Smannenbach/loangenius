import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const { to, message, event_type, entity_data } = await req.json();

    if (!to || !message) {
      return Response.json({ error: 'Missing to or message' }, { status: 400 });
    }

    const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    const fromNumber = Deno.env.get('TWILIO_PHONE_NUMBER');

    if (!accountSid || !authToken || !fromNumber) {
      return Response.json({ error: 'Twilio not configured' }, { status: 500 });
    }

    // Format phone number
    let formattedPhone = to.replace(/\D/g, '');
    if (formattedPhone.length === 10) {
      formattedPhone = '1' + formattedPhone;
    }
    if (!formattedPhone.startsWith('+')) {
      formattedPhone = '+' + formattedPhone;
    }

    // Check opt-out status
    const optOuts = await base44.asServiceRole.entities.SMSOptOut.filter({
      phone: formattedPhone
    });

    if (optOuts.length > 0) {
      return Response.json({ 
        success: false, 
        reason: 'Phone number has opted out of SMS' 
      });
    }

    // Send via Twilio
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    
    const response = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + btoa(`${accountSid}:${authToken}`),
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        To: formattedPhone,
        From: fromNumber,
        Body: message
      })
    });

    const result = await response.json();

    if (!response.ok) {
      return Response.json({ 
        error: 'Twilio error', 
        details: result 
      }, { status: response.status });
    }

    // Log the communication
    try {
      await base44.asServiceRole.entities.CommunicationsLog.create({
        org_id: entity_data?.org_id,
        channel: 'sms',
        direction: 'outbound',
        recipient: formattedPhone,
        content: message,
        status: 'sent',
        external_id: result.sid,
        sent_at: new Date().toISOString()
      });
    } catch (logErr) {
      console.error('Failed to log communication:', logErr);
    }

    return Response.json({ 
      success: true, 
      message_sid: result.sid,
      to: formattedPhone
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});