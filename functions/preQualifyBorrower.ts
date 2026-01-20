/**
 * Pre-Qualify Borrower - Quick qualification check
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import Decimal from 'npm:decimal.js@10.4.3';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { loan_amount, property_value, monthly_rent, fico_score, loan_type = 'DSCR' } = body;

    if (!loan_amount || !property_value) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const results = {
      qualified: true,
      issues: [],
      recommendations: [],
    };

    // LTV check
    const ltv = new Decimal(loan_amount).dividedBy(property_value).times(100);
    const maxLtv = loan_type === 'DSCR' ? 80 : loan_type === 'Bridge' ? 75 : 80;
    
    if (ltv.greaterThan(maxLtv)) {
      results.qualified = false;
      results.issues.push(`LTV ${ltv.toFixed(1)}% exceeds maximum ${maxLtv}% for ${loan_type} loans`);
    }

    // DSCR check (if rent provided)
    if (monthly_rent && loan_type === 'DSCR') {
      const estimatedPayment = new Decimal(loan_amount).times(0.007); // Rough estimate
      const dscr = new Decimal(monthly_rent).dividedBy(estimatedPayment);
      
      if (dscr.lessThan(1.25)) {
        results.qualified = false;
        results.issues.push(`Estimated DSCR ${dscr.toFixed(2)} below minimum 1.25`);
      }
    }

    // Credit score check
    if (fico_score) {
      const minFico = loan_type === 'DSCR' ? 620 : loan_type === 'Conventional' ? 640 : 600;
      if (fico_score < minFico) {
        results.qualified = false;
        results.issues.push(`Credit score ${fico_score} below minimum ${minFico} for ${loan_type}`);
      }
    }

    // Recommendations
    if (ltv.greaterThan(70)) {
      results.recommendations.push('Consider larger down payment to improve terms');
    }
    if (results.qualified) {
      results.recommendations.push('You may qualify - submit full application for formal approval');
    }

    return Response.json({
      success: true,
      qualified: results.qualified,
      ltv: ltv.toDecimalPlaces(2).toNumber(),
      issues: results.issues,
      recommendations: results.recommendations,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});