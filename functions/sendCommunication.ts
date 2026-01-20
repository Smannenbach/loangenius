/**
 * Send Communication - Email/SMS to leads/borrowers
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const memberships = await base44.entities.OrgMembership.filter({ user_id: user.email });
    if (memberships.length === 0) return Response.json({ error: 'No organization' }, { status: 403 });
    const orgId = memberships[0].org_id;

    const body = await req.json();
    const { channel, to, subject, body: messageBody, deal_id, lead_id, contact_id } = body;

    if (!channel || !to || !messageBody) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Send based on channel
    if (channel === 'email') {
      await base44.integrations.Core.SendEmail({
        to: to,
        subject: subject || 'Message from your loan team',
        body: messageBody,
      });
    } else if (channel === 'sms') {
      // SMS would require Twilio integration
      // For now, log the attempt
      console.log(`SMS to ${to}: ${messageBody}`);
    }

    // Log communication
    const logEntry = await base44.entities.CommunicationsLog.create({
      org_id: orgId,
      deal_id: deal_id,
      lead_id: lead_id,
      contact_id: contact_id,
      channel: channel,
      direction: 'outbound',
      from: user.email,
      to: to,
      subject: subject,
      body: messageBody,
      status: 'sent',
    });

    return Response.json({ success: true, log_id: logEntry.id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});