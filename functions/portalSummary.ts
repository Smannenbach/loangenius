/**
 * Portal Summary - Get borrower's deal summary for portal
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { borrower_email, deal_id } = body;

    if (!borrower_email && !deal_id) {
      return Response.json({ ok: false, error: 'Missing borrower_email or deal_id' }, { status: 400 });
    }

    let deals = [];

    if (deal_id) {
      deals = await base44.asServiceRole.entities.Deal.filter({ id: deal_id });
    } else if (borrower_email) {
      // Find borrower's deals
      const dealBorrowers = await base44.asServiceRole.entities.DealBorrower.filter({});
      const borrowerDeals = dealBorrowers.filter(db => 
        db.borrower_email?.toLowerCase() === borrower_email.toLowerCase()
      );
      
      for (const db of borrowerDeals) {
        const d = await base44.asServiceRole.entities.Deal.filter({ id: db.deal_id });
        if (d.length > 0) deals.push(d[0]);
      }
    }

    if (deals.length === 0) {
      return Response.json({ ok: false, error: 'No deals found' }, { status: 404 });
    }

    const deal = deals[0];

    // Get pending documents
    const docReqs = await base44.asServiceRole.entities.DealDocumentRequirement.filter({
      deal_id: deal.id,
      status: 'pending',
    });

    // Get conditions
    const conditions = await base44.asServiceRole.entities.Condition.filter({
      deal_id: deal.id,
    });

    return Response.json({
      ok: true,
      deal: {
        id: deal.id,
        deal_number: deal.deal_number,
        loan_product: deal.loan_product,
        loan_amount: deal.loan_amount,
        stage: deal.stage,
        status: deal.status,
      },
      pending_documents: docReqs.length,
      conditions_count: conditions.length,
      conditions_pending: conditions.filter(c => c.status === 'pending').length,
    });
  } catch (error) {
    console.error('portalSummary error:', error);
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }
});