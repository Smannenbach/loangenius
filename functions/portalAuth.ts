import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import crypto from 'node:crypto';

/**
 * Generate magic link token
 */
function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Hash token for storage
 */
function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
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

      if (!loanFileId || !borrowerId) {
        return Response.json({ error: 'Missing required fields' }, { status: 400 });
      }

      // Verify borrower exists
      const borrower = await base44.asServiceRole.entities.Borrower.get(borrowerId);
      if (!borrower) {
        return Response.json({ error: 'Borrower not found' }, { status: 404 });
      }

      const newToken = generateToken();
      const hashedToken = hashToken(newToken);
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

      const session = await base44.asServiceRole.entities.PortalSession.create({
        loan_file_id: loanFileId,
        borrower_id: borrowerId,
        token_hash: hashedToken,
        expires_at: expiresAt,
      });

      const portalUrl = `${Deno.env.get('APP_URL') || 'https://loangenius.app'}/BorrowerPortal?token=${newToken}`;

      return Response.json({
        success: true,
        magicLink: portalUrl,
        token: newToken,
        expiresAt,
      });
    }

    if (action === 'validateToken') {
      if (!token) {
        return Response.json({ error: 'Token required' }, { status: 400 });
      }

      const hashedToken = hashToken(token);

      // Find session with this token hash
      const sessions = await base44.asServiceRole.entities.PortalSession.filter({
        token_hash: hashedToken,
      });

      if (sessions.length === 0) {
        return Response.json({ error: 'Invalid token' }, { status: 401 });
      }

      const session = sessions[0];

      // Check expiration
      if (new Date(session.expires_at) < new Date()) {
        return Response.json({ error: 'Token expired' }, { status: 401 });
      }

      // Check if revoked
      if (session.is_revoked) {
        return Response.json({ error: 'Token revoked' }, { status: 401 });
      }

      // Update last accessed
      await base44.asServiceRole.entities.PortalSession.update(session.id, {
        last_accessed_at: new Date().toISOString(),
      });

      // Get borrower and loan info
      const borrower = await base44.asServiceRole.entities.Borrower.get(session.borrower_id);
      const loanFile = await base44.asServiceRole.entities.LoanFile.get(session.loan_file_id);

      return Response.json({
        valid: true,
        sessionId: session.id,
        borrowerId: session.borrower_id,
        loanFileId: session.loan_file_id,
        borrower: {
          id: borrower.id,
          first_name: borrower.first_name,
          last_name: borrower.last_name,
          email: borrower.email,
        },
        loanFile: {
          id: loanFile.id,
          loan_number: loanFile.loan_number,
          status: loanFile.status,
          closing_date: loanFile.closing_date,
        },
      });
    }

    if (action === 'revokeToken') {
      const user = await base44.auth.me();
      if (!user) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
      }

      if (!token) {
        return Response.json({ error: 'Token required' }, { status: 400 });
      }

      const hashedToken = hashToken(token);
      const sessions = await base44.asServiceRole.entities.PortalSession.filter({
        token_hash: hashedToken,
      });

      if (sessions.length === 0) {
        return Response.json({ error: 'Session not found' }, { status: 404 });
      }

      await base44.asServiceRole.entities.PortalSession.update(sessions[0].id, {
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