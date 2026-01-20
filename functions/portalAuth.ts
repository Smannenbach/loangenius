/**
 * Borrower Portal Authentication
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { action, email, token, deal_id } = body;

    if (action === 'verify_token') {
      // Verify magic link token
      const sessions = await base44.asServiceRole.entities.PortalSession.filter({
        token: token,
        is_active: true,
      });

      if (sessions.length === 0) {
        return Response.json({ error: 'Invalid or expired token' }, { status: 401 });
      }

      const session = sessions[0];
      const expiry = new Date(session.expires_at);
      if (expiry < new Date()) {
        await base44.asServiceRole.entities.PortalSession.update(session.id, { is_active: false });
        return Response.json({ error: 'Token expired' }, { status: 401 });
      }

      return Response.json({
        success: true,
        borrower_email: session.borrower_email,
        deal_id: session.deal_id,
        org_id: session.org_id,
      });
    }

    if (action === 'lookup') {
      // Look up borrower by email
      const borrowers = await base44.asServiceRole.entities.Borrower.filter({ email: email });
      if (borrowers.length === 0) {
        return Response.json({ found: false });
      }

      return Response.json({
        found: true,
        borrower_id: borrowers[0].id,
      });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});