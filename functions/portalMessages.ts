import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Get portal messages for borrower
 */
Deno.serve(async (req) => {
  try {
    if (req.method === 'GET') {
      return Response.json({ error: 'POST only' }, { status: 405 });
    }

    const base44 = createClientFromRequest(req);
    const { sessionId, action } = await req.json();

    if (!sessionId) {
      return Response.json({ error: 'Session ID required' }, { status: 400 });
    }

    // Validate session
    const session = await base44.asServiceRole.entities.PortalSession.get(sessionId);
    if (!session || session.is_revoked || new Date(session.expires_at) < new Date()) {
      return Response.json({ error: 'Invalid session' }, { status: 401 });
    }

    if (action === 'getMessages') {
      // Get communications for this deal
      const messages = await base44.asServiceRole.entities.CommunicationsLog.filter({
        org_id: session.org_id,
        deal_id: session.deal_id,
      });

      // Sort by date descending
      const sorted = messages.sort(
        (a, b) => new Date(b.created_date) - new Date(a.created_date)
      );

      return Response.json({
        messages: sorted.map((m) => ({
          id: m.id,
          subject: m.subject,
          body: m.body,
          from: m.from,
          direction: m.direction,
          channel: m.channel,
          created_at: m.created_date,
        })),
      });
    }

    if (action === 'sendMessage') {
      const { body } = await req.json();

      if (!body) {
        return Response.json({ error: 'Message body required' }, { status: 400 });
      }

      // Get deal to find LO
      const deal = await base44.asServiceRole.entities.Deal.get(session.deal_id);
      if (!deal) {
        return Response.json({ error: 'Deal not found' }, { status: 404 });
      }

      // Create message
      const message = await base44.asServiceRole.entities.CommunicationsLog.create({
        org_id: session.org_id,
        deal_id: session.deal_id,
        channel: 'in_app',
        direction: 'inbound',
        from: session.borrower_id,
        to: deal.assigned_to_user_id,
        body,
        status: 'delivered',
      });

      return Response.json({
        success: true,
        message: {
          id: message.id,
          body: message.body,
          direction: 'inbound',
          created_at: message.created_date,
        },
      });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Portal messages error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});