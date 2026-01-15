/**
 * DSCR Calculator Engine
 * Computes DSCR, LTV, PITIA from deal and property data
 */

import Decimal from 'decimal.js';

// Configure Decimal precision
Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP });

function toDecimal(value) {
  if (value === null || value === undefined || value === '') return new Decimal(0);
  return new Decimal(String(value));
}

/**
 * Calculate monthly P&I using standard amortization formula with precision
 * P&I = (Loan Amount * Monthly Rate) / (1 - (1 + Monthly Rate)^(-n))
 * Uses Decimal.js to avoid floating-point errors (0.1 + 0.2 = 0.3 exactly)
 */
export function calculateMonthlyPI(loanAmount, annualRate, termMonths) {
  if (!loanAmount || !annualRate || !termMonths) return 0;

  const loan = toDecimal(loanAmount);
  const rate = toDecimal(annualRate).dividedBy(100).dividedBy(12);
  const months = toDecimal(termMonths);
  
  const numerator = loan.times(rate);
  const ratePlusOne = new Decimal(1).plus(rate);
  const denominator = new Decimal(1).minus(ratePlusOne.pow(months.negated()));
  
  return parseFloat(numerator.dividedBy(denominator).toDecimalPlaces(2).toString());
}

/**
 * Calculate monthly PITIA (Principal, Interest, Taxes, Insurance, HOA, Flood) with precision
 */
export function calculateMonthlyPITIA(loanAmount, annualRate, termMonths, property) {
  const pi = toDecimal(calculateMonthlyPI(loanAmount, annualRate, termMonths));

  const taxes = toDecimal(property?.taxes_monthly || 0);
  const insurance = toDecimal(property?.insurance_monthly || 0);
  const hoa = toDecimal(property?.hoa_monthly || 0);
  const flood = toDecimal(property?.flood_insurance_monthly || 0);

  const total = pi.plus(taxes).plus(insurance).plus(hoa).plus(flood);

  return {
    monthly_pi: parseFloat(pi.toDecimalPlaces(2).toString()),
    monthly_pitia: parseFloat(total.toDecimalPlaces(2).toString()),
    breakdown: {
      pi: parseFloat(pi.toDecimalPlaces(2).toString()),
      taxes: parseFloat(taxes.toDecimalPlaces(2).toString()),
      insurance: parseFloat(insurance.toDecimalPlaces(2).toString()),
      hoa: parseFloat(hoa.toDecimalPlaces(2).toString()),
      flood: parseFloat(flood.toDecimalPlaces(2).toString())
    }
  };
}

/**
 * Calculate DSCR with precision
 * DSCR = Gross Monthly Rental Income / (P&I + Taxes + Insurance + HOA + Flood)
 */
export function calculateDSCR(property, loanAmount, annualRate, termMonths) {
  if (!property) return 0;

  const grossRent = toDecimal(property.gross_rent_monthly || 0)
    .plus(toDecimal(property.other_income_monthly || 0));
  
  const pitiaData = calculateMonthlyPITIA(loanAmount, annualRate, termMonths, property);
  const pitia = toDecimal(pitiaData.monthly_pitia);

  if (pitia.isZero()) return 0;

  return parseFloat(grossRent.dividedBy(pitia).toDecimalPlaces(2).toString());
}

/**
 * Calculate LTV
 * LTV = Loan Amount / Property Value (or Purchase Price)
 */
export function calculateLTV(loanAmount, propertyValue) {
  if (!loanAmount || !propertyValue || propertyValue === 0) return 0;

  const ltv = (loanAmount / propertyValue) * 100;
  return parseFloat(ltv.toFixed(2));
}

/**
 * Full deal calculation
 */
export function calculateDealMetrics(deal, properties) {
  if (!deal || !properties || properties.length === 0) {
    return {
      dscr: 0,
      ltv: 0,
      monthly_pitia: 0,
      monthly_pi: 0
    };
  }

  // For single property deals
  if (!deal.is_blanket && properties.length === 1) {
    const property = properties[0];
    const dscr = calculateDSCR(property, deal.loan_amount, deal.interest_rate, deal.loan_term_months);
    const ltv = calculateLTV(deal.loan_amount, property.appraised_value || property.purchase_price);
    const pitiaData = calculateMonthlyPITIA(deal.loan_amount, deal.interest_rate, deal.loan_term_months, property);

    return {
      dscr,
      ltv,
      monthly_pitia: pitiaData.monthly_pitia,
      monthly_pi: pitiaData.monthly_pi
    };
  }

  // For blanket deals: aggregate calculations
  if (deal.is_blanket && properties.length > 1) {
    let totalGrossRent = 0;
    let totalExpenses = 0;
    let totalValue = 0;
    let totalPI = 0;

    properties.forEach(prop => {
      totalGrossRent += (prop.gross_rent_monthly || 0) + (prop.other_income_monthly || 0);
      totalExpenses += (prop.taxes_monthly || 0) + (prop.insurance_monthly || 0) + 
                       (prop.hoa_monthly || 0) + (prop.flood_insurance_monthly || 0);
      totalValue += prop.appraised_value || prop.purchase_price || 0;
      totalPI += calculateMonthlyPI(
        deal.loan_amount / properties.length, // simplified: equal allocation
        deal.interest_rate,
        deal.loan_term_months
      );
    });

    const totalPITIA = totalPI + totalExpenses;
    const dscr = totalPITIA > 0 ? parseFloat((totalGrossRent / totalPITIA).toFixed(2)) : 0;
    const ltv = calculateLTV(deal.loan_amount, totalValue);

    return {
      dscr,
      ltv,
      monthly_pitia: totalPITIA,
      monthly_pi: totalPI
    };
  }

  return {
    dscr: 0,
    ltv: 0,
    monthly_pitia: 0,
    monthly_pi: 0
  };
}