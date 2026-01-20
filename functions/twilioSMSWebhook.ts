/**
 * Twilio SMS Inbound & Status Webhook Handler
 * Processes inbound messages and STOP opt-outs
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Helper to resolve org_id from phone number
async function resolveOrgFromPhone(base44, phoneNumber) {
  try {
    // Look up leads/contacts by phone to find org
    const leads = await base44.asServiceRole.entities.Lead.filter({ mobile_phone: phoneNumber });
    if (leads.length > 0) return leads[0].org_id;
    
    const contacts = await base44.asServiceRole.entities.Contact.filter({ phone: phoneNumber });
    if (contacts.length > 0) return contacts[0].org_id;
    
    return null;
  } catch {
    return null;
  }
}

// SECURITY: Twilio webhook signature validation
async function validateTwilioSignature(req, body) {
  const signature = req.headers.get('X-Twilio-Signature');
  const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
  
  if (!signature || !authToken) {
    console.warn('Missing Twilio signature or auth token');
    return false;
  }
  
  // Get the full URL from the request
  const url = req.url;
  
  // Build the data string: URL + sorted POST params
  const params = new URLSearchParams(body);
  const sortedParams = [...params.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  let dataString = url;
  for (const [key, value] of sortedParams) {
    dataString += key + value;
  }
  
  // Create HMAC-SHA1 signature
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(authToken),
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign']
  );
  const signatureBytes = await crypto.subtle.sign('HMAC', key, encoder.encode(dataString));
  const expectedSignature = btoa(String.fromCharCode(...new Uint8Array(signatureBytes)));
  
  return signature === expectedSignature;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.text();
    
    // SECURITY FIX: Validate Twilio webhook signature
    const isValid = await validateTwilioSignature(req, body);
    if (!isValid) {
      console.error('Invalid Twilio webhook signature');
      return Response.json({ error: 'Invalid signature' }, { status: 403 });
    }
    
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
        // FIX: Derive org_id from phone number lookup instead of hardcoding
        const orgId = await resolveOrgFromPhone(base44, from) || 'default';
        await base44.asServiceRole.entities.SMSOptOut.create({
          org_id: Deno.env.get('DEFAULT_ORG_ID') || 'default', // TODO: Extract org from phone number mapping
          org_id: orgId,
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

      // Log inbound message - derive org_id from phone
      const orgId = await resolveOrgFromPhone(base44, from) || 'default';
      await base44.asServiceRole.entities.Communication.create({
        org_id: Deno.env.get('DEFAULT_ORG_ID') || 'default', // TODO: Extract org from phone number mapping
        org_id: orgId,
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