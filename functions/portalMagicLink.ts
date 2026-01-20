/**
 * Portal Magic Link - Generate magic link for borrower portal access
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

function generateToken() {
  return crypto.randomUUID();
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { deal_id, borrower_email } = body;

    if (!deal_id || !borrower_email) {
      return Response.json({ ok: false, error: 'Missing deal_id or borrower_email' }, { status: 400 });
    }

    const deals = await base44.entities.Deal.filter({ id: deal_id });
    if (deals.length === 0) {
      return Response.json({ ok: false, error: 'Deal not found' }, { status: 404 });
    }

    const token = generateToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await base44.asServiceRole.entities.PortalMagicLink.create({
      org_id: deals[0].org_id,
      deal_id,
      borrower_email: borrower_email.toLowerCase(),
      token,
      expires_at: expiresAt.toISOString(),
      is_used: false,
    });

    const origin = req.headers.get('origin') || 'https://app.loangenius.com';
    const magicUrl = `${origin}/BorrowerPortalLogin?token=${token}`;

    // Send email with magic link
    await base44.integrations.Core.SendEmail({
      to: borrower_email,
      subject: 'Access Your Loan Application Portal',
      body: `
Hello,

Click the link below to access your loan application portal:

${magicUrl}

This link expires in 24 hours.

If you did not request this, please ignore this email.

Thank you,
LoanGenius Team
      `,
    });

    return Response.json({
      ok: true,
      magic_url: magicUrl,
      expires_at: expiresAt.toISOString(),
    });
  } catch (error) {
    console.error('portalMagicLink error:', error);
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }
});