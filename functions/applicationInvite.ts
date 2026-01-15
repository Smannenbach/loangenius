import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import crypto from 'node:crypto';

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const url = new URL(req.url);
    const token = url.pathname.split('/').slice(-3)[0]; // Extract from /resume/:token/invite

    const { email, role } = await req.json();

    if (!email || !role || !['co_borrower', 'guarantor'].includes(role)) {
      return Response.json({
        error: 'Invalid email or role. Role must be co_borrower or guarantor'
      }, { status: 400 });
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const drafts = await base44.asServiceRole.entities.ApplicationDraft.filter({
      resume_token_hash: tokenHash
    });

    if (drafts.length === 0) {
      return Response.json({ error: 'Application not found' }, { status: 404 });
    }

    const draft = drafts[0];

    // Generate invite token
    const inviteToken = crypto.randomBytes(32).toString('hex');
    const inviteTokenHash = crypto.createHash('sha256').update(inviteToken).digest('hex');
    const inviteExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days

    // Create participant
    const participant = await base44.asServiceRole.entities.ApplicationParticipant.create({
      org_id: draft.org_id,
      application_id: draft.id,
      email,
      role,
      invite_status: 'invited',
      invite_token_hash: inviteTokenHash,
      invite_expires_at: inviteExpiresAt,
      participant_data_json: {}
    });

    // Send invite email (log for now)
    await base44.asServiceRole.entities.Communication.create({
      org_id: draft.org_id,
      channel: 'Email',
      direction: 'Outbound',
      from_address: 'noreply@loangenius.local',
      to_address: email,
      subject: `You're invited to complete a loan application`,
      body: `Click here to complete your information: ${new URL(req.url).origin}/public/application/participant/${inviteToken}`,
      status: 'Queued'
    });

    return Response.json({
      invite_url: `${new URL(req.url).origin}/public/application/participant/${inviteToken}`,
      expires_at: inviteExpiresAt,
      participant_id: participant.id
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});