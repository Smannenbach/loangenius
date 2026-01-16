import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { 
      org_id,
      borrower_data,
      loan_data,
      property_data
    } = await req.json();

    // Extract key metrics
    const creditScoreRange = borrower_data.credit_score_range || 'unknown';
    const loanAmount = parseFloat(loan_data.loan_amount) || 0;
    const propertyValue = parseFloat(property_data.property_value || loan_data.purchase_price) || 0;
    const monthlyRent = parseFloat(property_data.monthly_rent) || 0;
    const estimatedAssets = parseFloat(borrower_data.estimated_assets) || 0;
    
    // Calculate LTV
    const ltv = propertyValue > 0 ? (loanAmount / propertyValue) * 100 : 0;
    
    // Calculate estimated PITIA for DSCR
    const interestRate = parseFloat(loan_data.interest_rate) || 7.5;
    const monthlyRate = interestRate / 100 / 12;
    const termMonths = parseInt(loan_data.term_months) || 360;
    let monthlyPI = 0;
    if (monthlyRate > 0 && loanAmount > 0) {
      monthlyPI = loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, termMonths)) / (Math.pow(1 + monthlyRate, termMonths) - 1);
    }
    
    const monthlyTaxes = (parseFloat(property_data.annual_taxes) || 0) / 12;
    const monthlyInsurance = (parseFloat(property_data.annual_insurance) || 0) / 12;
    const monthlyHOA = parseFloat(property_data.monthly_hoa) || 0;
    const totalPITIA = monthlyPI + monthlyTaxes + monthlyInsurance + monthlyHOA;
    
    // Calculate DSCR
    const dscr = totalPITIA > 0 ? monthlyRent / totalPITIA : 0;

    // Run pre-qualification checks
    const checksPassed = [];
    const checksFailed = [];
    const checksWarnings = [];

    // Credit score check
    if (creditScoreRange === 'excellent_750+' || creditScoreRange === 'good_700-749') {
      checksPassed.push('Credit score meets minimum requirements');
    } else if (creditScoreRange === 'fair_650-699') {
      checksWarnings.push('Credit score is borderline - may require additional documentation');
    } else if (creditScoreRange === 'poor_below_650') {
      checksFailed.push('Credit score below minimum threshold of 650');
    }

    // LTV check
    if (ltv <= 75) {
      checksPassed.push(`LTV of ${ltv.toFixed(1)}% is excellent`);
    } else if (ltv <= 80) {
      checksPassed.push(`LTV of ${ltv.toFixed(1)}% meets requirements`);
    } else if (ltv <= 85) {
      checksWarnings.push(`LTV of ${ltv.toFixed(1)}% is high - may require PMI or rate adjustment`);
    } else {
      checksFailed.push(`LTV of ${ltv.toFixed(1)}% exceeds maximum of 85%`);
    }

    // DSCR check (for investment properties)
    if (loan_data.loan_type?.includes('DSCR')) {
      if (dscr >= 1.25) {
        checksPassed.push(`DSCR of ${dscr.toFixed(2)} exceeds 1.25 requirement`);
      } else if (dscr >= 1.0) {
        checksWarnings.push(`DSCR of ${dscr.toFixed(2)} is borderline - consider No-Ratio DSCR`);
      } else if (dscr > 0) {
        checksFailed.push(`DSCR of ${dscr.toFixed(2)} below minimum threshold`);
      }
    }

    // Loan amount check
    if (loanAmount >= 50000 && loanAmount <= 5000000) {
      checksPassed.push('Loan amount within acceptable range');
    } else if (loanAmount > 5000000) {
      checksWarnings.push('Loan amount exceeds standard limits - jumbo pricing may apply');
    } else {
      checksFailed.push('Loan amount below minimum of $50,000');
    }

    // Asset/reserves check
    const monthsReserves = totalPITIA > 0 ? estimatedAssets / totalPITIA : 0;
    if (monthsReserves >= 6) {
      checksPassed.push(`Reserves of ${monthsReserves.toFixed(1)} months exceeds requirement`);
    } else if (monthsReserves >= 3) {
      checksWarnings.push(`Reserves of ${monthsReserves.toFixed(1)} months is minimum acceptable`);
    } else if (estimatedAssets > 0) {
      checksFailed.push('Insufficient reserves - minimum 3 months PITIA required');
    }

    // Determine overall status
    let status = 'passed';
    if (checksFailed.length > 0) {
      status = 'failed';
    } else if (checksWarnings.length > 0) {
      status = 'needs_review';
    }

    // Generate AI recommendation
    const aiPrompt = `You are a mortgage pre-qualification assistant. Based on these results, provide a brief 2-3 sentence recommendation:

Loan Type: ${loan_data.loan_type || 'DSCR'}
Credit Score Range: ${creditScoreRange}
LTV: ${ltv.toFixed(1)}%
DSCR: ${dscr.toFixed(2)}
Loan Amount: $${loanAmount.toLocaleString()}
Reserves: ${monthsReserves.toFixed(1)} months

Checks Passed: ${checksPassed.join('; ')}
Warnings: ${checksWarnings.join('; ')}
Failed: ${checksFailed.join('; ')}

Provide a concise recommendation and next steps.`;

    let aiRecommendation = '';
    let nextSteps = [];
    
    try {
      const aiResponse = await base44.integrations.Core.InvokeLLM({
        prompt: aiPrompt,
        response_json_schema: {
          type: 'object',
          properties: {
            recommendation: { type: 'string' },
            next_steps: { type: 'array', items: { type: 'string' } },
            confidence_score: { type: 'number' }
          }
        }
      });
      
      aiRecommendation = aiResponse.recommendation || '';
      nextSteps = aiResponse.next_steps || [];
    } catch (e) {
      console.error('AI recommendation failed:', e);
      // Fallback recommendations
      if (status === 'passed') {
        aiRecommendation = 'This application appears to meet basic qualification criteria. Proceed to full application and document collection.';
        nextSteps = ['Complete full loan application', 'Upload required documents', 'Schedule consultation with loan officer'];
      } else if (status === 'needs_review') {
        aiRecommendation = 'This application has some areas of concern that may require additional review or documentation.';
        nextSteps = ['Address warning items', 'Provide additional documentation', 'Consult with loan officer'];
      } else {
        aiRecommendation = 'This application does not currently meet qualification requirements. Consider alternative loan products or address failing criteria.';
        nextSteps = ['Review failed criteria', 'Consider alternative loan products', 'Work on improving credit or reserves'];
      }
    }

    // Create pre-qualification record
    const preQual = await base44.entities.PreQualification.create({
      org_id,
      borrower_id: borrower_data.borrower_id,
      deal_id: loan_data.deal_id,
      status,
      credit_score_range: creditScoreRange,
      estimated_income: borrower_data.estimated_income,
      estimated_assets: estimatedAssets,
      loan_amount_requested: loanAmount,
      property_value: propertyValue,
      ltv_ratio: ltv,
      dscr_ratio: dscr,
      checks_passed: checksPassed,
      checks_failed: checksFailed,
      checks_warnings: checksWarnings,
      ai_recommendation: aiRecommendation,
      ai_confidence_score: 85,
      next_steps: nextSteps,
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
    });

    return Response.json({
      success: true,
      prequalification: preQual,
      summary: {
        status,
        ltv: ltv.toFixed(1),
        dscr: dscr.toFixed(2),
        monthlyPayment: totalPITIA.toFixed(0),
        checksPassedCount: checksPassed.length,
        checksFailedCount: checksFailed.length,
        warningsCount: checksWarnings.length
      }
    });

  } catch (error) {
    console.error('Pre-qualification error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});