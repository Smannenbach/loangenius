import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import crypto from 'node:crypto';

Deno.serve(async (req) => {
  if (req.method !== 'GET') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const url = new URL(req.url);
    const token = url.searchParams.get('token');

    if (!token) {
      return Response.json({ error: 'Missing token' }, { status: 400 });
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Find magic link
    const links = await base44.asServiceRole.entities.PortalMagicLink.filter({
      token_hash: tokenHash
    });

    if (links.length === 0) {
      return Response.json({ error: 'Invalid token' }, { status: 404 });
    }

    const link = links[0];

    // Check expiration
    if (new Date(link.expires_at) < new Date()) {
      return Response.json({ error: 'Token expired' }, { status: 410 });
    }

    // Check if already used
    if (link.used_at) {
      return Response.json({ error: 'Token already used' }, { status: 410 });
    }

    // Mark link as used
    await base44.asServiceRole.entities.PortalMagicLink.update(link.id, {
      used_at: new Date().toISOString()
    });

    // Create portal session
    const sessionToken = crypto.randomBytes(32).toString('hex');
    const sessionTokenHash = crypto.createHash('sha256').update(sessionToken).digest('hex');
    const sessionExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days

    const session = await base44.asServiceRole.entities.PortalSession.create({
      org_id: link.org_id,
      borrower_email: link.borrower_email,
      deal_id: link.deal_id,
      session_token_hash: sessionTokenHash,
      expires_at: sessionExpiresAt
    });

    // Log activity
    await base44.asServiceRole.entities.ActivityLog.create({
      org_id: link.org_id,
      deal_id: link.deal_id,
      contact_id: link.borrower_email,
      action_type: 'portal_login',
      description: 'Borrower accessed portal via magic link',
      metadata_json: {}
    });

    return Response.json({
      session_ok: true,
      session_token: sessionToken,
      redirect: `/portal/deals/${link.deal_id}`,
      expires_at: sessionExpiresAt
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});