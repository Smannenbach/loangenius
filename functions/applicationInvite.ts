import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import crypto from 'node:crypto';

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);
    
    const body = await req.json().catch(() => ({}));
    const { email, role, deal_id, application_id, token: bodyToken } = body;

    if (!email || !role || !['co_borrower', 'guarantor'].includes(role)) {
      return Response.json({
        error: 'Invalid email or role. Role must be co_borrower or guarantor'
      }, { status: 400 });
    }

    let draft;
    
    // Support either token-based or direct application_id/deal_id lookup
    if (bodyToken) {
      const tokenHash = crypto.createHash('sha256').update(bodyToken).digest('hex');
      const drafts = await base44.asServiceRole.entities.ApplicationDraft.filter({
        resume_token_hash: tokenHash
      });
      if (drafts.length > 0) draft = drafts[0];
    } else if (application_id) {
      const drafts = await base44.asServiceRole.entities.ApplicationDraft.filter({
        id: application_id
      });
      if (drafts.length > 0) draft = drafts[0];
    } else if (deal_id) {
      // Get deal's org and create participant directly
      const deal = await base44.asServiceRole.entities.Deal.get(deal_id);
      if (deal) {
        draft = { org_id: deal.org_id, id: deal_id };
      }
    }

    if (!draft) {
      // Try URL-based token as fallback
      const url = new URL(req.url);
      const token = url.pathname.split('/').slice(-3)[0];
      if (token && token !== 'applicationInvite') {
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
        const drafts = await base44.asServiceRole.entities.ApplicationDraft.filter({
          resume_token_hash: tokenHash
        });
        if (drafts.length > 0) draft = drafts[0];
      }
    }
    
    if (!draft) {

      return Response.json({ error: 'Application not found' }, { status: 404 });
    }

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