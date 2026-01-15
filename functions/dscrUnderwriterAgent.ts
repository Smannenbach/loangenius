import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { deal_id, mode = 'full', assumptions = {}, extractions = [] } = body;

    if (!deal_id) {
      return Response.json({ error: 'deal_id required' }, { status: 400 });
    }

    const vacancyPct = assumptions.vacancy_pct || 0.05;
    const mgmtPct = assumptions.mgmt_pct || 0.08;
    const maintenancePct = assumptions.maintenance_pct || 0.05;

    // DSCR calculation logic
    // Income side: lease precedence
    let monthlyRent = 0;
    let rentConfidence = 0;
    let rentSourceDocId = null;
    let rentEstimated = false;

    if (extractions && extractions.length > 0) {
      const rentExtraction = extractions.find(e => e.field_name === 'monthly_rent');
      if (rentExtraction && rentExtraction.confidence >= 0.85) {
        monthlyRent = rentExtraction.value;
        rentConfidence = rentExtraction.confidence;
        rentSourceDocId = rentExtraction.source_doc_id;
        rentEstimated = rentExtraction.estimated;
      }
    }

    // Fallback: market rent (estimated)
    if (monthlyRent === 0) {
      monthlyRent = 2500; // market estimate
      rentConfidence = 0.65;
      rentEstimated = true;
    }

    const grossRentalIncome = monthlyRent * 12;
    const vacancy = grossRentalIncome * vacancyPct;
    const egi = grossRentalIncome - vacancy;

    // Expenses (from extractions or defaults)
    let propertyTaxAnnual = 3000;
    let insuranceAnnual = 1200;
    let mgmtExpense = 0;
    let maintenanceExpense = egi * maintenancePct;

    if (extractions && extractions.length > 0) {
      const taxExtraction = extractions.find(e => e.field_name === 'property_tax_expense');
      if (taxExtraction) {
        propertyTaxAnnual = taxExtraction.value;
      }
    }

    mgmtExpense = egi * mgmtPct;

    const totalExpenses = propertyTaxAnnual + insuranceAnnual + mgmtExpense + maintenanceExpense;
    const noi = egi - totalExpenses;

    // Debt service (from deal assumptions)
    const loanAmount = assumptions.loan_amount || 300000;
    const interestRate = assumptions.interest_rate || 0.065;
    const loanTermMonths = assumptions.loan_term_months || 360;

    const monthlyRate = interestRate / 12;
    const monthlyPI = loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, loanTermMonths)) / (Math.pow(1 + monthlyRate, loanTermMonths) - 1);
    const annualDebtService = monthlyPI * 12;

    const dscr = noi / annualDebtService;

    // Determine status based on provenance
    const hasVerifiedRent = rentConfidence >= 0.85 && !rentEstimated;
    const status = hasVerifiedRent ? 'verified' : 'indicative';

    // Source map
    const sourceMap = {
      gross_rental_income: {
        value: grossRentalIncome,
        source_doc_id: rentSourceDocId,
        confidence: rentConfidence,
        estimated: rentEstimated
      },
      net_operating_income: {
        value: noi,
        components: { egi, totalExpenses }
      },
      annual_debt_service: {
        value: annualDebtService,
        monthly_pi: monthlyPI,
        loan_amount: loanAmount,
        interest_rate: interestRate
      }
    };

    // Stress test scenarios
    const stressResults = [
      { scenario: '+50bps', rate_delta: 0.005, dscr_stressed: noi / (monthlyPI * 1.08 * 12) },
      { scenario: '-50bps', rate_delta: -0.005, dscr_stressed: noi / (monthlyPI * 0.92 * 12) },
      { scenario: '+5% rent decline', rent_delta: -0.05, dscr_stressed: (noi - (egi * 0.05)) / annualDebtService },
      { scenario: '-5% rent decline', rent_delta: 0.05, dscr_stressed: (noi + (egi * 0.05)) / annualDebtService }
    ];

    // Conditions
    const conditions = [];
    if (dscr < 1.0) {
      conditions.push('DSCR below 1.0; requires compensating factors or additional equity');
    }
    if (rentEstimated) {
      conditions.push('Rent estimated from market data; signed lease required prior to funding');
    }
    if (status !== 'verified') {
      conditions.push('Full documentation required for verification');
    }

    const auditEventId = crypto.randomUUID();

    return Response.json({
      dscr_calc_id: crypto.randomUUID(),
      deal_id,
      DSCR: parseFloat(dscr.toFixed(3)),
      status,
      gross_rental_income: grossRentalIncome,
      vacancy_pct: vacancyPct,
      effective_gross_income: egi,
      operating_expenses: totalExpenses,
      net_operating_income: noi,
      monthly_pi: monthlyPI,
      annual_debt_service: annualDebtService,
      source_map: sourceMap,
      stress_test_results: stressResults,
      decision: dscr >= 1.0 ? 'approve' : 'conditional',
      required_conditions: conditions,
      audit_event_id: auditEventId,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});