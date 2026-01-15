/**
 * DSCR Calculator Engine
 * Computes DSCR, LTV, PITIA from deal and property data
 */

/**
 * Calculate monthly P&I using standard amortization formula
 * P&I = (Loan Amount * Monthly Rate) / (1 - (1 + Monthly Rate)^(-n))
 */
export function calculateMonthlyPI(loanAmount, annualRate, termMonths) {
  if (!loanAmount || !annualRate || !termMonths) return 0;

  const monthlyRate = annualRate / 100 / 12;
  const numerator = loanAmount * monthlyRate;
  const denominator = 1 - Math.pow(1 + monthlyRate, -termMonths);

  return parseFloat((numerator / denominator).toFixed(2));
}

/**
 * Calculate monthly PITIA (Principal, Interest, Taxes, Insurance, HOA, Flood)
 */
export function calculateMonthlyPITIA(loanAmount, annualRate, termMonths, property) {
  const pi = calculateMonthlyPI(loanAmount, annualRate, termMonths);

  const taxes = property?.taxes_monthly || 0;
  const insurance = property?.insurance_monthly || 0;
  const hoa = property?.hoa_monthly || 0;
  const flood = property?.flood_insurance_monthly || 0;

  const total = pi + taxes + insurance + hoa + flood;

  return {
    monthly_pi: pi,
    monthly_pitia: parseFloat(total.toFixed(2)),
    breakdown: {
      pi,
      taxes,
      insurance,
      hoa,
      flood
    }
  };
}

/**
 * Calculate DSCR
 * DSCR = Gross Monthly Rental Income / (P&I + Taxes + Insurance + HOA + Flood)
 */
export function calculateDSCR(property, loanAmount, annualRate, termMonths) {
  if (!property) return 0;

  const grossRent = (property.gross_rent_monthly || 0) + (property.other_income_monthly || 0);
  const pitiaData = calculateMonthlyPITIA(loanAmount, annualRate, termMonths, property);

  if (pitiaData.monthly_pitia === 0) return 0;

  return parseFloat((grossRent / pitiaData.monthly_pitia).toFixed(2));
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