import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Blanket DSCR Deal Creation
 * - Create Deal with is_blanket = true
 * - Add 2+ properties via deal_properties
 * - Compute per-property DSCR + aggregate DSCR
 * - Store breakdown in meta_json
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
      properties,
      borrowerData,
    } = await req.json();

    if (!properties || properties.length < 2) {
      return Response.json(
        { error: 'Blanket deal requires 2+ properties' },
        { status: 400 }
      );
    }

    // Verify org
    const membership = await base44.asServiceRole.entities.OrgMembership.filter({
      org_id,
      user_id: user.email,
    });
    if (membership.length === 0) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 1. Create borrower
    const borrower = await base44.asServiceRole.entities.Borrower.create({
      org_id,
      borrower_type: 'individual',
      first_name: borrowerData.first_name,
      last_name: borrowerData.last_name,
      email: borrowerData.email,
      phone: borrowerData.phone,
    });

    // 2. Create properties + collect metrics
    const propertyMetrics = [];
    let totalMonthlyIncome = 0;
    let totalMonthlyDebtService = 0;

    for (const propData of properties) {
      const property = await base44.asServiceRole.entities.Property.create({
        org_id,
        address_street: propData.address_street,
        address_city: propData.address_city,
        address_state: propData.address_state,
        address_zip: propData.address_zip,
        property_type: propData.property_type,
        gross_rent_monthly: propData.gross_rent_monthly,
        taxes_monthly: propData.taxes_monthly,
        insurance_monthly: propData.insurance_monthly,
      });

      const metrics = computePropertyMetrics(propData, loanData);
      propertyMetrics.push({
        property_id: property.id,
        address: `${propData.address_street}, ${propData.address_city}`,
        dscr: metrics.dscr,
        pitia: metrics.monthlyPITIA,
        rent: propData.gross_rent_monthly,
      });

      totalMonthlyIncome += propData.gross_rent_monthly || 0;
      totalMonthlyDebtService += metrics.monthlyPI || 0;
    }

    // 3. Create blanket deal
    const dealNumber = await generateDealNumber(base44, org_id);
    const aggregateDSCR = totalMonthlyDebtService > 0 ? totalMonthlyIncome / totalMonthlyDebtService : 0;

    const deal = await base44.asServiceRole.entities.Deal.create({
      org_id,
      deal_number: dealNumber,
      loan_product: 'DSCR',
      loan_purpose: loanData.loan_purpose,
      is_blanket: true,
      stage: 'application',
      status: 'active',
      application_date: new Date().toISOString().split('T')[0],
      assigned_to_user_id: user.email,
      primary_borrower_id: borrower.id,
      loan_amount: loanData.loan_amount,
      interest_rate: loanData.interest_rate,
      loan_term_months: loanData.loan_term_months || 360,
      dscr: parseFloat(aggregateDSCR.toFixed(2)),
      meta_json: {
        property_breakdown: propertyMetrics,
      },
    });

    // 4. Link properties to deal
    for (let i = 0; i < properties.length; i++) {
      await base44.asServiceRole.entities.DealProperty.create({
        org_id,
        deal_id: deal.id,
        property_id: propertyMetrics[i].property_id,
        is_subject_property: i === 0,
      });
    }

    // 5. Create deal_borrowers
    await base44.asServiceRole.entities.DealBorrower.create({
      org_id,
      deal_id: deal.id,
      borrower_id: borrower.id,
      role: 'primary',
      ownership_percent: 100,
    });

    // 6. Log activity
    await base44.asServiceRole.entities.ActivityLog.create({
      org_id,
      actor_user_id: user.email,
      entity_type: 'Deal',
      entity_id: deal.id,
      action: 'created',
      summary: `Created blanket DSCR deal ${dealNumber} with ${properties.length} properties`,
    });

    return Response.json({
      success: true,
      deal: {
        id: deal.id,
        deal_number: deal.deal_number,
        is_blanket: true,
        aggregate_dscr: aggregateDSCR,
        property_count: properties.length,
        property_breakdown: propertyMetrics,
      },
    });
  } catch (error) {
    console.error('Error creating blanket deal:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function computePropertyMetrics(propertyData, loanData) {
  const rate = (loanData.interest_rate || 0) / 100 / 12;
  const months = loanData.loan_term_months || 360;
  const loanAmount = loanData.loan_amount || 0;

  const monthlyPI =
    loanAmount * (rate * Math.pow(1 + rate, months)) / (Math.pow(1 + rate, months) - 1);

  const monthlyTaxes = propertyData.taxes_monthly || 0;
  const monthlyInsurance = propertyData.insurance_monthly || 0;
  const monthlyPITIA = monthlyPI + monthlyTaxes + monthlyInsurance;

  const rent = propertyData.gross_rent_monthly || 0;
  const dscr = monthlyPI > 0 ? rent / monthlyPI : 0;

  return {
    dscr: parseFloat(dscr.toFixed(2)),
    monthlyPI: parseFloat(monthlyPI.toFixed(2)),
    monthlyPITIA: parseFloat(monthlyPITIA.toFixed(2)),
  };
}

async function generateDealNumber(base44, org_id) {
  const date = new Date();
  const yearMonth = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;
  const deals = await base44.asServiceRole.entities.Deal.filter({ org_id });
  const monthDeals = deals.filter(d => d.deal_number?.includes(yearMonth));
  const sequence = monthDeals.length + 1;
  return `LG-${yearMonth}-${String(sequence).padStart(4, '0')}`;
}