/**
 * Twilio SMS Inbound & Status Webhook Handler
 * Processes inbound messages and STOP opt-outs
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.text();
    const params = new URLSearchParams(body);

    const messageSid = params.get('MessageSid');
    const from = params.get('From');
    const to = params.get('To');
    const messageBody = params.get('Body');
    const messageStatus = params.get('MessageStatus'); // For status callback

    // Handle status callback
    if (messageStatus) {
      const comms = await base44.asServiceRole.entities.Communication.filter({
        provider_message_id: messageSid
      });

      if (comms.length > 0) {
        const statusMap = {
          'queued': 'Queued',
          'sending': 'Sent',
          'sent': 'Sent',
          'delivered': 'Delivered',
          'undelivered': 'Failed',
          'failed': 'Failed'
        };

        const newStatus = statusMap[messageStatus] || 'Sent';
        await base44.asServiceRole.entities.Communication.update(comms[0].id, {
          status: newStatus
        });
      }
      return Response.json({ success: true });
    }

    // Handle inbound SMS
    if (messageBody) {
      const upperBody = messageBody.toUpperCase().trim();

      // Check for opt-out keywords
      if (['STOP', 'UNSUBSCRIBE', 'CANCEL', 'END', 'QUIT'].includes(upperBody)) {
        // Add to opt-out
        await base44.asServiceRole.entities.SMSOptOut.create({
          org_id: 'default', // Would need org context
          phone_number: from,
          status: 'opted_out',
          reason: 'STOP keyword'
        }).catch(() => {});

        // Return TwiML response
        return new Response(
          `<?xml version="1.0" encoding="UTF-8"?>
           <Response>
             <Message>You have been unsubscribed. Reply START to re-subscribe.</Message>
           </Response>`,
          { headers: { 'Content-Type': 'application/xml' } }
        );
      }

      if (['START', 'SUBSCRIBE', 'YES'].includes(upperBody)) {
        // Remove from opt-out (set to opted_in)
        return new Response(
          `<?xml version="1.0" encoding="UTF-8"?>
           <Response>
             <Message>You have been re-subscribed to SMS messages.</Message>
           </Response>`,
          { headers: { 'Content-Type': 'application/xml' } }
        );
      }

      if (upperBody === 'HELP') {
        return new Response(
          `<?xml version="1.0" encoding="UTF-8"?>
           <Response>
             <Message>Loan Genius Support: Call us or email support@loangenius.ai. Reply STOP to unsubscribe.</Message>
           </Response>`,
          { headers: { 'Content-Type': 'application/xml' } }
        );
      }

      // Log inbound message
      await base44.asServiceRole.entities.Communication.create({
        org_id: 'default',
        channel: 'SMS',
        direction: 'Inbound',
        from_address: from,
        to_address: to,
        body: messageBody,
        status: 'Delivered',
        provider: 'Twilio',
        provider_message_id: messageSid
      }).catch(() => {});
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('Error in twilioSMSWebhook:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});