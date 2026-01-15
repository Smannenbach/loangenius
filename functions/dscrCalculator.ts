/**
 * DSCR Calculator Engine
 * Calculates DSCR, LTV, P&I, and PITIA for single and blanket deals
 */

/**
 * Calculate deal metrics
 * @param {Object} deal - Deal object with loan_amount, interest_rate, loan_term_months
 * @param {Array} properties - Property array with rental income and expenses
 * @param {Array} allocations - (Optional) Loan allocations per property for blanket deals
 * @returns {Object} - Metrics object with dscr, ltv, monthly_pi, monthly_pitia, breakdown
 */
export function calculateDealMetrics(deal, properties = [], allocations = null) {
  if (!deal || !properties.length) {
    return {
      dscr: 0,
      ltv: 0,
      monthly_pi: 0,
      monthly_pitia: 0,
      breakdown: {}
    };
  }

  // P&I Calculation (standard amortization)
  const monthlyRate = (deal.interest_rate || 0) / 100 / 12;
  const termMonths = deal.loan_term_months || 360;
  const principal = deal.loan_amount || 0;

  let monthlyPI = 0;
  if (monthlyRate > 0 && principal > 0 && termMonths > 0) {
    monthlyPI = (principal * monthlyRate * Math.pow(1 + monthlyRate, termMonths)) /
               (Math.pow(1 + monthlyRate, termMonths) - 1);
  }

  // Aggregate income and expenses
  let totalGrossRent = 0;
  let totalExpenses = 0;

  properties.forEach(prop => {
    totalGrossRent += (prop.gross_rent_monthly || 0) + (prop.other_income_monthly || 0);
    
    // Annual expenses converted to monthly
    totalExpenses += (prop.taxes_monthly || 0) +
                     (prop.insurance_monthly || 0) +
                     (prop.hoa_monthly || 0) +
                     (prop.flood_insurance_monthly || 0);
  });

  // DSCR Calculation
  const monthlyPITIA = monthlyPI + totalExpenses;
  const dscr = monthlyPITIA > 0 ? totalGrossRent / monthlyPITIA : 0;

  // LTV Calculation (total property value)
  let totalValue = 0;
  properties.forEach(prop => {
    totalValue += (prop.appraised_value || prop.purchase_price || 0);
  });

  const ltv = totalValue > 0 ? ((principal / totalValue) * 100) : 0;

  return {
    dscr: parseFloat(dscr.toFixed(3)),
    ltv: parseFloat(ltv.toFixed(2)),
    monthly_pi: parseFloat(monthlyPI.toFixed(2)),
    monthly_pitia: parseFloat(monthlyPITIA.toFixed(2)),
    total_gross_rent: parseFloat(totalGrossRent.toFixed(2)),
    total_expenses: parseFloat(totalExpenses.toFixed(2)),
    total_property_value: parseFloat(totalValue.toFixed(2)),
    breakdown: {
      principal,
      monthlyRate,
      termMonths,
      totalGrossRent,
      totalExpenses,
      totalValue
    }
  };
}

/**
 * Calculate per-property metrics for blanket deals
 * @param {Object} property - Property object
 * @param {number} allocatedAmount - Loan amount allocated to this property
 * @param {number} interestRate - Deal interest rate
 * @param {number} loanTermMonths - Deal term
 * @returns {Object} - Per-property metrics
 */
export function calculatePropertyMetrics(property, allocatedAmount, interestRate, loanTermMonths) {
  if (!property || !allocatedAmount) {
    return {
      monthly_pi: 0,
      monthly_pitia: 0,
      dscr_ratio: 0,
      ltv_ratio: 0
    };
  }

  // P&I for allocated amount
  const monthlyRate = (interestRate || 0) / 100 / 12;
  let monthlyPI = 0;
  if (monthlyRate > 0) {
    monthlyPI = (allocatedAmount * monthlyRate * Math.pow(1 + monthlyRate, loanTermMonths)) /
               (Math.pow(1 + monthlyRate, loanTermMonths) - 1);
  }

  // Expenses
  const monthlyExpenses = (property.taxes_monthly || 0) +
                         (property.insurance_monthly || 0) +
                         (property.hoa_monthly || 0) +
                         (property.flood_insurance_monthly || 0);

  // Income
  const monthlyIncome = (property.gross_rent_monthly || 0) + (property.other_income_monthly || 0);

  // DSCR
  const monthlyPITIA = monthlyPI + monthlyExpenses;
  const dscrRatio = monthlyPITIA > 0 ? monthlyIncome / monthlyPITIA : 0;

  // LTV
  const propertyValue = property.appraised_value || property.purchase_price || 0;
  const ltv = propertyValue > 0 ? ((allocatedAmount / propertyValue) * 100) : 0;

  return {
    monthly_pi: parseFloat(monthlyPI.toFixed(2)),
    monthly_pitia: parseFloat(monthlyPITIA.toFixed(2)),
    dscr_ratio: parseFloat(dscrRatio.toFixed(3)),
    ltv_ratio: parseFloat(ltv.toFixed(2))
  };
}

/**
 * Validate DSCR deal parameters
 * @param {Object} deal - Deal object
 * @param {Array} properties - Properties array
 * @returns {Object} - Validation result with issues array
 */
export function validateDSCRDeal(deal, properties = []) {
  const issues = [];

  if (!deal.loan_amount || deal.loan_amount <= 0) {
    issues.push({ field: 'loan_amount', message: 'Loan amount must be greater than 0' });
  }

  if (!deal.interest_rate || deal.interest_rate <= 0) {
    issues.push({ field: 'interest_rate', message: 'Interest rate must be greater than 0' });
  }

  if (!deal.loan_term_months || deal.loan_term_months < 60) {
    issues.push({ field: 'loan_term_months', message: 'Loan term must be at least 5 years' });
  }

  if (!properties.length) {
    issues.push({ field: 'properties', message: 'At least one property required' });
  }

  properties.forEach((prop, idx) => {
    if (!prop.gross_rent_monthly || prop.gross_rent_monthly < 0) {
      issues.push({
        field: `property[${idx}].gross_rent_monthly`,
        message: 'Property must have valid rental income'
      });
    }
  });

  return {
    valid: issues.length === 0,
    issues
  };
}