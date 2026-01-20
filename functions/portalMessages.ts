/**
 * Portal Secure Messaging
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { action, deal_id, borrower_email, message, subject } = body;

    if (!deal_id) {
      return Response.json({ error: 'Missing deal_id' }, { status: 400 });
    }

    // Get deal for org_id
    const deals = await base44.asServiceRole.entities.Deal.filter({ id: deal_id });
    if (deals.length === 0) {
      return Response.json({ error: 'Deal not found' }, { status: 404 });
    }
    const deal = deals[0];

    if (action === 'list' || !action) {
      const messages = await base44.asServiceRole.entities.CommunicationsLog.filter({
        deal_id: deal_id,
        channel: 'portal_message',
      });

      return Response.json({
        messages: messages.sort((a, b) => 
          new Date(b.created_date) - new Date(a.created_date)
        ),
      });
    }

    if (action === 'send') {
      if (!message) {
        return Response.json({ error: 'Missing message' }, { status: 400 });
      }

      const newMessage = await base44.asServiceRole.entities.CommunicationsLog.create({
        org_id: deal.org_id,
        deal_id: deal_id,
        channel: 'portal_message',
        direction: 'inbound',
        from: borrower_email,
        subject: subject || 'Portal Message',
        body: message,
        status: 'delivered',
      });

      return Response.json({ success: true, message: newMessage });
    }

    if (action === 'mark_read') {
      const messages = await base44.asServiceRole.entities.CommunicationsLog.filter({
        deal_id: deal_id,
        channel: 'portal_message',
        read_by_recipient: false,
      });

      for (const msg of messages) {
        await base44.asServiceRole.entities.CommunicationsLog.update(msg.id, {
          read_by_recipient: true,
          read_at: new Date().toISOString(),
        });
      }

      return Response.json({ success: true, marked_count: messages.length });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});