/**
 * Portal Magic Link Service
 * Handles sending magic links to borrowers via email/SMS for passwordless auth
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { logActivity } from './auditLogHelper.js';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, deal_id, org_id, data } = await req.json();

    if (!action || !deal_id || !org_id) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    let result;

    switch (action) {
      case 'send_magic_link':
        result = await sendMagicLink(base44, org_id, deal_id, data, user);
        break;
      case 'exchange_token':
        result = await exchangeToken(base44, org_id, data);
        break;
      default:
        return Response.json({ error: 'Invalid action' }, { status: 400 });
    }

    return Response.json(result);
  } catch (error) {
    console.error('Error in portalMagicLink:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function sendMagicLink(base44, org_id, deal_id, data, user) {
  const { borrower_email, channel = 'email', template = 'default' } = data;

  if (!borrower_email) {
    throw new Error('Missing borrower_email');
  }

  // Generate token
  const token = crypto.randomUUID();
  const tokenHash = await sha256Hash(token);
  const expiresAt = new Date(Date.now() + 24 * 3600 * 1000).toISOString();

  // Create magic link record
  const magicLink = await base44.asServiceRole.entities.PortalMagicLink.create({
    org_id,
    deal_id,
    borrower_email,
    token_hash: tokenHash,
    channel,
    expires_at: expiresAt,
    created_by_user_id: user.id
  });

  const portalUrl = `${Deno.env.get('APP_URL') || 'https://app.loangenius.io'}/portal/login?token=${token}&deal=${deal_id}`;

  // Send message
  if (channel === 'email') {
    const body = template === 'default'
      ? `Click here to access your loan documents: ${portalUrl}\n\nThis link expires in 24 hours.`
      : `Your documents are ready for review. Access them here: ${portalUrl}`;

    await base44.integrations.Core.SendEmail({
      to: borrower_email,
      subject: 'Your Loan Documents Portal Access',
      body
    });
  }
  // SMS would use Twilio integration (not implemented here; would require secrets)

  // Log communication
  await base44.asServiceRole.entities.Communication.create({
    org_id,
    deal_id,
    borrower_id: borrower_email, // Using email as identifier
    channel: channel === 'email' ? 'Email' : 'SMS',
    direction: 'Outbound',
    from_address: user.email,
    to_address: borrower_email,
    subject: 'Portal Access Link',
    body: `Magic link sent for portal access`,
    status: 'Sent',
    provider: 'Internal'
  });

  // Log activity
  await logActivity(base44, {
    deal_id,
    activity_type: 'Email_Sent',
    title: 'Portal access link sent',
    description: `Magic link sent to ${borrower_email}`,
    icon: '📧',
    color: 'blue'
  });

  return {
    success: true,
    magic_link_id: magicLink.id,
    sent_to: borrower_email,
    expires_at: expiresAt,
    portal_url: portalUrl
  };
}

async function exchangeToken(base44, org_id, data) {
  const { token, deal_id } = data;

  if (!token || !deal_id) {
    throw new Error('Missing token or deal_id');
  }

  const tokenHash = await sha256Hash(token);

  // Find magic link
  const links = await base44.asServiceRole.entities.PortalMagicLink.filter({
    deal_id,
    token_hash: tokenHash
  });

  if (!links.length) {
    throw new Error('Invalid or expired token');
  }

  const link = links[0];

  // Check expiration
  if (new Date(link.expires_at) < new Date()) {
    throw new Error('Token expired');
  }

  // Mark as used
  await base44.asServiceRole.entities.PortalMagicLink.update(link.id, {
    used_at: new Date().toISOString()
  });

  // Create session
  const sessionToken = crypto.randomUUID();
  const sessionTokenHash = await sha256Hash(sessionToken);
  const sessionExpiresAt = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(); // 7 days

  const session = await base44.asServiceRole.entities.PortalSession.create({
    org_id,
    deal_id,
    borrower_email: link.borrower_email,
    session_token_hash: sessionTokenHash,
    expires_at: sessionExpiresAt,
    last_activity_at: new Date().toISOString()
  });

  return {
    success: true,
    session_token: sessionToken, // Send to client; will be stored in httpOnly cookie
    session_id: session.id,
    expires_at: sessionExpiresAt,
    redirect: `/portal/deals/${deal_id}`
  };
}

async function sha256Hash(input) {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}