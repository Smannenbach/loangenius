/**
 * Convert Lead to Loan Application
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

    const resolveResponse = await base44.functions.invoke('resolveOrgId', { auto_create: false });
    const orgData = resolveResponse.data;
    if (!orgData.ok) return Response.json({ ok: false, error: 'No organization' }, { status: 403 });
    const orgId = orgData.org_id;

    const body = await req.json();
    const { lead_id } = body;

    if (!lead_id) {
      return Response.json({ ok: false, error: 'Missing lead_id' }, { status: 400 });
    }

    const leads = await base44.entities.Lead.filter({ id: lead_id, org_id: orgId });
    if (leads.length === 0) {
      return Response.json({ ok: false, error: 'Lead not found' }, { status: 404 });
    }
    const lead = leads[0];

    // Create borrower from lead
    const borrower = await base44.asServiceRole.entities.Borrower.create({
      org_id: orgId,
      first_name: lead.first_name,
      last_name: lead.last_name,
      email: lead.home_email,
      mobile_phone: lead.mobile_phone,
      credit_score: lead.fico_score,
    });

    // Create deal
    const dealNumber = `LG-${new Date().toISOString().slice(0, 7).replace('-', '')}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
    
    const deal = await base44.asServiceRole.entities.Deal.create({
      org_id: orgId,
      deal_number: dealNumber,
      loan_product: lead.loan_type || 'DSCR',
      loan_purpose: lead.loan_purpose || 'Purchase',
      loan_amount: lead.loan_amount,
      stage: 'application',
      status: 'active',
      application_date: new Date().toISOString().split('T')[0],
      assigned_to_user_id: user.email,
      primary_borrower_id: borrower.id,
    });

    // Link borrower to deal
    await base44.asServiceRole.entities.DealBorrower.create({
      org_id: orgId,
      deal_id: deal.id,
      borrower_id: borrower.id,
      is_primary: true,
      borrower_email: borrower.email,
    });

    // Update lead status
    await base44.entities.Lead.update(lead_id, {
      status: 'converted',
      converted_at: new Date().toISOString(),
    });

    return Response.json({
      ok: true,
      deal_id: deal.id,
      deal_number: dealNumber,
      borrower_id: borrower.id,
    });
  } catch (error) {
    console.error('convertLeadToLoanApp error:', error);
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }
});