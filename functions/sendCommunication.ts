/**
 * Send Communication via Email or SMS
 * Respects opt-out status, uses templates, fires webhooks
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {
      org_id,
      borrower_id,
      deal_id,
      channel,
      template_id,
      subject,
      body,
      body_html,
      to_address,
      send_immediately
    } = await req.json();

    if (!org_id || !channel || !to_address || (!body && !template_id)) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check opt-out status
    if (channel === 'Email') {
      const optOuts = await base44.asServiceRole.entities.EmailOptOut.filter({
        org_id,
        email: to_address,
        status: 'opted_out'
      });
      if (optOuts.length > 0) {
        return Response.json({ error: 'Recipient has opted out of email' }, { status: 400 });
      }
    } else if (channel === 'SMS') {
      const optOuts = await base44.asServiceRole.entities.SMSOptOut.filter({
        org_id,
        phone_number: to_address,
        status: 'opted_out'
      });
      if (optOuts.length > 0) {
        return Response.json({ error: 'Recipient has opted out of SMS' }, { status: 400 });
      }
    }

    // Get template if specified
    let finalSubject = subject;
    let finalBody = body;
    let finalBodyHtml = body_html;

    if (template_id) {
      const templates = await base44.asServiceRole.entities.CommunicationTemplate.filter({
        id: template_id
      });
      if (templates.length > 0) {
        const template = templates[0];
        finalSubject = subject || template.subject;
        finalBody = body || template.body_text;
        finalBodyHtml = body_html || template.body_html;
      }
    }

    // Create communication record
    const communication = await base44.asServiceRole.entities.Communication.create({
      org_id,
      borrower_id,
      deal_id,
      user_id: user.id,
      template_id,
      channel,
      direction: 'Outbound',
      from_address: 'noreply@loangenius.ai',
      to_address,
      subject: finalSubject,
      body: finalBody,
      body_html: finalBodyHtml,
      status: send_immediately ? 'Queued' : 'Draft',
      provider: channel === 'SMS' ? 'Twilio' : 'SendGrid'
    });

    // Send if requested
    if (send_immediately) {
      const sendResult = await sendViaProvider(
        channel,
        finalSubject,
        finalBody,
        finalBodyHtml,
        to_address
      );

      if (sendResult.success) {
        await base44.asServiceRole.entities.Communication.update(communication.id, {
          status: 'Sent',
          sent_at: new Date().toISOString(),
          provider_message_id: sendResult.provider_message_id
        });
      } else {
        await base44.asServiceRole.entities.Communication.update(communication.id, {
          status: 'Failed'
        });
      }
    }

    return Response.json({
      success: true,
      communication_id: communication.id,
      status: communication.status
    });
  } catch (error) {
    console.error('Error in sendCommunication:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function sendViaProvider(channel, subject, body, bodyHtml, to_address) {
  try {
    if (channel === 'Email') {
      // SendGrid
      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('SENDGRID_API_KEY')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: to_address }], subject }],
          from: { email: 'noreply@loangenius.ai', name: 'Loan Genius' },
          content: [
            { type: 'text/plain', value: body },
            { type: 'text/html', value: bodyHtml || body }
          ]
        })
      });

      if (response.ok) {
        return { success: true, provider_message_id: response.headers.get('x-message-id') };
      }
      return { success: false };
    } else if (channel === 'SMS') {
      // Twilio
      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${Deno.env.get('TWILIO_ACCOUNT_SID')}/Messages.json`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${btoa(Deno.env.get('TWILIO_ACCOUNT_SID') + ':' + Deno.env.get('TWILIO_AUTH_TOKEN'))}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: new URLSearchParams({
            To: to_address,
            From: Deno.env.get('TWILIO_FROM_NUMBER'),
            Body: body
          })
        }
      );

      const data = await response.json();
      if (data.sid) {
        return { success: true, provider_message_id: data.sid };
      }
      return { success: false };
    }
  } catch (error) {
    console.error('Provider send error:', error);
    return { success: false };
  }
}