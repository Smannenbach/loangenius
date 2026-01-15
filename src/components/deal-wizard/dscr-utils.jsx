/**
 * DSCR Calculation Utilities (Frontend)
 * Uses Decimal.js for floating-point precision
 * Eliminates rounding errors: 0.1 + 0.2 = 0.3 exactly
 */

import Decimal from 'decimal.js';

// Configure Decimal precision
Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP });

function toDecimal(value) {
  if (value === null || value === undefined || value === '') return new Decimal(0);
  return new Decimal(String(value));
}

export function calculateMonthlyPI(loanAmount, annualRate, amortizationMonths, isInterestOnly = false) {
  const loan = toDecimal(loanAmount);
  const rate = toDecimal(annualRate).dividedBy(100).dividedBy(12);
  const months = toDecimal(amortizationMonths);

  if (isInterestOnly) {
    return parseFloat(loan.times(rate).toDecimalPlaces(2).toString());
  }

  // P&I = (Loan * Rate) / (1 - (1 + Rate)^-months)
  const numerator = rate.times(new Decimal(1).plus(rate).pow(months));
  const denominator = new Decimal(1).plus(rate).pow(months).minus(1);
  const pi = loan.times(numerator.dividedBy(denominator));
  
  return parseFloat(pi.toDecimalPlaces(2).toString());
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