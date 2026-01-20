/**
 * AI Lender Matcher - Match deals to best lender partners
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const memberships = await base44.entities.OrgMembership.filter({ user_id: user.email });
    if (memberships.length === 0) return Response.json({ error: 'No organization' }, { status: 403 });
    const orgId = memberships[0].org_id;

    const body = await req.json();
    const { deal_id } = body;

    if (!deal_id) {
      return Response.json({ error: 'Missing deal_id' }, { status: 400 });
    }

    // Get deal data
    const deals = await base44.entities.Deal.filter({ id: deal_id, org_id: orgId });
    if (deals.length === 0) {
      return Response.json({ error: 'Deal not found' }, { status: 404 });
    }
    const deal = deals[0];

    // Get lender integrations
    const lenders = await base44.entities.LenderIntegration.filter({
      org_id: orgId,
      status: 'active',
    });

    if (lenders.length === 0) {
      return Response.json({
        success: true,
        matches: [],
        message: 'No active lender integrations configured',
      });
    }

    // Filter lenders by criteria
    const matches = lenders.filter(lender => {
      // Check supported products
      if (lender.supported_products && !lender.supported_products.includes(deal.loan_product)) {
        return false;
      }

      // Check loan amount range
      if (lender.min_loan_amount && deal.loan_amount < lender.min_loan_amount) {
        return false;
      }
      if (lender.max_loan_amount && deal.loan_amount > lender.max_loan_amount) {
        return false;
      }

      // Check LTV
      if (lender.max_ltv && deal.ltv > lender.max_ltv) {
        return false;
      }

      // Check DSCR
      if (lender.min_dscr && deal.dscr < lender.min_dscr) {
        return false;
      }

      return true;
    });

    // Score matches
    const scoredMatches = matches.map(lender => ({
      lender_id: lender.id,
      lender_name: lender.lender_name,
      score: 100, // Simple scoring - can enhance with AI
      reasons: ['Product match', 'LTV within range', 'DSCR meets minimum'],
      pricing_sheet_url: lender.pricing_sheet_url,
    }));

    return Response.json({
      success: true,
      deal_id: deal_id,
      matches: scoredMatches.slice(0, 5), // Top 5
      total_lenders_checked: lenders.length,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});