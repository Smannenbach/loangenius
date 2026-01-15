import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Generate magic link token (Deno crypto - async)
 */
async function generateToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Hash token for storage (Deno SubtleCrypto - async)
 */
async function hashToken(token) {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Main endpoint
 */
Deno.serve(async (req) => {
  try {
    const { action, loanFileId, borrowerId, token } = await req.json();

    // No authentication required for public actions
    const base44 = createClientFromRequest(req);

    if (action === 'createMagicLink') {
      // Admin only - create magic link for borrower
      const user = await base44.auth.me();
      if (!user || user.role !== 'admin') {
        return Response.json({ error: 'Unauthorized' }, { status: 403 });
      }

      const { org_id, deal_id, borrower_id } = await req.json();
      if (!org_id || !deal_id || !borrower_id) {
        return Response.json({ error: 'Missing required fields: org_id, deal_id, borrower_id' }, { status: 400 });
      }

      const newToken = await generateToken();
      const hashedToken = await hashToken(newToken);
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

      const session = await base44.asServiceRole.entities.PortalSession.create({
        org_id,
        deal_id,
        borrower_id,
        session_token_hash: hashedToken,
        expires_at: expiresAt,
      });

      const portalUrl = `${Deno.env.get('APP_URL') || 'https://loangenius.app'}/BorrowerPortalLogin?token=${newToken}`;

      return Response.json({
        success: true,
        magicLink: portalUrl,
        token: newToken,
        expiresAt,
      });
    }

    if (action === 'validateToken' || action === 'validateAndCreateSession') {
      if (!token) {
        return Response.json({ error: 'Token required' }, { status: 400 });
      }

      const hashedToken = await hashToken(token);

      // Find session with this token hash
      const sessions = await base44.asServiceRole.entities.PortalSession.filter({
        session_token_hash: hashedToken,
      });

      if (sessions.length === 0) {
        return Response.json({ error: 'Invalid token', valid: false }, { status: 401 });
      }

      const session = sessions[0];

      // Check expiration
      if (new Date(session.expires_at) < new Date()) {
        return Response.json({ error: 'Token expired', valid: false }, { status: 401 });
      }

      // Check if revoked
      if (session.is_revoked) {
        return Response.json({ error: 'Token revoked', valid: false }, { status: 401 });
      }

      // Update last accessed
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

    if (action === 'getSession') {
      const { sessionId } = await req.json();
      if (!sessionId) {
        return Response.json({ error: 'Session ID required' }, { status: 400 });
      }

      const session = await base44.asServiceRole.entities.PortalSession.get(sessionId);
      if (!session) {
        return Response.json({ error: 'Session not found' }, { status: 404 });
      }

      if (session.is_revoked || new Date(session.expires_at) < new Date()) {
        return Response.json({ error: 'Session expired or revoked' }, { status: 401 });
      }

      const deal = await base44.asServiceRole.entities.Deal.get(session.deal_id);
      const borrower = await base44.asServiceRole.entities.Borrower.get(session.borrower_id);

      return Response.json({
        sessionId: session.id,
        dealId: session.deal_id,
        borrowerId: session.borrower_id,
        orgId: session.org_id,
        deal: deal ? { id: deal.id, deal_number: deal.deal_number, stage: deal.stage } : null,
        borrower: borrower ? { id: borrower.id, first_name: borrower.first_name, last_name: borrower.last_name, email: borrower.email } : null,
      });
    }

    if (action === 'revokeSession') {
      const user = await base44.auth.me();
      if (!user) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const { session_id } = await req.json();
      if (!session_id) {
        return Response.json({ error: 'Session ID required' }, { status: 400 });
      }

      const session = await base44.asServiceRole.entities.PortalSession.get(session_id);
      if (!session) {
        return Response.json({ error: 'Session not found' }, { status: 404 });
      }

      await base44.asServiceRole.entities.PortalSession.update(session_id, {
        is_revoked: true,
      });

      return Response.json({ success: true });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Portal auth error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});