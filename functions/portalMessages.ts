import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Get messages for portal session
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { sessionId, action } = await req.json();

    if (!sessionId) {
      return Response.json({ error: 'Session ID required' }, { status: 400 });
    }

    // Get session
    const session = await base44.asServiceRole.entities.PortalSession.get(sessionId);
    if (!session || session.is_revoked || new Date(session.expires_at) < new Date()) {
      return Response.json({ error: 'Session invalid' }, { status: 401 });
    }

    if (action === 'getMessages') {
      // Get communications for this deal
      const communications = await base44.asServiceRole.entities.CommunicationsLog.filter({
        deal_id: session.deal_id,
      });

      const messages = communications
        .filter(c => c.direction === 'inbound' || c.direction === 'outbound')
        .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))
        .slice(0, 50);

      // Update last accessed
      await base44.asServiceRole.entities.PortalSession.update(sessionId, {
        last_accessed_at: new Date().toISOString(),
      });

      return Response.json({
        success: true,
        messages: messages.map(m => ({
          id: m.id,
          from: m.from,
          body: m.body,
          created_at: m.created_date,
        })),
      });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Portal messages error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});