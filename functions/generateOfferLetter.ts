import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { deal_id, action = 'generate' } = await req.json();

    if (!deal_id) {
      return Response.json({ error: 'deal_id is required' }, { status: 400 });
    }

    // Fetch deal data
    const deals = await base44.asServiceRole.entities.Deal.filter({ id: deal_id });
    const deal = deals[0];
    
    if (!deal) {
      return Response.json({ error: 'Deal not found' }, { status: 404 });
    }

    // Fetch borrower data
    const dealBorrowers = await base44.asServiceRole.entities.DealBorrower.filter({ deal_id });
    let borrower = null;
    if (dealBorrowers.length > 0) {
      const borrowers = await base44.asServiceRole.entities.Borrower.filter({ id: dealBorrowers[0].borrower_id });
      borrower = borrowers[0];
    }

    // Fetch property data
    const dealProperties = await base44.asServiceRole.entities.DealProperty.filter({ deal_id });
    let property = null;
    if (dealProperties.length > 0) {
      const properties = await base44.asServiceRole.entities.Property.filter({ id: dealProperties[0].property_id });
      property = properties[0];
    }

    // Calculate key metrics
    const loanAmount = deal.loan_amount || 0;
    const propertyValue = deal.appraised_value || property?.estimated_value || 0;
    const ltv = propertyValue > 0 ? ((loanAmount / propertyValue) * 100).toFixed(1) : 0;
    const interestRate = deal.interest_rate || 7.5;
    const loanTerm = deal.loan_term_months || 360;
    
    // Calculate monthly payment (P&I)
    const monthlyRate = interestRate / 100 / 12;
    const numPayments = loanTerm;
    const monthlyPI = loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / (Math.pow(1 + monthlyRate, numPayments) - 1);

    // Calculate DSCR
    const monthlyRent = property?.gross_rent_monthly || 0;
    const monthlyExpenses = (property?.taxes_monthly || 0) + (property?.insurance_monthly || 0) + (property?.hoa_monthly || 0);
    const monthlyPITIA = monthlyPI + monthlyExpenses;
    const dscr = monthlyRent > 0 && monthlyPITIA > 0 ? (monthlyRent / monthlyPITIA).toFixed(2) : 'N/A';

    // Generate offer letter using AI
    const prompt = `Generate a professional loan offer letter for a ${deal.loan_product || 'DSCR'} loan with the following details:

BORROWER:
- Name: ${borrower?.first_name || 'Borrower'} ${borrower?.last_name || ''}
- Credit Score: ${borrower?.credit_score || 'Not provided'}

LOAN TERMS:
- Loan Product: ${deal.loan_product || 'DSCR'}
- Loan Purpose: ${deal.loan_purpose || 'Purchase'}
- Loan Amount: $${loanAmount.toLocaleString()}
- Interest Rate: ${interestRate}%
- Loan Term: ${loanTerm / 12} years
- Estimated Monthly P&I: $${monthlyPI.toFixed(2)}
- LTV: ${ltv}%
- DSCR: ${dscr}

PROPERTY:
- Address: ${property?.address_street || 'TBD'}, ${property?.address_city || ''}, ${property?.address_state || ''} ${property?.address_zip || ''}
- Property Type: ${property?.property_type || deal.property_type || 'SFR'}
- Estimated Value: $${propertyValue.toLocaleString()}
- Monthly Rent: $${monthlyRent.toLocaleString()}

PREPAYMENT:
- Prepayment Penalty: ${deal.prepay_penalty_type || '5-4-3-2-1'}
- Prepayment Term: ${deal.prepay_penalty_term_months || 60} months

Please generate a formal, professional offer letter that:
1. Addresses the borrower by name
2. States we are pleased to offer financing
3. Summarizes the key loan terms in a clear table format
4. Lists standard conditions (subject to appraisal, title, insurance, etc.)
5. Includes an expiration date (14 days from today)
6. Has a professional closing

Format it as a clean, professional letter with proper spacing.`;

    const offerResponse = await base44.integrations.Core.InvokeLLM({
      prompt,
      add_context_from_internet: false,
    });

    // Generate term sheet data
    const termSheetData = {
      deal_id,
      generated_at: new Date().toISOString(),
      generated_by: user.email,
      borrower: {
        name: `${borrower?.first_name || ''} ${borrower?.last_name || ''}`.trim(),
        email: borrower?.email,
        credit_score: borrower?.credit_score,
      },
      property: {
        address: property ? `${property.address_street}, ${property.address_city}, ${property.address_state} ${property.address_zip}` : 'TBD',
        type: property?.property_type || deal.property_type,
        value: propertyValue,
        monthly_rent: monthlyRent,
      },
      loan_terms: {
        product: deal.loan_product || 'DSCR',
        purpose: deal.loan_purpose || 'Purchase',
        amount: loanAmount,
        interest_rate: interestRate,
        term_months: loanTerm,
        ltv: parseFloat(ltv),
        dscr: dscr,
        monthly_pi: monthlyPI,
        monthly_pitia: monthlyPITIA,
        prepay_type: deal.prepay_penalty_type || '5-4-3-2-1',
        amortization: deal.amortization_type || 'fixed',
        is_interest_only: deal.is_interest_only || false,
        io_period_months: deal.interest_only_period_months || 0,
      },
      conditions: [
        'Satisfactory appraisal',
        'Clear title report',
        'Proof of hazard insurance',
        'Verification of rental income',
        'Entity documents (if applicable)',
        'Bank statements for reserves',
      ],
      expiration_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'draft',
    };

    return Response.json({
      success: true,
      offer_letter: offerResponse,
      term_sheet: termSheetData,
      metrics: {
        loan_amount: loanAmount,
        interest_rate: interestRate,
        ltv: parseFloat(ltv),
        dscr,
        monthly_pi: monthlyPI,
        monthly_pitia: monthlyPITIA,
      }
    });

  } catch (error) {
    console.error('Generate offer letter error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});