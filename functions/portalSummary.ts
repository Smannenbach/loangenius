import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Get deal summary for portal display
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { sessionId } = await req.json();

    if (!sessionId) {
      return Response.json({ error: 'Session ID required' }, { status: 400 });
    }

    const session = await base44.asServiceRole.entities.PortalSession.get(sessionId);
    if (!session || session.is_revoked || new Date(session.expires_at) < new Date()) {
      return Response.json({ error: 'Invalid session' }, { status: 401 });
    }

    const deal = await base44.asServiceRole.entities.Deal.get(session.deal_id);
    if (!deal || deal.org_id !== session.org_id) {
      return Response.json({ error: 'Deal not found' }, { status: 404 });
    }

    const borrowers = await base44.asServiceRole.entities.DealBorrower.filter({
      org_id: session.org_id,
      deal_id: session.deal_id,
    });

    const properties = await base44.asServiceRole.entities.DealProperty.filter({
      org_id: session.org_id,
      deal_id: session.deal_id,
    });

    return Response.json({
      id: deal.id,
      deal_number: deal.deal_number,
      loan_product: deal.loan_product,
      loan_purpose: deal.loan_purpose,
      stage: deal.stage,
      status: deal.status,
      loan_amount: deal.loan_amount,
      interest_rate: deal.interest_rate,
      loan_term_months: deal.loan_term_months,
      ltv: deal.ltv,
      dscr: deal.dscr,
      borrowers: borrowers.length,
      properties: properties.length,
      created_date: deal.created_date,
    });
  } catch (error) {
    console.error('Portal summary error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});