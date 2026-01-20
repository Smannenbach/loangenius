/**
 * Portal Magic Link - Generate and send magic login links
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

function generateToken() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 64; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { deal_id, borrower_email, expires_hours = 24 } = body;

    if (!deal_id || !borrower_email) {
      return Response.json({ error: 'Missing deal_id or borrower_email' }, { status: 400 });
    }

    // Get deal
    const deals = await base44.entities.Deal.filter({ id: deal_id });
    if (deals.length === 0) {
      return Response.json({ error: 'Deal not found' }, { status: 404 });
    }
    const deal = deals[0];

    // Generate token
    const token = generateToken();
    const expiresAt = new Date(Date.now() + expires_hours * 60 * 60 * 1000);

    // Create session
    await base44.asServiceRole.entities.PortalSession.create({
      org_id: deal.org_id,
      deal_id: deal_id,
      borrower_email: borrower_email,
      token: token,
      expires_at: expiresAt.toISOString(),
      is_active: true,
    });

    // Generate portal URL
    const portalUrl = `${req.headers.get('origin') || 'https://app.base44.com'}/BorrowerPortal?token=${token}`;

    // Send email
    await base44.integrations.Core.SendEmail({
      to: borrower_email,
      subject: 'Access Your Loan Portal',
      body: `
        You have been invited to access your loan portal.
        
        Click the link below to securely access your loan application:
        ${portalUrl}
        
        This link will expire in ${expires_hours} hours.
        
        If you did not request this link, please ignore this email.
      `,
    });

    return Response.json({
      success: true,
      portal_url: portalUrl,
      expires_at: expiresAt.toISOString(),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});