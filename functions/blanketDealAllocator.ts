/**
 * Blanket Deal Property Allocation Engine
 * Distributes loan amount across properties and recalculates metrics
 */

/**
 * Allocate loan amount across properties (even split by default, or custom)
 */
export function allocateLoanAmount(loanAmount, properties, allocations = null) {
  if (!properties || properties.length === 0) return [];

  // If allocations provided, validate and use them
  if (allocations && allocations.length === properties.length) {
    const totalAllocated = allocations.reduce((sum, a) => sum + a, 0);
    if (Math.abs(totalAllocated - loanAmount) < 1) { // Allow 1 cent rounding error
      return properties.map((prop, idx) => ({
        ...prop,
        loan_amount_allocated: parseFloat(allocations[idx].toFixed(2))
      }));
    }
  }

  // Default: even split
  const amountPerProperty = loanAmount / properties.length;
  return properties.map(prop => ({
    ...prop,
    loan_amount_allocated: parseFloat(amountPerProperty.toFixed(2))
  }));
}

/**
 * Calculate metrics for each property in blanket deal
 */
export function calculatePropertyMetrics(property, allocatedAmount, loanTermMonths, interestRate) {
  if (!property || !allocatedAmount) {
    return {
      ltv_ratio: 0,
      dscr_ratio: 0,
      monthly_pi: 0,
      monthly_pitia: 0
    };
  }

  // P&I for allocated amount
  const monthlyRate = interestRate / 100 / 12;
  const n = loanTermMonths;
  const monthlyPI = (allocatedAmount * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -n));

  // Expenses
  const taxes = property.taxes_monthly || 0;
  const insurance = property.insurance_monthly || 0;
  const hoa = property.hoa_monthly || 0;
  const flood = property.flood_insurance_monthly || 0;
  const monthlyPITIA = monthlyPI + taxes + insurance + hoa + flood;

  // DSCR
  const grossRent = (property.gross_rent_monthly || 0) + (property.other_income_monthly || 0);
  const dscr = monthlyPITIA > 0 ? grossRent / monthlyPITIA : 0;

  // LTV
  const propertyValue = property.appraised_value || property.purchase_price || 0;
  const ltv = propertyValue > 0 ? (allocatedAmount / propertyValue) * 100 : 0;

  return {
    ltv_ratio: parseFloat(ltv.toFixed(2)),
    dscr_ratio: parseFloat(dscr.toFixed(2)),
    monthly_pi: parseFloat(monthlyPI.toFixed(2)),
    monthly_pitia: parseFloat(monthlyPITIA.toFixed(2))
  };
}

/**
 * Calculate aggregate blanket deal metrics
 */
export function calculateBlanketMetrics(properties, allocations, loanTermMonths, interestRate) {
  if (!properties || !allocations || properties.length !== allocations.length) {
    return {
      dscr: 0,
      ltv: 0,
      monthly_pitia: 0,
      monthly_pi: 0,
      property_breakdowns: []
    };
  }

  let totalGrossRent = 0;
  let totalPITIA = 0;
  let totalPI = 0;
  let totalValue = 0;
  const breakdowns = [];

  properties.forEach((prop, idx) => {
    const allocated = allocations[idx];
    const metrics = calculatePropertyMetrics(prop, allocated, loanTermMonths, interestRate);

    totalGrossRent += (prop.gross_rent_monthly || 0) + (prop.other_income_monthly || 0);
    totalPI += metrics.monthly_pi;
    totalPITIA += metrics.monthly_pitia;
    totalValue += (prop.appraised_value || prop.purchase_price || 0);

    breakdowns.push({
      property_id: prop.id,
      address: `${prop.address_street}, ${prop.address_city} ${prop.address_state}`,
      allocated_loan: allocated,
      ...metrics
    });
  });

  const aggregateDSCR = totalPITIA > 0 ? totalGrossRent / totalPITIA : 0;
  const aggregateLTV = totalValue > 0 ? (allocations.reduce((sum, a) => sum + a, 0) / totalValue) * 100 : 0;

  return {
    dscr: parseFloat(aggregateDSCR.toFixed(2)),
    ltv: parseFloat(aggregateLTV.toFixed(2)),
    monthly_pitia: parseFloat(totalPITIA.toFixed(2)),
    monthly_pi: parseFloat(totalPI.toFixed(2)),
    property_breakdowns: breakdowns
  };
}