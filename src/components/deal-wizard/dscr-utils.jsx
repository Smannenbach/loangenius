/**
 * DSCR Calculation Utilities (Frontend)
 * Mirror of backend calculations for instant UI updates
 */

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
  const monthlyPI = calculateMonthlyPI(loanAmount, interestRate, amortizationMonths, isInterestOnly);
  const monthlyTaxes = propertyTaxesAnnual / 12;
  const monthlyInsurance = insuranceAnnual / 12;
  const monthlyFlood = floodInsuranceAnnual / 12;
  const monthlyPITIA = monthlyPI + monthlyTaxes + monthlyInsurance + monthlyFlood + hoaDuesMonthly;
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

export function calculateLTV(loanAmount, value) {
  return Math.round((loanAmount / value) * 10000) / 100;
}

export function calculateDownPayment(purchasePrice, downPaymentPercent) {
  return (purchasePrice * downPaymentPercent) / 100;
}

export function calculateLoanAmount(purchasePrice, downPaymentPercent) {
  return purchasePrice - calculateDownPayment(purchasePrice, downPaymentPercent);
}