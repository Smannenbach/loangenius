import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Get deal summary for portal display (using session token)
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { sessionId } = await req.json();

    if (!sessionId) {
      return Response.json({ error: 'Session ID required' }, { status: 400 });
    }

    // Get session
    const session = await base44.asServiceRole.entities.PortalSession.get(sessionId);
    if (!session) {
      return Response.json({ error: 'Session not found' }, { status: 404 });
    }

    // Verify not revoked/expired
    if (session.is_revoked || new Date(session.expires_at) < new Date()) {
      return Response.json({ error: 'Session invalid' }, { status: 401 });
    }

    // Get deal
    const deal = await base44.asServiceRole.entities.Deal.get(session.deal_id);
    if (!deal) {
      return Response.json({ error: 'Deal not found' }, { status: 404 });
    }

    // Get borrower
    const borrower = await base44.asServiceRole.entities.Borrower.get(session.borrower_id);

    // Get properties
    const dealProperties = await base44.asServiceRole.entities.DealProperty.filter({
      deal_id: deal.id,
    });

    const properties = await Promise.all(
      dealProperties.map(dp => base44.asServiceRole.entities.Property.get(dp.property_id))
    );

    // Update last accessed
    await base44.asServiceRole.entities.PortalSession.update(sessionId, {
      last_accessed_at: new Date().toISOString(),
    });

    return Response.json({
      success: true,
      deal: {
        id: deal.id,
        deal_number: deal.deal_number,
        stage: deal.stage,
        loan_product: deal.loan_product,
        loan_purpose: deal.loan_purpose,
        loan_amount: deal.loan_amount,
        interest_rate: deal.interest_rate,
        loan_term_months: deal.loan_term_months,
        dscr: deal.dscr,
        ltv: deal.ltv,
        monthly_pitia: deal.monthly_pitia,
      },
      borrower: {
        id: borrower.id,
        first_name: borrower.first_name,
        last_name: borrower.last_name,
        email: borrower.email,
        phone: borrower.phone,
      },
      properties: properties.map(p => ({
        id: p.id,
        address_street: p.address_street,
        address_city: p.address_city,
        address_state: p.address_state,
        address_zip: p.address_zip,
        gross_rent_monthly: p.gross_rent_monthly,
      })),
    });
  } catch (error) {
    console.error('Portal summary error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});