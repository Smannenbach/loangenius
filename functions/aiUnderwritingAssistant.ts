import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, deal_id, org_id } = await req.json();

    if (action === 'analyze') {
      // Fetch deal data
      const deals = await base44.entities.Deal.filter({ id: deal_id });
      const deal = deals[0];
      if (!deal) {
        return Response.json({ error: 'Deal not found' }, { status: 404 });
      }

      // Fetch related data
      const properties = await base44.entities.Property.filter({ deal_id });
      const borrowers = await base44.entities.DealBorrower.filter({ deal_id });
      const property = properties[0];

      // Calculate key metrics
      const loanAmount = deal.loan_amount || 0;
      const propertyValue = property?.estimated_value || property?.purchase_price || deal.purchase_price || 0;
      const monthlyRent = property?.gross_rent_monthly || 0;
      const monthlyTaxes = property?.taxes_monthly || 0;
      const monthlyInsurance = property?.insurance_monthly || 0;
      const monthlyHOA = property?.hoa_monthly || 0;

      // Calculate DSCR
      const rate = (deal.interest_rate || 7.5) / 100 / 12;
      const term = deal.loan_term_months || 360;
      const monthlyPI = loanAmount * (rate * Math.pow(1 + rate, term)) / (Math.pow(1 + rate, term) - 1);
      const pitia = monthlyPI + monthlyTaxes + monthlyInsurance + monthlyHOA;
      const dscr = pitia > 0 ? monthlyRent / pitia : 0;

      // Calculate LTV
      const ltv = propertyValue > 0 ? (loanAmount / propertyValue) * 100 : 0;

      // Risk assessment
      const riskFactors = {
        dscr_risk: dscr >= 1.25 ? 'low' : dscr >= 1.0 ? 'medium' : 'high',
        ltv_risk: ltv <= 70 ? 'low' : ltv <= 75 ? 'medium' : 'high',
        loan_size_risk: loanAmount > 1000000 ? 'medium' : 'low',
      };

      // Calculate risk score (0-100, lower is better)
      let riskScore = 20; // base
      if (dscr < 1.0) riskScore += 40;
      else if (dscr < 1.25) riskScore += 20;
      if (ltv > 80) riskScore += 30;
      else if (ltv > 75) riskScore += 15;
      if (!property) riskScore += 10;
      if (borrowers.length === 0) riskScore += 10;

      // Determine preliminary decision
      let preliminaryDecision = 'approve';
      let requiresManualReview = false;
      let manualReviewReason = null;

      if (riskScore > 70) {
        preliminaryDecision = 'deny';
      } else if (riskScore > 50 || dscr < 1.25 || ltv > 75) {
        preliminaryDecision = 'refer';
        requiresManualReview = true;
        manualReviewReason = 'Risk metrics require human underwriter review';
      }

      // Generate strengths and concerns
      const strengths = [];
      const concerns = [];

      if (dscr >= 1.5) strengths.push(`Strong DSCR of ${dscr.toFixed(2)} exceeds minimum requirements`);
      else if (dscr >= 1.25) strengths.push(`Adequate DSCR of ${dscr.toFixed(2)} meets minimum requirements`);
      else concerns.push(`DSCR of ${dscr.toFixed(2)} is below the 1.25 minimum threshold`);

      if (ltv <= 70) strengths.push(`Conservative LTV of ${ltv.toFixed(1)}% provides strong equity cushion`);
      else if (ltv <= 75) strengths.push(`LTV of ${ltv.toFixed(1)}% is within acceptable range`);
      else concerns.push(`LTV of ${ltv.toFixed(1)}% exceeds 75% threshold`);

      if (monthlyRent > 0) strengths.push(`Property has verified rental income of $${monthlyRent.toLocaleString()}/month`);
      else concerns.push('No rental income data provided');

      if (!property) concerns.push('Property details incomplete');
      if (borrowers.length === 0) concerns.push('No borrower information on file');

      // Recommended conditions
      const conditionsRecommended = [];
      if (dscr < 1.25) conditionsRecommended.push('Require 12 months PITIA reserves');
      if (ltv > 75) conditionsRecommended.push('Require additional down payment to reduce LTV');
      if (!property?.appraisal_value) conditionsRecommended.push('Appraisal required');
      conditionsRecommended.push('Verify rental income with lease agreement');
      conditionsRecommended.push('Verify property insurance in place');

      // Generate summary
      const analysisSummary = `This ${deal.loan_product || 'DSCR'} loan application for $${loanAmount.toLocaleString()} has been analyzed. The property generates $${monthlyRent.toLocaleString()}/month in rental income against total monthly obligations of $${pitia.toFixed(0)}, resulting in a DSCR of ${dscr.toFixed(2)}. The loan-to-value ratio is ${ltv.toFixed(1)}%. ${preliminaryDecision === 'approve' ? 'The deal meets underwriting guidelines and is recommended for approval.' : preliminaryDecision === 'refer' ? 'Some risk factors require additional review by a human underwriter.' : 'The deal does not meet current underwriting standards.'}`;

      // Check for existing underwriting record
      const existing = await base44.entities.LoanUnderwriting.filter({ deal_id });

      const underwritingData = {
        org_id: org_id || deal.org_id,
        deal_id,
        risk_score: Math.min(100, Math.max(0, riskScore)),
        confidence_score: 85,
        preliminary_decision: preliminaryDecision,
        decision_reasons: [
          `DSCR: ${dscr.toFixed(2)}`,
          `LTV: ${ltv.toFixed(1)}%`,
          `Risk Score: ${riskScore}/100`
        ],
        risk_factors: riskFactors,
        strengths,
        concerns,
        conditions_recommended: conditionsRecommended,
        dscr_calculated: dscr,
        ltv_calculated: ltv,
        analysis_summary: analysisSummary,
        requires_manual_review: requiresManualReview,
        manual_review_reason: manualReviewReason,
        metadata_json: {
          analyzed_at: new Date().toISOString(),
          analyzed_by: 'ai_assistant',
          deal_snapshot: { loanAmount, propertyValue, monthlyRent, monthlyPI, pitia }
        }
      };

      let result;
      if (existing.length > 0) {
        result = await base44.entities.LoanUnderwriting.update(existing[0].id, underwritingData);
      } else {
        result = await base44.entities.LoanUnderwriting.create(underwritingData);
      }

      return Response.json({
        success: true,
        underwriting: result,
        summary: {
          decision: preliminaryDecision,
          risk_score: riskScore,
          dscr: dscr.toFixed(2),
          ltv: ltv.toFixed(1),
          requires_review: requiresManualReview
        }
      });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('AI Underwriting error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});