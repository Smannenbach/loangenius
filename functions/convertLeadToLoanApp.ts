import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Convert lead to loan application with all data carried over
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { lead_id } = await req.json();

    if (!lead_id) {
      return Response.json({ error: 'Missing lead_id' }, { status: 400 });
    }

    // Get the lead
    const leads = await base44.entities.Lead.filter({ 
      org_id: user.org_id,
      is_deleted: false 
    });
    const lead = leads.find(l => l.id === lead_id);

    if (!lead) {
      return Response.json({ error: 'Lead not found' }, { status: 404 });
    }

    // Prepare borrower data
    const borrowerData = {
      first_name: lead.first_name || '',
      last_name: lead.last_name || '',
      email: lead.home_email || lead.work_email || '',
      phone: lead.mobile_phone || lead.home_phone || '',
      fico_score: lead.fico_score,
    };

    // Prepare property data
    const propertyData = {
      address_street: lead.property_street || '',
      address_city: lead.property_city || '',
      address_state: lead.property_state || '',
      address_zip: lead.property_zip || '',
      county: lead.property_county || '',
      country: lead.property_country || 'USA',
      property_type: lead.property_type,
      occupancy_type: lead.occupancy,
      estimated_value: lead.estimated_value,
      year_built: null,
      gross_rent_monthly: lead.monthly_rental_income,
    };

    // Prepare loan data
    const loanData = {
      loan_amount: lead.loan_amount,
      loan_product: lead.loan_type,
      loan_purpose: lead.loan_purpose,
      interest_rate: lead.current_rate,
      loan_term_months: null,
      existing_loan_balance: lead.current_balance,
      cash_out_amount: lead.cashout_amount,
    };

    // Create loan application
    const loanApp = await base44.entities.LoanApplication.create({
      org_id: user.org_id || user.id,
      primary_borrower_email: borrowerData.email,
      status: 'draft',
      current_step: 1,
      progress_percent: 0,
      borrower_data_json: borrowerData,
      property_data_json: propertyData,
      loan_data_json: loanData,
      last_saved_at: new Date().toISOString(),
    });

    // Update lead status to converted
    await base44.entities.Lead.update(lead_id, { status: 'converted' });

    return Response.json({
      success: true,
      loan_application_id: loanApp.id,
      message: 'Lead converted to loan application successfully',
    });
  } catch (error) {
    console.error('Conversion error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});