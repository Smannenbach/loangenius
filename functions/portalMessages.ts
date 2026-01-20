/**
 * Portal Messages - Get/send messages for borrower portal
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { action, deal_id, borrower_email, message } = body;

    if (!deal_id) {
      return Response.json({ ok: false, error: 'Missing deal_id' }, { status: 400 });
    }

    // Get deal for org_id
    const deals = await base44.asServiceRole.entities.Deal.filter({ id: deal_id });
    if (deals.length === 0) {
      return Response.json({ ok: false, error: 'Deal not found' }, { status: 404 });
    }
    const deal = deals[0];

    if (action === 'list' || !action) {
      const messages = await base44.asServiceRole.entities.CommunicationsLog.filter({
        deal_id: deal_id,
        channel: 'portal_message',
      });

      return Response.json({
        ok: true,
        messages: messages.sort((a, b) => new Date(a.created_date) - new Date(b.created_date)),
      });
    }

    if (action === 'send') {
      if (!message || !borrower_email) {
        return Response.json({ ok: false, error: 'Missing message or borrower_email' }, { status: 400 });
      }

      const newMessage = await base44.asServiceRole.entities.CommunicationsLog.create({
        org_id: deal.org_id,
        deal_id: deal_id,
        channel: 'portal_message',
        direction: 'inbound',
        from: borrower_email,
        body: message,
        status: 'delivered',
      });

      return Response.json({ ok: true, message_id: newMessage.id });
    }

    return Response.json({ ok: false, error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('portalMessages error:', error);
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }
});