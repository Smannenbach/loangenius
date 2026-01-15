import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);

    const { phone_number, message_body, from_number, message_id, timestamp } = await req.json();

    if (!phone_number || !message_body) {
      return Response.json({ error: 'Missing phone_number or message_body' }, { status: 400 });
    }

    // Detect STOP/UNSUBSCRIBE/OPT-OUT keywords
    const stopKeywords = ['STOP', 'UNSUBSCRIBE', 'END', 'QUIT', 'CANCEL', 'REMOVE', 'OPT-OUT'];
    const messageUpper = message_body.trim().toUpperCase();
    const isStopmessage = stopKeywords.some(kw => messageUpper.startsWith(kw));

    if (!isStopmessage) {
      return Response.json({
        processed: false,
        reason: 'Not a STOP message'
      });
    }

    // Get org (default for now; in production, map phone to org)
    const orgId = 'default';

    // Update/create SMSOptOut record
    const optOuts = await base44.asServiceRole.entities.SMSOptOut.filter({
      org_id: orgId,
      phone_number
    });

    if (optOuts.length > 0) {
      await base44.asServiceRole.entities.SMSOptOut.update(optOuts[0].id, {
        status: 'opted_out',
        opted_out_at: new Date().toISOString()
      });
    } else {
      await base44.asServiceRole.entities.SMSOptOut.create({
        org_id: orgId,
        phone_number,
        status: 'opted_out',
        opted_out_at: new Date().toISOString(),
        reason: 'User sent STOP keyword'
      });
    }

    // Update ConsentRecord
    const consents = await base44.asServiceRole.entities.ConsentRecord.filter({
      org_id: orgId,
      contact_phone: phone_number,
      consent_type: 'sms'
    });

    if (consents.length > 0) {
      await base44.asServiceRole.entities.ConsentRecord.update(consents[0].id, {
        status: 'opt_out',
        opted_out_at: new Date().toISOString(),
        reason: 'User sent STOP keyword',
        opted_out_keywords: [...(consents[0].opted_out_keywords || []), messageBody]
      });
    } else {
      await base44.asServiceRole.entities.ConsentRecord.create({
        org_id: orgId,
        contact_phone: phone_number,
        consent_type: 'sms',
        status: 'opt_out',
        captured_at: new Date().toISOString(),
        source: 'sms_inbound',
        reason: 'User sent STOP keyword',
        opted_out_keywords: [messageBody]
      });
    }

    // Log the STOP message
    await base44.asServiceRole.entities.Communication.create({
      org_id: orgId,
      channel: 'SMS',
      direction: 'Inbound',
      from_address: phone_number,
      to_address: from_number,
      body: message_body,
      status: 'Delivered',
      metadata: {
        message_id,
        stop_keyword: messageUpper,
        processed_at: new Date().toISOString()
      }
    });

    // Send confirmation SMS (required by TCPA)
    // In production: use Twilio SDK to send confirmation
    // For now, mock it
    await base44.asServiceRole.entities.Communication.create({
      org_id: orgId,
      channel: 'SMS',
      direction: 'Outbound',
      from_address: from_number,
      to_address: phone_number,
      body: 'You have been unsubscribed from all messages. Reply HELP for help.',
      status: 'Queued'
    });

    return Response.json({
      processed: true,
      action: 'opted_out',
      phone_number,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});