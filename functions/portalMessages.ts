import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(req.url);
  const dealId = url.pathname.split('/')[3];

  if (!dealId) {
    return Response.json({ error: 'Missing deal ID' }, { status: 400 });
  }

  if (req.method === 'GET') {
    try {
      const messages = await base44.entities.Communication.filter({
        deal_id: dealId,
        channel: 'Portal_Message'
      });

      return Response.json({
        deal_id: dealId,
        messages: messages.map(m => ({
          id: m.id,
          direction: m.direction,
          from: m.from_address,
          to: m.to_address,
          body: m.body,
          created_at: m.created_at,
          status: m.status
        }))
      });
    } catch (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }
  }

  if (req.method === 'POST') {
    try {
      const { body } = await req.json();

      if (!body) {
        return Response.json({ error: 'Message body required' }, { status: 400 });
      }

      const message = await base44.entities.Communication.create({
        org_id: user.org_id || 'default',
        deal_id: dealId,
        channel: 'Portal_Message',
        direction: 'Inbound',
        from_address: user.email,
        to_address: 'support@loangenius.local',
        body,
        status: 'Sent'
      });

      // Log activity
      await base44.asServiceRole.entities.ActivityLog.create({
        org_id: user.org_id || 'default',
        deal_id: dealId,
        contact_id: user.email,
        action_type: 'message_sent',
        description: 'Borrower sent portal message',
        metadata_json: {}
      });

      return Response.json({
        message_id: message.id,
        created_at: message.created_at
      });
    } catch (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }
  }

  return Response.json({ error: 'Method not allowed' }, { status: 405 });
});