import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

function calculateDSCR(input) {
  const monthlyGrossRent = input.monthlyRent + (input.otherIncome || 0);
  const vacancyRate = input.vacancyRate || 0.05;
  const vacancyLoss = monthlyGrossRent * vacancyRate;
  const effectiveGrossIncome = monthlyGrossRent - vacancyLoss;

  const monthlyTaxes = input.propertyTaxes / 12;
  const monthlyInsurance = input.insurance / 12;
  const monthlyHOA = input.hoa || 0;
  const monthlyManagement = input.managementFee ?? input.monthlyRent * 0.08;
  const monthlyRepairs = input.repairs ?? input.monthlyRent * 0.05;
  const monthlyUtilities = input.utilities || 0;

  const totalExpenses = monthlyTaxes + monthlyInsurance + monthlyHOA + monthlyManagement + monthlyRepairs + monthlyUtilities;
  const monthlyNOI = effectiveGrossIncome - totalExpenses;

  let monthlyDebtService;
  if (input.interestOnly) {
    monthlyDebtService = (input.loanAmount * input.interestRate) / 12;
  } else {
    const monthlyRate = input.interestRate / 12;
    const n = input.loanTermMonths;
    monthlyDebtService = input.loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, n)) / (Math.pow(1 + monthlyRate, n) - 1);
  }

  const dscr = monthlyNOI / monthlyDebtService;
  const annualNOI = monthlyNOI * 12;
  const annualDebtService = monthlyDebtService * 12;

  return {
    dscr: Number(dscr.toFixed(3)),
    dscrFormatted: dscr.toFixed(2) + 'x',
    monthlyNOI: Number(monthlyNOI.toFixed(2)),
    annualNOI: Number(annualNOI.toFixed(2)),
    monthlyDebtService: Number(monthlyDebtService.toFixed(2)),
    annualDebtService: Number(annualDebtService.toFixed(2)),
    effectiveGrossIncome: Number(effectiveGrossIncome.toFixed(2)),
    totalExpenses: Number(totalExpenses.toFixed(2)),
    meetsMinimum: dscr >= 1.0,
    minimumRequired: 1.0,
    breakdown: {
      grossRent: Number(monthlyGrossRent.toFixed(2)),
      vacancyLoss: Number(vacancyLoss.toFixed(2)),
      effectiveIncome: Number(effectiveGrossIncome.toFixed(2)),
      taxes: Number(monthlyTaxes.toFixed(2)),
      insurance: Number(monthlyInsurance.toFixed(2)),
      hoa: Number(monthlyHOA.toFixed(2)),
      management: Number(monthlyManagement.toFixed(2)),
      repairs: Number(monthlyRepairs.toFixed(2)),
      utilities: Number(monthlyUtilities.toFixed(2)),
      totalExpenses: Number(totalExpenses.toFixed(2)),
      noi: Number(monthlyNOI.toFixed(2)),
      debtService: Number(monthlyDebtService.toFixed(2))
    }
  };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const result = calculateDSCR(req.body);
    
    // If dealId provided, save to deal
    if (req.body.dealId) {
      await base44.asServiceRole.entities.Deal.update(req.body.dealId, {
        dscr: result.dscr,
        dscr_data: { ...req.body, calculated_result: result, calculated_at: new Date().toISOString() }
      });
    }

    return Response.json(result);
  } catch (error) {
    console.error('DSCR calculation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});