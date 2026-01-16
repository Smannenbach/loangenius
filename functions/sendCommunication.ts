import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const SENDGRID_API_KEY = Deno.env.get('Sendgrid_API_Key');
const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID');
const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN');
const TWILIO_PHONE_NUMBER = Deno.env.get('TWILIO_PHONE_NUMBER');

/**
 * Send email via SendGrid API
 */
async function sendEmailViaSendGrid(to, subject, body, fromName = 'LoanGenius') {
  const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SENDGRID_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: { email: 'noreply@loangenius.app', name: fromName },
      subject: subject,
      content: [{ type: 'text/html', value: body.replace(/\n/g, '<br>') }],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`SendGrid error: ${response.status} - ${errorText}`);
  }

  return { success: true, provider: 'sendgrid' };
}

/**
 * Send SMS via Twilio API
 */
async function sendSMSViaTwilio(to, body) {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
    throw new Error('Twilio credentials not configured');
  }

  // Ensure phone number is in E.164 format
  let formattedTo = to.replace(/[^\d+]/g, '');
  if (!formattedTo.startsWith('+')) {
    formattedTo = '+1' + formattedTo; // Default to US
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
  const auth = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      To: formattedTo,
      From: TWILIO_PHONE_NUMBER,
      Body: body,
    }),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(`Twilio error: ${result.message || result.error_message || 'Unknown error'}`);
  }

  return { 
    success: true, 
    provider: 'twilio',
    sid: result.sid,
    status: result.status 
  };
}

/**
 * Send email or SMS communication
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const channel = body.channel || body.type || 'email';
    const to = body.to || body.recipient;
    const subject = body.subject || 'LoanGenius Notification';
    const messageBody = body.body || body.message || body.content;

    if (!to || !messageBody) {
      return Response.json({ error: 'Missing required fields (to, body)' }, { status: 400 });
    }

    let result;
    let status = 'sent';

    if (channel === 'email') {
      // Send email via SendGrid
      if (SENDGRID_API_KEY) {
        result = await sendEmailViaSendGrid(to, subject, messageBody, user.full_name || 'LoanGenius');
      } else {
        // Fallback to Core integration
        result = await base44.integrations.Core.SendEmail({
          to,
          subject,
          body: messageBody,
          from_name: user.full_name || 'LoanGenius',
        });
      }
    } else if (channel === 'sms') {
      // Send SMS via Twilio
      result = await sendSMSViaTwilio(to, messageBody);
      status = result.status || 'sent';
    } else {
      return Response.json({ error: `Unsupported channel: ${channel}` }, { status: 400 });
    }

    // Log the communication - get org_id from membership
    let orgId = user.org_id || 'default';
    try {
      const memberships = await base44.asServiceRole.entities.OrgMembership.filter({
        user_id: user.email
      });
      if (memberships.length > 0) {
        orgId = memberships[0].org_id;
      }
    } catch (e) {
      console.log('Could not get org membership:', e.message);
    }

    await base44.asServiceRole.entities.CommunicationsLog.create({
      org_id: orgId,
      channel,
      direction: 'outbound',
      to,
      from: user.email,
      subject: channel === 'email' ? subject : null,
      body: messageBody,
      status,
    });

    return Response.json({
      success: true,
      message: `${channel.toUpperCase()} sent to ${to}`,
      provider: result.provider,
    });
  } catch (error) {
    console.error('Send communication error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});