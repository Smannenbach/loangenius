import Decimal from 'decimal.js';

/**
 * Precision-safe financial calculator using Decimal.js
 * Eliminates floating-point rounding errors in loan calculations
 */

// Configure Decimal precision
Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP });

/**
 * Convert value to Decimal safely
 */
export function toDecimal(value) {
  if (value === null || value === undefined || value === '') return new Decimal(0);
  if (typeof value === 'object' && value.toString().includes('Decimal')) return value;
  return new Decimal(String(value));
}

/**
 * Calculate monthly P&I using amortization formula with precision
 * P&I = (Loan Amount * Monthly Rate) / (1 - (1 + Monthly Rate)^(-n))
 */
export function calculateMonthlyPIDecimal(loanAmount, annualRate, termMonths) {
  const loan = toDecimal(loanAmount);
  const rate = toDecimal(annualRate).dividedBy(100).dividedBy(12);
  const n = toDecimal(termMonths);
  
  if (loan.isZero() || rate.isZero() || n.isZero()) {
    return new Decimal(0);
  }
  
  // numerator = loan * monthly_rate
  const numerator = loan.times(rate);
  
  // denominator = 1 - (1 + monthly_rate)^(-n)
  const ratePlusOne = new Decimal(1).plus(rate);
  const denominator = new Decimal(1).minus(ratePlusOne.pow(n.negated()));
  
  return numerator.dividedBy(denominator).toDecimalPlaces(2);
}

/**
 * Calculate monthly PITIA (Principal, Interest, Taxes, Insurance, HOA, Flood)
 */
export function calculateMonthlyPITIADecimal(loanAmount, annualRate, termMonths, property = {}) {
  const pi = calculateMonthlyPIDecimal(loanAmount, annualRate, termMonths);
  
  const taxes = toDecimal(property.taxes_monthly || property.monthlyTaxes || 0);
  const insurance = toDecimal(property.insurance_monthly || property.monthlyInsurance || 0);
  const hoa = toDecimal(property.hoa_monthly || property.monthlyHOA || 0);
  const flood = toDecimal(property.flood_insurance_monthly || property.monthlyFloodInsurance || 0);
  
  const total = pi.plus(taxes).plus(insurance).plus(hoa).plus(flood);
  
  return {
    monthly_pi: pi.toDecimalPlaces(2),
    monthly_pitia: total.toDecimalPlaces(2),
    breakdown: {
      pi: pi.toNumber(),
      taxes: taxes.toNumber(),
      insurance: insurance.toNumber(),
      hoa: hoa.toNumber(),
      flood: flood.toNumber()
    }
  };
}

/**
 * Calculate DSCR with precision
 * DSCR = Gross Monthly Rental Income / Monthly PITIA
 */
export function calculateDSCRDecimal(property, loanAmount, annualRate, termMonths) {
  if (!property) return new Decimal(0);
  
  const grossRent = toDecimal(property.gross_rent_monthly || property.monthlyRent || 0)
    .plus(toDecimal(property.other_income_monthly || 0));
  
  const pitiaData = calculateMonthlyPITIADecimal(loanAmount, annualRate, termMonths, property);
  const pitia = pitiaData.monthly_pitia;
  
  if (pitia.isZero()) return new Decimal(0);
  
  return grossRent.dividedBy(pitia).toDecimalPlaces(4);
}

/**
 * Calculate LTV with precision
 * LTV = Loan Amount / Property Value
 */
export function calculateLTVDecimal(loanAmount, propertyValue) {
  const loan = toDecimal(loanAmount);
  const value = toDecimal(propertyValue);
  
  if (loan.isZero() || value.isZero()) return new Decimal(0);
  
  return loan.dividedBy(value).times(100).toDecimalPlaces(2);
}

/**
 * Calculate portfolio DSCR for multiple properties
 * Portfolio DSCR = Total Monthly Rent / Total Monthly PITIA
 */
export function calculatePortfolioDSCRDecimal(properties, loanAmount, annualRate, termMonths) {
  let totalRent = new Decimal(0);
  let totalPITIA = new Decimal(0);
  
  properties.forEach((property) => {
    const rent = toDecimal(property.gross_rent_monthly || 0)
      .plus(toDecimal(property.other_income_monthly || 0));
    
    const pitiaData = calculateMonthlyPITIADecimal(
      loanAmount / properties.length, // Allocate equally
      annualRate,
      termMonths,
      property
    );
    
    totalRent = totalRent.plus(rent);
    totalPITIA = totalPITIA.plus(pitiaData.monthly_pitia);
  });
  
  if (totalPITIA.isZero()) return new Decimal(0);
  
  return totalRent.dividedBy(totalPITIA).toDecimalPlaces(4);
}

/**
 * Calculate interest-only monthly payment
 */
export function calculateMonthlyInterestOnlyDecimal(loanAmount, annualRate) {
  const loan = toDecimal(loanAmount);
  const monthlyRate = toDecimal(annualRate).dividedBy(100).dividedBy(12);
  
  return loan.times(monthlyRate).toDecimalPlaces(2);
}

/**
 * Format Decimal value for display
 */
export function formatDecimal(decimal, decimals = 2) {
  const dec = toDecimal(decimal);
  return dec.toDecimalPlaces(decimals).toString();
}

/**
 * Convert Decimal to plain number (safe for JSON serialization)
 */
export function decimalToNumber(decimal, decimals = 2) {
  const dec = toDecimal(decimal);
  return parseFloat(dec.toDecimalPlaces(decimals).toString());
}