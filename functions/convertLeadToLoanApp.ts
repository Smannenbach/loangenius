/**
 * Convert Lead to Loan Application
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
    const { lead_id } = body;

    if (!lead_id) {
      return Response.json({ error: 'Missing lead_id' }, { status: 400 });
    }

    // Get lead
    const leads = await base44.entities.Lead.filter({ id: lead_id, org_id: orgId });
    if (leads.length === 0) {
      return Response.json({ error: 'Lead not found' }, { status: 404 });
    }
    const lead = leads[0];

    // Generate deal number
    const now = new Date();
    const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const existingDeals = await base44.entities.Deal.filter({ org_id: orgId });
    const sequenceNum = String(existingDeals.length + 1).padStart(4, '0');
    const dealNumber = `LG-${yearMonth}-${sequenceNum}`;

    // Create deal from lead data
    const deal = await base44.entities.Deal.create({
      org_id: orgId,
      deal_number: dealNumber,
      loan_product: lead.loan_type || 'DSCR',
      loan_purpose: lead.loan_purpose,
      loan_amount: lead.loan_amount,
      stage: 'inquiry',
      status: 'draft',
      application_channel: 'lo_portal',
    });

    // Create borrower
    const borrower = await base44.entities.Borrower.create({
      org_id: orgId,
      first_name: lead.first_name,
      last_name: lead.last_name,
      email: lead.home_email,
      phone: lead.mobile_phone,
      fico_score: lead.fico_score,
    });

    // Link borrower to deal
    await base44.entities.DealBorrower.create({
      deal_id: deal.id,
      borrower_id: borrower.id,
      is_primary: true,
    });

    // Create property if we have address
    if (lead.property_street) {
      const property = await base44.entities.Property.create({
        org_id: orgId,
        street_address: lead.property_street,
        city: lead.property_city,
        state: lead.property_state,
        zip_code: lead.property_zip,
        county: lead.property_county,
        property_type: lead.property_type,
        estimated_value: lead.estimated_value,
      });

      await base44.entities.DealProperty.create({
        deal_id: deal.id,
        property_id: property.id,
        is_subject: true,
      });
    }

    // Update lead status
    await base44.entities.Lead.update(lead_id, {
      status: 'converted',
    });

    return Response.json({
      success: true,
      deal_id: deal.id,
      deal_number: dealNumber,
      borrower_id: borrower.id,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});