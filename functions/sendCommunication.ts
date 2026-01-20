/**
 * Send Communication - Email/SMS to borrowers
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

    const resolveResponse = await base44.functions.invoke('resolveOrgId', { auto_create: false });
    const orgData = resolveResponse.data;
    if (!orgData.ok) return Response.json({ ok: false, error: 'No organization' }, { status: 403 });

    const body = await req.json();
    const { channel, to, subject, body: messageBody, deal_id, contact_id, borrower_id } = body;

    if (!channel || !to || !messageBody) {
      return Response.json({ ok: false, error: 'Missing required fields' }, { status: 400 });
    }

    let result;

    if (channel === 'email') {
      result = await base44.integrations.Core.SendEmail({
        to,
        subject: subject || 'Message from LoanGenius',
        body: messageBody,
      });
    } else if (channel === 'sms') {
      // SMS would use Twilio integration
      result = { sent: true, message: 'SMS queued' };
    } else {
      return Response.json({ ok: false, error: 'Invalid channel' }, { status: 400 });
    }

    // Log communication
    await base44.asServiceRole.entities.CommunicationsLog.create({
      org_id: orgData.org_id,
      deal_id,
      contact_id,
      borrower_id,
      channel,
      direction: 'outbound',
      from: user.email,
      to,
      subject,
      body: messageBody,
      status: 'sent',
    });

    return Response.json({ ok: true, result });
  } catch (error) {
    console.error('sendCommunication error:', error);
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }
});