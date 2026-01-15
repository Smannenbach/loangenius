import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Get all messages for a session
async function handleGetMessages(req) {
  try {
    const base44 = createClientFromRequest(req);
    const { sessionId } = await req.json();

    // Validate session
    const sessionResponse = await base44.functions.invoke('portalAuth', {
      action: 'getSession',
      sessionId,
    });

    const session = sessionResponse.data;
    if (!session) {
      return Response.json({ error: 'Invalid session' }, { status: 401 });
    }

    // Get messages
    const messages = await base44.entities.CommunicationsLog.filter({
      deal_id: session.dealId,
      org_id: session.orgId,
    });

    // Get borrower and loan officer info
    const borrower = await base44.entities.Borrower.filter({
      id: session.borrowerId,
      org_id: session.orgId,
    });

    const deal = await base44.entities.Deal.filter({
      id: session.dealId,
      org_id: session.orgId,
    });

    let loanOfficerName = 'Loan Officer';
    if (deal && deal[0] && deal[0].assigned_to_user_id) {
      const user = await base44.entities.User.filter({
        id: deal[0].assigned_to_user_id,
      });
      if (user && user[0]) {
        loanOfficerName = user[0].full_name || user[0].email;
      }
    }

    const borrowerName = borrower && borrower[0] 
      ? `${borrower[0].first_name} ${borrower[0].last_name}`.trim()
      : 'You';

    // Format messages
    const formattedMessages = (messages || []).map(msg => ({
      id: msg.id,
      sender: msg.created_by === session.borrowerId ? 'borrower' : 'officer',
      body: msg.body,
      subject: msg.subject,
      created_at: msg.created_date,
    })).sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

    return Response.json({
      messages: formattedMessages,
      borrowerName,
      loanOfficerName,
      dealId: session.dealId,
    });
  } catch (error) {
    console.error('Error getting messages:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

// Send a message from borrower
async function handleSendMessage(req) {
  try {
    const base44 = createClientFromRequest(req);
    const { sessionId, body } = await req.json();

    if (!body || !body.trim()) {
      return Response.json({ error: 'Message body required' }, { status: 400 });
    }

    // Validate session
    const sessionResponse = await base44.functions.invoke('portalAuth', {
      action: 'getSession',
      sessionId,
    });

    const session = sessionResponse.data;
    if (!session) {
      return Response.json({ error: 'Invalid session' }, { status: 401 });
    }

    // Create communication record
    const message = await base44.entities.CommunicationsLog.create({
      org_id: session.orgId,
      deal_id: session.dealId,
      borrower_id: session.borrowerId,
      channel: 'Portal_Message',
      direction: 'Inbound',
      body: body.trim(),
      status: 'sent',
      created_date: new Date().toISOString(),
      created_by: session.borrowerId,
    });

    // Log activity
    await base44.entities.ActivityLog.create({
      org_id: session.orgId,
      deal_id: session.dealId,
      borrower_id: session.borrowerId,
      activity_type: 'MESSAGE_SENT',
      description: 'Borrower sent a message through portal',
      source: 'portal',
    });

    // Send notification to loan officer (optional)
    // base44.integrations.Core.SendEmail({...})

    return Response.json({
      message_id: message.id,
      status: 'sent',
      created_at: message.created_date,
    });
  } catch (error) {
    console.error('Error sending message:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

Deno.serve(async (req) => {
  const path = new URL(req.url).pathname;
  const body = await req.json();

  if (req.method === 'POST' && path === '/functions/portalMessages') {
    if (body.action === 'getMessages') {
      return handleGetMessages(req);
    } else if (body.action === 'sendMessage') {
      return handleSendMessage(req);
    }
  }

  return Response.json({ error: 'Not found' }, { status: 404 });
});