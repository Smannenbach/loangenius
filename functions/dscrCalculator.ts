/**
 * DSCR Calculator - Precision calculations using Decimal.js
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import Decimal from 'npm:decimal.js@10.4.3';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { monthly_rent, property_taxes, insurance, hoa_fees, loan_amount, interest_rate, loan_term_months = 360, is_interest_only = false, vacancy_factor = 0.05, operating_expense_ratio = 0.25 } = body;

    if (!monthly_rent || !loan_amount || !interest_rate) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Use Decimal.js for precision
    const rent = new Decimal(monthly_rent);
    const vacancy = rent.times(vacancy_factor);
    const effectiveIncome = rent.minus(vacancy);
    
    const monthlyTaxes = new Decimal(property_taxes || 0).dividedBy(12);
    const monthlyInsurance = new Decimal(insurance || 0).dividedBy(12);
    const monthlyHoa = new Decimal(hoa_fees || 0);
    
    const operatingExpenses = effectiveIncome.times(operating_expense_ratio);
    
    const noi = effectiveIncome.minus(monthlyTaxes).minus(monthlyInsurance).minus(monthlyHoa).minus(operatingExpenses);

    // Calculate monthly payment
    const principal = new Decimal(loan_amount);
    const monthlyRate = new Decimal(interest_rate).dividedBy(100).dividedBy(12);
    
    let monthlyPayment;
    if (is_interest_only) {
      monthlyPayment = principal.times(monthlyRate);
    } else {
      const n = new Decimal(loan_term_months);
      const numerator = monthlyRate.times(Decimal.pow(monthlyRate.plus(1), n));
      const denominator = Decimal.pow(monthlyRate.plus(1), n).minus(1);
      monthlyPayment = principal.times(numerator.dividedBy(denominator));
    }

    // Add PITIA components
    const pitia = monthlyPayment.plus(monthlyTaxes).plus(monthlyInsurance);

    // Calculate DSCR
    const dscr = noi.dividedBy(pitia);

    return Response.json({
      inputs: {
        monthly_rent: rent.toNumber(),
        loan_amount: principal.toNumber(),
        interest_rate: interest_rate,
        loan_term_months: loan_term_months,
        property_taxes: property_taxes || 0,
        insurance: insurance || 0,
        hoa_fees: hoa_fees || 0,
        vacancy_factor,
        operating_expense_ratio,
      },
      calculations: {
        gross_rent: rent.toDecimalPlaces(2).toNumber(),
        vacancy_loss: vacancy.toDecimalPlaces(2).toNumber(),
        effective_income: effectiveIncome.toDecimalPlaces(2).toNumber(),
        operating_expenses: operatingExpenses.toDecimalPlaces(2).toNumber(),
        monthly_taxes: monthlyTaxes.toDecimalPlaces(2).toNumber(),
        monthly_insurance: monthlyInsurance.toDecimalPlaces(2).toNumber(),
        monthly_hoa: monthlyHoa.toDecimalPlaces(2).toNumber(),
        noi: noi.toDecimalPlaces(2).toNumber(),
        monthly_payment: monthlyPayment.toDecimalPlaces(2).toNumber(),
        pitia: pitia.toDecimalPlaces(2).toNumber(),
        dscr: dscr.toDecimalPlaces(4).toNumber(),
      },
      qualification: {
        dscr_meets_minimum: dscr.greaterThanOrEqualTo(1.25),
        minimum_required: 1.25,
        dscr_rating: dscr.greaterThanOrEqualTo(1.5) ? 'excellent' : 
                     dscr.greaterThanOrEqualTo(1.25) ? 'good' : 
                     dscr.greaterThanOrEqualTo(1.0) ? 'marginal' : 'insufficient',
      },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});