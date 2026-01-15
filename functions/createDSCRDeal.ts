import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * DSCR Deal Creation Workflow
 * - Upsert Property
 * - Upsert Borrower
 * - Create Deal
 * - Create deal_properties + deal_borrowers
 * - Compute DSCR, LTV, PITIA
 * - Generate document requirements + conditions
 * - Log activity
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {
      org_id,
      loanData,
      propertyData,
      borrowerData,
      entityData,
    } = await req.json();

    // Verify org_id matches user's org
    const membership = await base44.asServiceRole.entities.OrgMembership.filter({
      org_id,
      user_id: user.email,
    });
    if (membership.length === 0) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 1. Create/upsert Property
    const property = await base44.asServiceRole.entities.Property.create({
      org_id,
      address_street: propertyData.address_street,
      address_city: propertyData.address_city,
      address_state: propertyData.address_state,
      address_zip: propertyData.address_zip,
      property_type: propertyData.property_type,
      county: propertyData.county,
      year_built: propertyData.year_built,
      sqft: propertyData.sqft,
      beds: propertyData.beds,
      baths: propertyData.baths,
      gross_rent_monthly: propertyData.gross_rent_monthly,
      taxes_monthly: propertyData.taxes_monthly,
      insurance_monthly: propertyData.insurance_monthly,
      hoa_monthly: propertyData.hoa_monthly,
    });

    // 2. Create Property Valuation
    if (propertyData.valuation_value && propertyData.valuation_type) {
      await base44.asServiceRole.entities.PropertyValuation.create({
        org_id,
        property_id: property.id,
        valuation_type: propertyData.valuation_type,
        value: propertyData.valuation_value,
        effective_date: new Date().toISOString().split('T')[0],
      });
    }

    // 3. Create Borrower
    const borrower = await base44.asServiceRole.entities.Borrower.create({
      org_id,
      borrower_type: entityData ? 'entity' : 'individual',
      first_name: borrowerData.first_name,
      last_name: borrowerData.last_name,
      middle_name: borrowerData.middle_name,
      email: borrowerData.email,
      phone: borrowerData.phone,
      citizenship_status: borrowerData.citizenship_status,
      marital_status: borrowerData.marital_status,
    });

    // 4. Create Entity if provided
    let entity = null;
    if (entityData) {
      entity = await base44.asServiceRole.entities.Entity.create({
        org_id,
        borrower_id: borrower.id,
        entity_type: entityData.entity_type,
        legal_name: entityData.legal_name,
        state_of_formation: entityData.state_of_formation,
      });
    }

    // 5. Create Deal
    const dealNumber = await generateDealNumber(base44, org_id);
    const deal = await base44.asServiceRole.entities.Deal.create({
      org_id,
      deal_number: dealNumber,
      loan_product: loanData.loan_product || 'DSCR',
      loan_purpose: loanData.loan_purpose,
      is_blanket: false,
      stage: 'application',
      status: 'active',
      application_date: new Date().toISOString().split('T')[0],
      assigned_to_user_id: user.email,
      primary_borrower_id: borrower.id,
      loan_amount: loanData.loan_amount,
      interest_rate: loanData.interest_rate,
      loan_term_months: loanData.loan_term_months || 360,
      amortization_type: loanData.amortization_type || 'fixed',
      prepay_penalty_type: loanData.prepay_penalty_type,
    });

    // 6. Create deal_properties
    await base44.asServiceRole.entities.DealProperty.create({
      org_id,
      deal_id: deal.id,
      property_id: property.id,
      is_subject_property: true,
    });

    // 7. Create deal_borrowers
    await base44.asServiceRole.entities.DealBorrower.create({
      org_id,
      deal_id: deal.id,
      borrower_id: borrower.id,
      role: 'primary',
      ownership_percent: 100,
    });

    // 8. Compute DSCR, LTV, PITIA
    const calculations = computeDSCRMetrics(
      loanData,
      propertyData,
      propertyData.valuation_value || propertyData.purchase_price
    );

    // 9. Update Deal with computed values
    await base44.asServiceRole.entities.Deal.update(deal.id, {
      dscr: calculations.dscr,
      ltv: calculations.ltv,
      monthly_pitia: calculations.monthlyPITIA,
      closing_costs_estimate: 0,
    });

    // 10. Create document requirements based on loan purpose
    const requirements = await generateDocumentRequirements(
      base44,
      org_id,
      loanData.loan_product,
      loanData.loan_purpose,
      !!entityData
    );

    // 11. Create conditions from requirements
    for (const req of requirements) {
      await base44.asServiceRole.entities.Condition.create({
        org_id,
        deal_id: deal.id,
        document_requirement_id: req.id,
        title: req.name,
        description: `Please provide: ${req.name}`,
        condition_type: 'PTD',
        status: 'pending',
      });
    }

    // 12. Log activity
    await base44.asServiceRole.entities.ActivityLog.create({
      org_id,
      actor_user_id: user.email,
      entity_type: 'Deal',
      entity_id: deal.id,
      action: 'created',
      summary: `Created DSCR deal ${dealNumber}`,
    });

    return Response.json({
      success: true,
      deal: {
        id: deal.id,
        deal_number: deal.deal_number,
        dscr: calculations.dscr,
        ltv: calculations.ltv,
        monthly_pitia: calculations.monthlyPITIA,
      },
    });
  } catch (error) {
    console.error('Error creating DSCR deal:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function computeDSCRMetrics(loanData, propertyData, propertyValue) {
  const loanAmount = loanData.loan_amount || 0;
  const rate = (loanData.interest_rate || 0) / 100 / 12;
  const months = loanData.loan_term_months || 360;

  // Monthly P&I
  const monthlyPI =
    loanAmount * (rate * Math.pow(1 + rate, months)) / (Math.pow(1 + rate, months) - 1);

  // Monthly taxes (annual / 12)
  const monthlyTaxes = (propertyData.taxes_monthly || 0);

  // Monthly insurance
  const monthlyInsurance = (propertyData.insurance_monthly || 0);

  // Monthly HOA
  const monthlyHOA = (propertyData.hoa_monthly || 0);

  // Total PITIA
  const monthlyPITIA = monthlyPI + monthlyTaxes + monthlyInsurance + monthlyHOA;

  // Gross rent / NOI
  const grossRent = propertyData.gross_rent_monthly || 0;
  const otherIncome = propertyData.other_income_monthly || 0;
  const monthlyIncome = grossRent + otherIncome;

  // DSCR = NOI / Monthly Debt Service
  const dscr = monthlyPI > 0 ? monthlyIncome / monthlyPI : 0;

  // LTV = Loan Amount / Property Value
  const ltv = propertyValue > 0 ? (loanAmount / propertyValue) * 100 : 0;

  return {
    dscr: parseFloat(dscr.toFixed(2)),
    ltv: parseFloat(ltv.toFixed(2)),
    monthlyPI: parseFloat(monthlyPI.toFixed(2)),
    monthlyPITIA: parseFloat(monthlyPITIA.toFixed(2)),
  };
}

async function generateDealNumber(base44, org_id) {
  const date = new Date();
  const yearMonth = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;
  
  // Get count of deals this month
  const deals = await base44.asServiceRole.entities.Deal.filter({ org_id });
  const monthDeals = deals.filter(d => d.deal_number?.includes(yearMonth));
  const sequence = monthDeals.length + 1;

  return `LG-${yearMonth}-${String(sequence).padStart(4, '0')}`;
}

async function generateDocumentRequirements(base44, org_id, loan_product, loan_purpose, hasEntity) {
  const requirements = await base44.asServiceRole.entities.DocumentRequirement.filter({
    org_id,
    loan_product: loan_product || 'DSCR',
  });

  return requirements.filter(r => {
    if (r.loan_purpose && r.loan_purpose !== loan_purpose) return false;
    const rules = r.rules_json || {};
    if (rules.entity_borrower_only && !hasEntity) return false;
    return true;
  });
}