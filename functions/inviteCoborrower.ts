import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import crypto from 'node:crypto';

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {
      deal_id,
      coborrower_email,
      coborrower_first_name,
      coborrower_last_name,
      send_email = true
    } = await req.json();

    if (!deal_id || !coborrower_email) {
      return Response.json({
        error: 'Missing deal_id or coborrower_email'
      }, { status: 400 });
    }

    // Get deal
    const deal = await base44.entities.Deal.get(deal_id);
    if (!deal) {
      return Response.json({ error: 'Deal not found' }, { status: 404 });
    }

    // Check if co-borrower already exists
    const existing = await base44.entities.Borrower.filter({
      deal_id,
      email: coborrower_email
    });

    if (existing.length > 0) {
      return Response.json({
        error: 'Co-borrower already exists for this deal'
      }, { status: 409 });
    }

    // Create borrower record
    const coborrower = await base44.entities.Borrower.create({
      org_id: deal.org_id,
      deal_id,
      email: coborrower_email,
      first_name: coborrower_first_name,
      last_name: coborrower_last_name,
      is_primary: false,
      is_coborrower: true,
      status: 'invited'
    });

    // Generate magic link token
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days

    const magicLink = await base44.entities.PortalMagicLink.create({
      org_id: deal.org_id,
      deal_id,
      borrower_email: coborrower_email,
      token_hash: tokenHash,
      expires_at: expiresAt,
      created_by: user.email
    });

    // Send invitation email
    if (send_email) {
      const portalUrl = `https://portal.loangenius.local/coborrower-signin?token=${token}`;

      await base44.asServiceRole.entities.Communication.create({
        org_id: deal.org_id,
        deal_id,
        channel: 'Email',
        direction: 'Outbound',
        from_address: 'noreply@loangenius.local',
        to_address: coborrower_email,
        subject: `You're invited to sign your loan documents`,
        body: `Hi ${coborrower_first_name || 'Co-borrower'},\n\nYou've been invited as a co-borrower on a loan application. Click below to review and sign your documents:\n\n${portalUrl}\n\nThis link expires in 7 days.\n\nThanks!`,
        status: 'Queued'
      });
    }

    // Log activity
    await base44.asServiceRole.entities.ActivityLog.create({
      org_id: deal.org_id,
      deal_id,
      contact_id: coborrower_email,
      action_type: 'coborrower_invited',
      description: `Co-borrower invited: ${coborrower_email}`,
      metadata_json: { borrower_id: coborrower.id }
    });

    return Response.json({
      coborrower_id: coborrower.id,
      magic_link_id: magicLink.id,
      email_sent: send_email,
      expires_at: expiresAt
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});