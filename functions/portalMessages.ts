import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Portal messaging - get messages, send messages, mark as read
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { sessionId, action, message, attachment_url, messageId } = await req.json();

    if (!sessionId) {
      return Response.json({ error: 'Session ID required' }, { status: 400 });
    }

    // Get session
    const session = await base44.asServiceRole.entities.PortalSession.get(sessionId);
    if (!session || session.is_revoked || new Date(session.expires_at) < new Date()) {
      return Response.json({ error: 'Session invalid' }, { status: 401 });
    }

    // Update last accessed
    await base44.asServiceRole.entities.PortalSession.update(sessionId, {
      last_accessed_at: new Date().toISOString(),
    });

    if (action === 'getMessages') {
      // Get communications for this deal
      const communications = await base44.asServiceRole.entities.CommunicationsLog.filter({
        deal_id: session.deal_id,
      });

      const messages = communications
        .filter(c => c.channel === 'portal_message' || c.channel === 'in_app')
        .sort((a, b) => new Date(a.created_date) - new Date(b.created_date))
        .slice(-50);

      // Mark inbound messages as read by borrower (outbound from LO perspective)
      const unreadFromLO = messages.filter(m => m.direction === 'outbound' && !m.read_by_recipient);
      for (const msg of unreadFromLO) {
        await base44.asServiceRole.entities.CommunicationsLog.update(msg.id, {
          read_by_recipient: true,
          read_at: new Date().toISOString()
        });
      }

      return Response.json({
        success: true,
        messages: messages.map(m => ({
          id: m.id,
          from: m.from,
          to: m.to,
          body: m.body,
          direction: m.direction,
          attachment_url: m.attachment_url,
          read_by_recipient: m.read_by_recipient,
          created_date: m.created_date,
        })),
      });
    }

    if (action === 'sendMessage') {
      if (!message?.trim()) {
        return Response.json({ error: 'Message is required' }, { status: 400 });
      }

      // Create message from borrower
      const newMessage = await base44.asServiceRole.entities.CommunicationsLog.create({
        org_id: session.org_id || 'default',
        deal_id: session.deal_id,
        borrower_id: session.borrower_id,
        channel: 'portal_message',
        direction: 'inbound',
        from: session.borrower_email,
        to: 'loan_team',
        subject: 'Portal Message',
        body: message.trim(),
        attachment_url: attachment_url || null,
        status: 'sent',
        read_by_recipient: false
      });

      // Create notification for loan team
      try {
        await base44.asServiceRole.entities.Notification.create({
          org_id: session.org_id || 'default',
          deal_id: session.deal_id,
          type: 'portal_message',
          title: 'New Portal Message',
          message: `Message from borrower: ${message.substring(0, 100)}${message.length > 100 ? '...' : ''}`,
          is_read: false
        });
      } catch (e) {
        console.log('Notification creation skipped:', e.message);
      }

      return Response.json({
        success: true,
        message: {
          id: newMessage.id,
          body: newMessage.body,
          direction: 'inbound',
          created_date: newMessage.created_date
        }
      });
    }

    if (action === 'markAsRead') {
      if (!messageId) {
        return Response.json({ error: 'Message ID required' }, { status: 400 });
      }

      await base44.asServiceRole.entities.CommunicationsLog.update(messageId, {
        read_by_recipient: true,
        read_at: new Date().toISOString()
      });

      return Response.json({ success: true });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Portal messages error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});