/**
 * Invite Co-Borrower
 * Generates magic link + sends invitation email
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { org_id, application_id, co_borrower_email } = await req.json();

    if (!org_id || !application_id || !co_borrower_email) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Fetch application
    const apps = await base44.asServiceRole.entities.LoanApplication.filter({
      id: application_id
    });

    if (!apps.length) {
      return Response.json({ error: 'Application not found' }, { status: 404 });
    }

    const app = apps[0];

    // Generate token + magic link
    const token = crypto.randomUUID();
    const tokenHash = await hashString(token);
    const expiresAt = new Date(Date.now() + 24 * 3600 * 1000).toISOString();

    const magicLink = await base44.asServiceRole.entities.PortalMagicLink.create({
      org_id,
      deal_id: app.deal_id || application_id,
      borrower_email: co_borrower_email,
      token_hash: tokenHash,
      expires_at: expiresAt,
      created_by_user_id: user.id
    });

    const portalUrl = `${Deno.env.get('APP_URL') || 'https://app.loangenius.io'}/portal/login?token=${token}`;

    // Send email
    await base44.integrations.Core.SendEmail({
      to: co_borrower_email,
      subject: 'You\'ve been invited to join the loan application',
      body: `Dear Co-Borrower,\n\nYou've been invited to join a loan application. Click the link below to get started:\n\n${portalUrl}\n\nThis link expires in 24 hours.\n\nBest regards,\nLoanGenius`
    });

    // Update application with co-borrower
    const currentCoBorrowers = app.co_borrower_emails || [];
    if (!currentCoBorrowers.includes(co_borrower_email)) {
      currentCoBorrowers.push(co_borrower_email);
      await base44.asServiceRole.entities.LoanApplication.update(application_id, {
        co_borrower_emails: currentCoBorrowers
      });
    }

    return Response.json({
      success: true,
      magic_link_id: magicLink.id,
      co_borrower_email,
      expires_at: expiresAt,
      portal_url: portalUrl
    });
  } catch (error) {
    console.error('Error in inviteCoborrower:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function hashString(str) {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}