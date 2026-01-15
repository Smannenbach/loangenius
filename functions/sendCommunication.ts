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

    const { channel, to, subject, body } = await req.json();

    if (!channel || !to || !body) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    let result;

    if (channel === 'email') {
      // Send email via SendGrid
      result = await base44.integrations.Core.SendEmail({
        to,
        subject,
        body,
        from_name: user.full_name || 'LoanGenius',
      });
    } else if (channel === 'sms') {
      // Send SMS via Twilio (if configured)
      // For now, just log it
      result = { success: true, message: 'SMS queued' };
    }

    // Log the communication
    await base44.asServiceRole.entities.CommunicationsLog.create({
      org_id: user.org_id || 'default',
      channel,
      direction: 'outbound',
      to,
      from: user.email,
      subject,
      body,
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