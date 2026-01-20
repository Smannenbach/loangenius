/**
 * Portal Auth - Authenticate borrower for portal access
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { token, email, deal_id } = body;

    if (!token && !email) {
      return Response.json({ ok: false, error: 'Missing token or email' }, { status: 400 });
    }

    // Validate magic link token
    if (token) {
      const links = await base44.asServiceRole.entities.PortalMagicLink.filter({ token });
      if (links.length === 0) {
        return Response.json({ ok: false, error: 'Invalid or expired token' }, { status: 401 });
      }
      
      const link = links[0];
      if (new Date(link.expires_at) < new Date()) {
        return Response.json({ ok: false, error: 'Token expired' }, { status: 401 });
      }

      return Response.json({
        ok: true,
        authenticated: true,
        borrower_email: link.borrower_email,
        deal_id: link.deal_id,
      });
    }

    // Email-based lookup
    if (email) {
      const borrowers = await base44.asServiceRole.entities.Borrower.filter({ email: email.toLowerCase() });
      if (borrowers.length === 0) {
        // SECURITY FIX: Use generic error message to prevent user enumeration
        return Response.json({ ok: false, error: 'Invalid credentials' }, { status: 401 });
      }

      return Response.json({
        ok: true,
        authenticated: false,
        borrower_id: borrowers[0].id,
        message: 'Magic link required for full access',
      });
    }

    return Response.json({ ok: false, error: 'Invalid request' }, { status: 400 });
  } catch (error) {
    console.error('portalAuth error:', error);
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }
});