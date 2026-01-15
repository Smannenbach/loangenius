/**
 * SendGrid Event Webhook Handler
 * Updates communication status based on delivery events
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const events = await req.json();

    if (!Array.isArray(events)) {
      return Response.json({ error: 'Invalid payload' }, { status: 400 });
    }

    for (const event of events) {
      const messageId = event.sg_message_id || event.message_id;
      
      if (!messageId) continue;

      // Find communication by provider_message_id
      const comms = await base44.asServiceRole.entities.Communication.filter({
        provider_message_id: messageId
      });

      if (!comms.length) continue;

      const comm = comms[0];
      const updateData = {};

      // Map SendGrid event to our status
      switch (event.event) {
        case 'delivered':
          updateData.status = 'Delivered';
          updateData.delivered_at = new Date(event.timestamp * 1000).toISOString();
          break;
        case 'open':
          updateData.status = 'Opened';
          updateData.opened_at = new Date(event.timestamp * 1000).toISOString();
          break;
        case 'click':
          updateData.status = 'Clicked';
          break;
        case 'bounce':
          updateData.status = 'Failed';
          // Add to email opt-out
          await base44.asServiceRole.entities.EmailOptOut.create({
            org_id: comm.org_id,
            email: event.email,
            status: 'opted_out',
            reason: 'Bounce: ' + (event.bounce_type || 'Unknown')
          }).catch(() => {});
          break;
        case 'spamreport':
          updateData.status = 'Failed';
          // Add to opt-out
          await base44.asServiceRole.entities.EmailOptOut.create({
            org_id: comm.org_id,
            email: event.email,
            status: 'opted_out',
            reason: 'Spam Report'
          }).catch(() => {});
          break;
        case 'unsubscribe':
          // Add to opt-out
          await base44.asServiceRole.entities.EmailOptOut.create({
            org_id: comm.org_id,
            email: event.email,
            status: 'opted_out',
            reason: 'Unsubscribe'
          }).catch(() => {});
          break;
      }

      if (Object.keys(updateData).length > 0) {
        await base44.asServiceRole.entities.Communication.update(comm.id, updateData);
      }
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('Error in sendgridWebhook:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});