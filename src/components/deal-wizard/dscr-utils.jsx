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
  
  const taxes = toDecimal(propertyTaxesAnnual).dividedBy(12);
  const insurance = toDecimal(insuranceAnnual).dividedBy(12);
  const flood = toDecimal(floodInsuranceAnnual).dividedBy(12);
  const hoa = toDecimal(hoaDuesMonthly);
  const rent = toDecimal(monthlyRent);
  const pi = toDecimal(monthlyPI);
  
  const monthlyPITIA = pi.plus(taxes).plus(insurance).plus(flood).plus(hoa);
  const dscrRatio = monthlyPITIA.isZero() ? new Decimal(0) : rent.dividedBy(monthlyPITIA);

  return {
    dscrRatio: parseFloat(dscrRatio.toDecimalPlaces(2).toString()),
    monthlyRent: parseFloat(rent.toDecimalPlaces(2).toString()),
    monthlyPI: parseFloat(pi.toDecimalPlaces(2).toString()),
    monthlyTaxes: parseFloat(taxes.toDecimalPlaces(2).toString()),
    monthlyInsurance: parseFloat(insurance.toDecimalPlaces(2).toString()),
    monthlyFlood: parseFloat(flood.toDecimalPlaces(2).toString()),
    monthlyHOA: parseFloat(hoa.toDecimalPlaces(2).toString()),
    monthlyPITIA: parseFloat(monthlyPITIA.toDecimalPlaces(2).toString()),
    qualifies: dscrRatio.greaterThanOrEqualTo(1.0),
    qualifiesStandard: dscrRatio.greaterThanOrEqualTo(1.25),
  };
}

export function calculateLTV(loanAmount, value) {
  const loan = toDecimal(loanAmount);
  const val = toDecimal(value);
  if (val.isZero()) return 0;
  
  return parseFloat(loan.dividedBy(val).times(100).toDecimalPlaces(2).toString());
}

export function calculateDownPayment(purchasePrice, downPaymentPercent) {
  const price = toDecimal(purchasePrice);
  const percent = toDecimal(downPaymentPercent).dividedBy(100);
  
  return parseFloat(price.times(percent).toDecimalPlaces(2).toString());
}

export function calculateLoanAmount(purchasePrice, downPaymentPercent) {
  const price = toDecimal(purchasePrice);
  const dp = toDecimal(calculateDownPayment(purchasePrice, downPaymentPercent));
  
  return parseFloat(price.minus(dp).toDecimalPlaces(2).toString());
}