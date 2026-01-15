import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Send magic link via email & SMS
 */
async function sendPortalInvite(base44, org_id, deal_id, borrower_id, user_email) {
  try {
    const borrower = await base44.asServiceRole.entities.Borrower.get(borrower_id);
    const deal = await base44.asServiceRole.entities.Deal.get(deal_id);
    if (!borrower || !deal) throw new Error('Borrower or deal not found');

    // Generate token
    const bytes = crypto.getRandomValues(new Uint8Array(32));
    const token = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
    
    // Hash token
    const encoder = new TextEncoder();
    const data = encoder.encode(token);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const token_hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // Create session
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    await base44.asServiceRole.entities.PortalSession.create({
      org_id,
      deal_id,
      borrower_id,
      session_token_hash: token_hash,
      expires_at: expiresAt,
    });

    // Build portal URL
    const portalUrl = `https://apply.loangenius.ai/portal/login?token=${token}`;
    
    // Send email via SendGrid
    await base44.integrations.Core.SendEmail({
      to: borrower.email,
      subject: `Your ${deal.deal_number} Loan Application Portal`,
      body: `Hi ${borrower.first_name},\n\nAccess your secure loan portal:\n${portalUrl}\n\nThis link expires in 7 days.`,
    });

    // Send SMS if opted in
    if (borrower.phone && !borrower.sms_opt_out) {
      const shortLink = `bit.ly/${Math.random().toString(36).substr(2, 6)}`;
      // Would integrate with Twilio here
      console.log(`SMS to ${borrower.phone}: Access your loan: ${shortLink}`);
    }

    return { success: true, expires_at: expiresAt };
  } catch (error) {
    console.error('Send invite error:', error);
    throw error;
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { action, org_id, deal_id, borrower_id } = await req.json();

    if (!action) {
      return Response.json({ error: 'Missing action' }, { status: 400 });
    }

    if (action === 'sendInvite') {
      if (!deal_id || !borrower_id) {
        return Response.json({ error: 'Missing deal_id or borrower_id' }, { status: 400 });
      }

      // Get org_id from user's membership
      const memberships = await base44.asServiceRole.entities.OrgMembership.filter({
        user_id: user.email,
      });
      if (memberships.length === 0) {
        return Response.json({ error: 'User not part of any organization' }, { status: 403 });
      }

      const final_org_id = memberships[0].org_id;
      const result = await sendPortalInvite(base44, final_org_id, deal_id, borrower_id, user.email);
      return Response.json(result);
    }

    if (action === 'resendInvite') {
      if (!deal_id || !borrower_id) {
        return Response.json({ error: 'Missing deal_id or borrower_id' }, { status: 400 });
      }

      // Revoke old sessions
      const oldSessions = await base44.asServiceRole.entities.PortalSession.filter({
        deal_id,
        borrower_id,
        is_revoked: false,
      });

      for (const session of oldSessions) {
        await base44.asServiceRole.entities.PortalSession.update(session.id, {
          is_revoked: true,
        });
      }

      // Get org_id from user's membership
      const memberships = await base44.asServiceRole.entities.OrgMembership.filter({
        user_id: user.email,
      });
      if (memberships.length === 0) {
        return Response.json({ error: 'User not part of any organization' }, { status: 403 });
      }

      // Send new invite
      const result = await sendPortalInvite(base44, memberships[0].org_id, deal_id, borrower_id, user.email);
      return Response.json(result);
    }

    if (action === 'validateAndCreateSession') {
      const { token } = await req.json();
      if (!token) {
        return Response.json({ error: 'Token required' }, { status: 400 });
      }

      // Hash incoming token
      const encoder = new TextEncoder();
      const data = encoder.encode(token);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const token_hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      // Find session
      const sessions = await base44.asServiceRole.entities.PortalSession.filter({
        session_token_hash: token_hash,
      });

      if (sessions.length === 0) {
        return Response.json({ error: 'Invalid token' }, { status: 401 });
      }

      const session = sessions[0];

      // Check expiration and revocation
      if (new Date(session.expires_at) < new Date()) {
        return Response.json({ error: 'Link expired' }, { status: 401 });
      }

      if (session.is_revoked) {
        return Response.json({ error: 'Link revoked' }, { status: 401 });
      }

      // Update session
      const sessionExpires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      await base44.asServiceRole.entities.PortalSession.update(session.id, {
        last_accessed_at: new Date().toISOString(),
      });

      return Response.json({
        valid: true,
        sessionId: session.id,
        orgId: session.org_id,
        dealId: session.deal_id,
        borrowerId: session.borrower_id,
      });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Portal magic link error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});