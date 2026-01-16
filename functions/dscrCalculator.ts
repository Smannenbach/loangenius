import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

import Decimal from 'npm:decimal.js@^10.4.3';

// Configure Decimal precision
Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP });

function toDecimal(value) {
  if (value === null || value === undefined || value === '') return new Decimal(0);
  return new Decimal(String(value));
}

function calculateDSCR(input) {
  const rent = toDecimal(input.monthlyRent).plus(toDecimal(input.otherIncome || 0));
  const vacancyRate = toDecimal(input.vacancyRate || 0.05);
  const vacancyLoss = rent.times(vacancyRate);
  const effectiveIncome = rent.minus(vacancyLoss);

  const taxes = toDecimal(input.propertyTaxes).dividedBy(12);
  const insurance = toDecimal(input.insurance).dividedBy(12);
  const hoa = toDecimal(input.hoa || 0);
  const mgmt = toDecimal(input.managementFee ?? toDecimal(input.monthlyRent || 0).times(0.08));
  const repairs = toDecimal(input.repairs ?? toDecimal(input.monthlyRent || 0).times(0.05));
  const utilities = toDecimal(input.utilities || 0);

  const totalExpenses = taxes.plus(insurance).plus(hoa).plus(mgmt).plus(repairs).plus(utilities);
  const noi = effectiveIncome.minus(totalExpenses);

  let debtService;
  if (input.interestOnly) {
    const loanDecimal = toDecimal(input.loanAmount);
    const ratePercent = toDecimal(input.interestRate);
    debtService = loanDecimal.times(ratePercent).dividedBy(12).dividedBy(100);
  } else {
    const loan = toDecimal(input.loanAmount);
    const monthlyRate = toDecimal(input.interestRate).dividedBy(100).dividedBy(12);
    const n = toDecimal(input.loanTermMonths);
    
    const numerator = monthlyRate.times(new Decimal(1).plus(monthlyRate).pow(n));
    const denominator = new Decimal(1).plus(monthlyRate).pow(n).minus(1);
    debtService = loan.times(numerator.dividedBy(denominator));
  }

  const dscr = debtService.isZero() ? new Decimal(0) : noi.dividedBy(debtService);
  const annualNOI = noi.times(12);
  const annualDebtService = debtService.times(12);

  return {
    dscr: parseFloat(dscr.toDecimalPlaces(3).toString()),
    dscrFormatted: dscr.toDecimalPlaces(2).toString() + 'x',
    monthlyNOI: parseFloat(noi.toDecimalPlaces(2).toString()),
    annualNOI: parseFloat(annualNOI.toDecimalPlaces(2).toString()),
    monthlyDebtService: parseFloat(debtService.toDecimalPlaces(2).toString()),
    annualDebtService: parseFloat(annualDebtService.toDecimalPlaces(2).toString()),
    effectiveGrossIncome: parseFloat(effectiveIncome.toDecimalPlaces(2).toString()),
    totalExpenses: parseFloat(totalExpenses.toDecimalPlaces(2).toString()),
    meetsMinimum: dscr.greaterThanOrEqualTo(1.0),
    minimumRequired: 1.0,
    breakdown: {
      grossRent: parseFloat(rent.toDecimalPlaces(2).toString()),
      vacancyLoss: parseFloat(vacancyLoss.toDecimalPlaces(2).toString()),
      effectiveIncome: parseFloat(effectiveIncome.toDecimalPlaces(2).toString()),
      taxes: parseFloat(taxes.toDecimalPlaces(2).toString()),
      insurance: parseFloat(insurance.toDecimalPlaces(2).toString()),
      hoa: parseFloat(hoa.toDecimalPlaces(2).toString()),
      management: parseFloat(mgmt.toDecimalPlaces(2).toString()),
      repairs: parseFloat(repairs.toDecimalPlaces(2).toString()),
      utilities: parseFloat(utilities.toDecimalPlaces(2).toString()),
      totalExpenses: parseFloat(totalExpenses.toDecimalPlaces(2).toString()),
      noi: parseFloat(noi.toDecimalPlaces(2).toString()),
      debtService: parseFloat(debtService.toDecimalPlaces(2).toString())
    }
  };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    
    // Normalize input - support multiple parameter naming conventions
    const normalizedInput = {
      monthlyRent: body.monthlyRent || body.monthly_rent || 0,
      otherIncome: body.otherIncome || body.other_income || 0,
      vacancyRate: body.vacancyRate || body.vacancy_rate || 0.05,
      propertyTaxes: body.propertyTaxes || body.property_taxes || body.monthly_taxes * 12 || 0,
      insurance: body.insurance || body.monthly_insurance * 12 || 0,
      hoa: body.hoa || body.monthly_hoa || 0,
      managementFee: body.managementFee || body.management_fee,
      repairs: body.repairs,
      utilities: body.utilities || 0,
      loanAmount: body.loanAmount || body.loan_amount || 0,
      interestRate: body.interestRate || body.interest_rate || 0,
      loanTermMonths: body.loanTermMonths || body.loan_term_months || 360,
      interestOnly: body.interestOnly || body.interest_only || false,
      dealId: body.dealId || body.deal_id
    };
    
    const result = calculateDSCR(normalizedInput);
    
    // If dealId provided, save to deal
    if (normalizedInput.dealId) {
      await base44.asServiceRole.entities.Deal.update(normalizedInput.dealId, {
        dscr: result.dscr,
        dscr_data: { ...normalizedInput, calculated_result: result, calculated_at: new Date().toISOString() }
      });
    }

    return Response.json(result);
  } catch (error) {
    console.error('DSCR calculation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});