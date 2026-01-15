/**
 * DSCR Calculator Backend Function
 * Handles calculation and storage of DSCR values
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

export function calculateMonthlyPI(loanAmount, annualRate, amortizationMonths, isInterestOnly = false) {
  const monthlyRate = (annualRate / 100) / 12;

  if (isInterestOnly) {
    return loanAmount * monthlyRate;
  }

  const numerator = monthlyRate * Math.pow(1 + monthlyRate, amortizationMonths);
  const denominator = Math.pow(1 + monthlyRate, amortizationMonths) - 1;
  return loanAmount * (numerator / denominator);
}

export function calculateSinglePropertyDSCR({
  loanAmount,
  interestRate,
  loanTermMonths = 360,
  amortizationMonths = 360,
  isInterestOnly = false,
  ioPeriodsMonths = 0,
  monthlyRent,
  propertyTaxesAnnual,
  insuranceAnnual,
  floodInsuranceAnnual = 0,
  hoaDuesMonthly = 0,
}) {
  // P&I calculation
  const monthlyPI = calculateMonthlyPI(loanAmount, interestRate, amortizationMonths, isInterestOnly);

  // Monthly expenses
  const monthlyTaxes = propertyTaxesAnnual / 12;
  const monthlyInsurance = insuranceAnnual / 12;
  const monthlyFlood = floodInsuranceAnnual / 12;

  // Total PITIA
  const monthlyPITIA = monthlyPI + monthlyTaxes + monthlyInsurance + monthlyFlood + hoaDuesMonthly;

  // DSCR
  const dscrRatio = monthlyRent / monthlyPITIA;

  return {
    dscrRatio: Math.round(dscrRatio * 100) / 100,
    monthlyRent: Math.round(monthlyRent * 100) / 100,
    monthlyPI: Math.round(monthlyPI * 100) / 100,
    monthlyTaxes: Math.round(monthlyTaxes * 100) / 100,
    monthlyInsurance: Math.round(monthlyInsurance * 100) / 100,
    monthlyFlood: Math.round(monthlyFlood * 100) / 100,
    monthlyHOA: Math.round(hoaDuesMonthly * 100) / 100,
    monthlyPITIA: Math.round(monthlyPITIA * 100) / 100,
    qualifies: dscrRatio >= 1.0,
    qualifiesStandard: dscrRatio >= 1.25,
  };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { operation, params } = body;

    if (operation === 'calculateSingleProperty') {
      const result = calculateSinglePropertyDSCR(params);
      return Response.json(result);
    }

    return Response.json({ error: 'Unknown operation' }, { status: 400 });
  } catch (error) {
    console.error('DSCR Calculator Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});