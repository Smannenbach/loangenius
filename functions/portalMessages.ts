import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Get messages for borrower portal
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { sessionId, action } = await req.json();

    if (!sessionId) {
      return Response.json({ error: 'Session ID required' }, { status: 400 });
    }

    const session = await base44.asServiceRole.entities.PortalSession.get(sessionId);
    if (!session || session.is_revoked || new Date(session.expires_at) < new Date()) {
      return Response.json({ error: 'Invalid session' }, { status: 401 });
    }

    if (action === 'getMessages') {
      const messages = await base44.asServiceRole.entities.CommunicationsLog.filter({
        org_id: session.org_id,
        deal_id: session.deal_id,
      }, '-created_date', 50);

      return Response.json({
        messages: messages.map(msg => ({
          id: msg.id,
          from: msg.from,
          to: msg.to,
          subject: msg.subject,
          body: msg.body,
          channel: msg.channel,
          created_date: msg.created_date,
        })),
      });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Portal messages error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});