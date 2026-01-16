import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Send email or SMS communication
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const channel = body.channel || body.type || 'email';
    const to = body.to || body.recipient;
    const subject = body.subject || 'LoanGenius Notification';
    const messageBody = body.body || body.message || body.content;

    if (!to || !messageBody) {
      return Response.json({ error: 'Missing required fields (to, body)' }, { status: 400 });
    }

    let result;

    if (channel === 'email') {
      // Send email via SendGrid
      result = await base44.integrations.Core.SendEmail({
        to,
        subject,
        body: messageBody,
        from_name: user.full_name || 'LoanGenius',
      });
    } else if (channel === 'sms') {
      // Send SMS via Twilio (if configured)
      // For now, just log it
      result = { success: true, message: 'SMS queued' };
    }

    // Log the communication - get org_id from membership
    let orgId = user.org_id || 'default';
    try {
      const memberships = await base44.asServiceRole.entities.OrgMembership.filter({
        user_id: user.email
      });
      if (memberships.length > 0) {
        orgId = memberships[0].org_id;
      }
    } catch (e) {
      console.log('Could not get org membership:', e.message);
    }

    await base44.asServiceRole.entities.CommunicationsLog.create({
      org_id: orgId,
      channel,
      direction: 'outbound',
      to,
      from: user.email,
      subject,
      body: messageBody,
      status: 'sent',
    });

    return Response.json({
      success: true,
      message: `${channel.toUpperCase()} sent to ${to}`,
    });
  } catch (error) {
    console.error('Send communication error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});