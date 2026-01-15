/**
 * Twilio SMS Service
 * Sends SMS to borrowers with consent tracking + opt-out support
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { org_id, borrower_phone, message, deal_id, template_name } = await req.json();

    if (!org_id || !borrower_phone || (!message && !template_name)) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check opt-out
    const optOuts = await base44.asServiceRole.entities.SMSOptOut.filter({
      org_id,
      phone_number: borrower_phone
    });

    if (optOuts.length > 0 && optOuts[0].status === 'opted_out') {
      return Response.json({ 
        success: false, 
        error: 'Borrower has opted out of SMS',
        borrowed_phone: borrower_phone 
      }, { status: 400 });
    }

    // Get Twilio credentials
    const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    const twilioPhoneNumber = Deno.env.get('TWILIO_PHONE_NUMBER');

    if (!twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber) {
      return Response.json({ error: 'Twilio credentials not configured' }, { status: 500 });
    }

    const smsBody = message || getTemplateBody(template_name);

    // Call Twilio API
    const auth = btoa(`${twilioAccountSid}:${twilioAuthToken}`);
    const params = new URLSearchParams({
      From: twilioPhoneNumber,
      To: borrower_phone,
      Body: smsBody
    });

    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString()
    });

    const result = await response.json();

    // Log communication
    await base44.asServiceRole.entities.Communication.create({
      org_id,
      deal_id,
      channel: 'SMS',
      direction: 'Outbound',
      from_address: twilioPhoneNumber,
      to_address: borrower_phone,
      body: smsBody,
      status: response.ok ? 'Sent' : 'Failed',
      provider: 'Twilio',
      provider_message_id: result.sid || null,
      sent_at: new Date().toISOString()
    });

    return Response.json({
      success: response.ok,
      message_sid: result.sid,
      status: result.status,
      phone: borrower_phone
    });
  } catch (error) {
    console.error('Error sending SMS:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function getTemplateBody(template_name) {
  const templates = {
    document_reminder: 'Your loan documents are ready for review. Please log in to your portal to upload required documents.',
    rate_lock_alert: 'Your rate lock is expiring soon. Contact your loan officer to extend or lock in your rate.',
    task_assigned: 'A task has been assigned to you. Log into your portal to view details.',
    approval_notification: 'Great news! Your loan has been approved. Next steps will be sent to your email.'
  };

  return templates[template_name] || 'Important message from your lender. Please contact your loan officer.';
}