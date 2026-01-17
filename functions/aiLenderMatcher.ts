import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const OPENAI_API_KEY = Deno.env.get('OpenAI_API_Key');

/**
 * AI-Powered Lender Matching System
 * Analyzes historical data to provide intelligent lender recommendations
 */

/**
 * Fetch and aggregate historical performance data for lenders
 */
async function getLenderPerformanceData(base44, orgId) {
  // Get all submissions with outcomes
  const allSubmissions = await base44.entities.LenderSubmission.filter({ org_id: orgId });
  
  // Get all deals to understand deal characteristics
  const dealIds = [...new Set(allSubmissions.map(s => s.deal_id))];
  const deals = await base44.entities.Deal.filter({ org_id: orgId });
  const dealsMap = new Map(deals.map(d => [d.id, d]));
  
  // Aggregate performance by lender
  const lenderStats = {};
  
  for (const submission of allSubmissions) {
    const lenderId = submission.lender_integration_id;
    if (!lenderId) continue;
    
    if (!lenderStats[lenderId]) {
      lenderStats[lenderId] = {
        total_submissions: 0,
        approved: 0,
        denied: 0,
        in_review: 0,
        withdrawn: 0,
        avg_response_days: [],
        by_loan_product: {},
        by_loan_amount_range: {},
        by_state: {},
        by_ltv_range: {},
        by_dscr_range: {},
        by_property_type: {},
        by_submission_method: {},
        recent_submissions: []
      };
    }
    
    const stats = lenderStats[lenderId];
    stats.total_submissions++;
    
    // Track status outcomes
    if (submission.status === 'approved') stats.approved++;
    else if (submission.status === 'denied') stats.denied++;
    else if (submission.status === 'in_review' || submission.status === 'received') stats.in_review++;
    else if (submission.status === 'withdrawn') stats.withdrawn++;
    
    // Calculate response time
    if (submission.submitted_at && submission.lender_response_at) {
      const submitted = new Date(submission.submitted_at);
      const responded = new Date(submission.lender_response_at);
      const days = (responded - submitted) / (1000 * 60 * 60 * 24);
      if (days > 0 && days < 90) stats.avg_response_days.push(days);
    }
    
    // Get associated deal for context
    const deal = dealsMap.get(submission.deal_id);
    if (deal) {
      // By loan product
      const product = deal.loan_product || 'unknown';
      if (!stats.by_loan_product[product]) {
        stats.by_loan_product[product] = { total: 0, approved: 0 };
      }
      stats.by_loan_product[product].total++;
      if (submission.status === 'approved') stats.by_loan_product[product].approved++;
      
      // By loan amount range
      const amountRange = getAmountRange(deal.loan_amount);
      if (!stats.by_loan_amount_range[amountRange]) {
        stats.by_loan_amount_range[amountRange] = { total: 0, approved: 0 };
      }
      stats.by_loan_amount_range[amountRange].total++;
      if (submission.status === 'approved') stats.by_loan_amount_range[amountRange].approved++;
      
      // By LTV range
      if (deal.ltv) {
        const ltvRange = getLTVRange(deal.ltv);
        if (!stats.by_ltv_range[ltvRange]) {
          stats.by_ltv_range[ltvRange] = { total: 0, approved: 0 };
        }
        stats.by_ltv_range[ltvRange].total++;
        if (submission.status === 'approved') stats.by_ltv_range[ltvRange].approved++;
      }
      
      // By DSCR range
      if (deal.dscr) {
        const dscrRange = getDSCRRange(deal.dscr);
        if (!stats.by_dscr_range[dscrRange]) {
          stats.by_dscr_range[dscrRange] = { total: 0, approved: 0 };
        }
        stats.by_dscr_range[dscrRange].total++;
        if (submission.status === 'approved') stats.by_dscr_range[dscrRange].approved++;
      }
      
      // By property type
      const propType = deal.property_type || 'unknown';
      if (!stats.by_property_type[propType]) {
        stats.by_property_type[propType] = { total: 0, approved: 0 };
      }
      stats.by_property_type[propType].total++;
      if (submission.status === 'approved') stats.by_property_type[propType].approved++;
    }
    
    // By submission method
    const method = submission.submission_method || 'EMAIL';
    if (!stats.by_submission_method[method]) {
      stats.by_submission_method[method] = { total: 0, approved: 0, avg_response_days: [] };
    }
    stats.by_submission_method[method].total++;
    if (submission.status === 'approved') stats.by_submission_method[method].approved++;
    
    // Track recent submissions (last 90 days)
    if (submission.submitted_at) {
      const submittedDate = new Date(submission.submitted_at);
      const daysSince = (Date.now() - submittedDate) / (1000 * 60 * 60 * 24);
      if (daysSince <= 90) {
        stats.recent_submissions.push({
          status: submission.status,
          days_ago: Math.round(daysSince)
        });
      }
    }
  }
  
  // Calculate aggregate metrics
  for (const [lenderId, stats] of Object.entries(lenderStats)) {
    stats.approval_rate = stats.total_submissions > 0 
      ? (stats.approved / stats.total_submissions * 100).toFixed(1) 
      : 0;
    stats.avg_response_time = stats.avg_response_days.length > 0
      ? (stats.avg_response_days.reduce((a, b) => a + b, 0) / stats.avg_response_days.length).toFixed(1)
      : null;
    stats.recent_activity_score = stats.recent_submissions.length;
    
    // Calculate method effectiveness
    for (const [method, methodStats] of Object.entries(stats.by_submission_method)) {
      methodStats.approval_rate = methodStats.total > 0 
        ? (methodStats.approved / methodStats.total * 100).toFixed(1)
        : 0;
    }
  }
  
  return lenderStats;
}

function getAmountRange(amount) {
  if (!amount) return 'unknown';
  if (amount < 200000) return 'under_200k';
  if (amount < 500000) return '200k_500k';
  if (amount < 1000000) return '500k_1m';
  if (amount < 2000000) return '1m_2m';
  return 'over_2m';
}

function getLTVRange(ltv) {
  if (ltv < 60) return 'under_60';
  if (ltv < 70) return '60_70';
  if (ltv < 75) return '70_75';
  if (ltv < 80) return '75_80';
  return 'over_80';
}

function getDSCRRange(dscr) {
  if (dscr < 1.0) return 'under_1.0';
  if (dscr < 1.15) return '1.0_1.15';
  if (dscr < 1.25) return '1.15_1.25';
  if (dscr < 1.5) return '1.25_1.5';
  return 'over_1.5';
}

/**
 * Calculate AI-enhanced match score for a lender based on historical data
 */
function calculateAIMatchScore(lender, deal, property, performanceData) {
  let score = 50; // Base score
  const insights = [];
  const warnings = [];
  
  const stats = performanceData[lender.id];
  
  // === HISTORICAL PERFORMANCE SCORING ===
  
  if (stats) {
    // Overall approval rate (max +20 points)
    const approvalRate = parseFloat(stats.approval_rate) || 0;
    if (approvalRate >= 80) {
      score += 20;
      insights.push(`High approval rate: ${approvalRate}%`);
    } else if (approvalRate >= 60) {
      score += 15;
      insights.push(`Good approval rate: ${approvalRate}%`);
    } else if (approvalRate >= 40) {
      score += 5;
    } else if (stats.total_submissions >= 3) {
      score -= 10;
      warnings.push(`Low approval rate: ${approvalRate}%`);
    }
    
    // Product-specific performance (max +15 points)
    const productStats = stats.by_loan_product[deal.loan_product];
    if (productStats && productStats.total >= 2) {
      const productApprovalRate = (productStats.approved / productStats.total * 100);
      if (productApprovalRate >= 70) {
        score += 15;
        insights.push(`Strong ${deal.loan_product} track record: ${productApprovalRate.toFixed(0)}% approval`);
      } else if (productApprovalRate >= 50) {
        score += 8;
        insights.push(`Good ${deal.loan_product} history`);
      } else {
        score -= 5;
        warnings.push(`Weaker ${deal.loan_product} performance historically`);
      }
    }
    
    // Loan amount range performance (max +10 points)
    const amountRange = getAmountRange(deal.loan_amount);
    const amountStats = stats.by_loan_amount_range[amountRange];
    if (amountStats && amountStats.total >= 2) {
      const amountApprovalRate = (amountStats.approved / amountStats.total * 100);
      if (amountApprovalRate >= 70) {
        score += 10;
        insights.push(`Strong in ${amountRange.replace(/_/g, '-')} loan range`);
      } else if (amountApprovalRate < 40) {
        score -= 5;
        warnings.push(`Lower success in this loan amount range`);
      }
    }
    
    // LTV range performance (max +10 points)
    if (deal.ltv) {
      const ltvRange = getLTVRange(deal.ltv);
      const ltvStats = stats.by_ltv_range[ltvRange];
      if (ltvStats && ltvStats.total >= 2) {
        const ltvApprovalRate = (ltvStats.approved / ltvStats.total * 100);
        if (ltvApprovalRate >= 70) {
          score += 10;
          insights.push(`Strong performance at ${deal.ltv}% LTV`);
        } else if (ltvApprovalRate < 40) {
          score -= 5;
          warnings.push(`Lower success at this LTV level`);
        }
      }
    }
    
    // DSCR range performance (max +10 points)
    if (deal.dscr) {
      const dscrRange = getDSCRRange(deal.dscr);
      const dscrStats = stats.by_dscr_range[dscrRange];
      if (dscrStats && dscrStats.total >= 2) {
        const dscrApprovalRate = (dscrStats.approved / dscrStats.total * 100);
        if (dscrApprovalRate >= 70) {
          score += 10;
          insights.push(`Strong performance at ${deal.dscr} DSCR`);
        } else if (dscrApprovalRate < 40) {
          score -= 5;
          warnings.push(`Lower success at this DSCR level`);
        }
      }
    }
    
    // Response time scoring (max +5 points)
    if (stats.avg_response_time) {
      const avgDays = parseFloat(stats.avg_response_time);
      if (avgDays <= 3) {
        score += 5;
        insights.push(`Fast responder: ~${avgDays} days avg`);
      } else if (avgDays <= 7) {
        score += 2;
      } else if (avgDays > 14) {
        score -= 3;
        warnings.push(`Slow response time: ~${avgDays} days avg`);
      }
    }
    
    // Recent activity bonus (max +5 points)
    if (stats.recent_activity_score >= 5) {
      score += 5;
      insights.push('Active relationship');
    } else if (stats.recent_activity_score === 0 && stats.total_submissions > 0) {
      warnings.push('No recent submissions');
    }
  }
  
  // === CRITERIA-BASED SCORING ===
  
  // Loan amount within range (+5)
  if (deal.loan_amount >= (lender.min_loan_amount || 0) && 
      deal.loan_amount <= (lender.max_loan_amount || 100000000)) {
    score += 5;
  }
  
  // DSCR meets minimum (+5)
  if (lender.min_dscr && deal.dscr && deal.dscr >= lender.min_dscr) {
    score += 5;
  } else if (lender.min_dscr && deal.dscr && deal.dscr < lender.min_dscr) {
    score -= 15;
    warnings.push(`DSCR ${deal.dscr} below min ${lender.min_dscr}`);
  }
  
  // LTV within max (+5)
  if (lender.max_ltv && deal.ltv && deal.ltv <= lender.max_ltv) {
    score += 5;
  } else if (lender.max_ltv && deal.ltv && deal.ltv > lender.max_ltv) {
    score -= 15;
    warnings.push(`LTV ${deal.ltv}% exceeds max ${lender.max_ltv}%`);
  }
  
  // Auto-submit bonus
  if (lender.auto_submit_enabled) {
    score += 3;
    insights.push('Auto-submit enabled');
  }
  
  // Cap score between 0-100
  score = Math.max(0, Math.min(100, score));
  
  return { score, insights, warnings };
}

/**
 * Use AI Model Router for strategic recommendations with thinking mode
 */
async function generateAIRecommendations(base44, deal, property, matchedLenders, performanceData) {
  const systemPrompt = `You are an expert loan broker AI assistant specializing in DSCR and commercial lending. 
Analyze deals and lender data to provide strategic outreach recommendations.
Think step-by-step about the best approach for each lender based on their historical performance and the deal characteristics.`;

  const userPrompt = `Analyze this deal and recommend the best lender outreach strategy.

DEAL DETAILS:
- Loan Product: ${deal.loan_product || 'DSCR'}
- Loan Amount: $${(deal.loan_amount || 0).toLocaleString()}
- Loan Purpose: ${deal.loan_purpose || 'Purchase'}
- LTV: ${deal.ltv || 'N/A'}%
- DSCR: ${deal.dscr || 'N/A'}
- Property Type: ${deal.property_type || property?.property_type || 'SFR'}
- State: ${property?.address_state || 'Unknown'}

MATCHED LENDERS (Top 5):
${matchedLenders.slice(0, 5).map((l, i) => `
${i + 1}. ${l.lender_name}
   - Match Score: ${l.ai_score}/100
   - AI Insights: ${l.ai_insights?.join(', ') || 'No data'}
   - Warnings: ${l.ai_warnings?.join(', ') || 'None'}
   - Historical Approval Rate: ${performanceData[l.id]?.approval_rate || 'No data'}%
   - Avg Response Time: ${performanceData[l.id]?.avg_response_time || 'Unknown'} days
   - Preferred Method: ${l.api_type}
`).join('')}

Provide a JSON response with:
1. "top_recommendation": The single best lender and why
2. "outreach_strategy": Array of strategies for each top lender with:
   - lender_name
   - recommended_method: "email" or "mismo" or "phone_then_email"
   - priority: "immediate", "within_48h", "standard"
   - personalization_tips: What to emphasize for this lender
   - follow_up_timing: When to follow up if no response
3. "deal_strengths": What makes this deal attractive
4. "deal_concerns": Potential red flags to address proactively
5. "overall_confidence": "high", "medium", or "low" with brief explanation

Return ONLY valid JSON, no markdown.`;

  try {
    const response = await base44.functions.invoke('aiModelRouter', {
      task_type: 'lender_matching',
      system_prompt: systemPrompt,
      user_prompt: userPrompt,
      options: {
        json_response: true,
        thinking: true,
        thinking_budget: 8000
      }
    });

    if (response.data?.parsed) {
      return response.data.parsed;
    }
    
    if (response.data?.content) {
      try {
        return JSON.parse(response.data.content);
      } catch (e) {
        const jsonMatch = response.data.content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
      }
    }
    
    return null;
  } catch (error) {
    console.error('AI Model Router error:', error);
    return null;
  }
}

/**
 * Main handler
 */
Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  try {
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, ...params } = await req.json();

    switch (action) {
      case 'ai_match_lenders': {
        const { deal_id } = params;
        
        const deal = await base44.entities.Deal.get(deal_id);
        if (!deal) {
          return Response.json({ error: 'Deal not found' }, { status: 404 });
        }

        // Get property
        let property = null;
        const dealProps = await base44.entities.DealProperty.filter({ deal_id });
        if (dealProps.length > 0) {
          property = await base44.entities.Property.get(dealProps[0].property_id);
        }

        // Get all active lenders
        const allLenders = await base44.entities.LenderIntegration.filter({
          org_id: deal.org_id,
          status: 'active'
        });

        // Fetch historical performance data
        const performanceData = await getLenderPerformanceData(base44, deal.org_id);

        // Filter lenders by hard criteria first
        const propertyState = property?.address_state;
        const eligibleLenders = allLenders.filter(lender => {
          // Check loan amount
          if (lender.min_loan_amount && deal.loan_amount < lender.min_loan_amount) return false;
          if (lender.max_loan_amount && deal.loan_amount > lender.max_loan_amount) return false;
          
          // Check state
          if (lender.supported_states?.length > 0 && propertyState) {
            const statesLower = lender.supported_states.map(s => s.toLowerCase());
            if (!statesLower.includes(propertyState.toLowerCase()) && 
                !statesLower.includes('nationwide') &&
                !statesLower.includes('all states')) {
              return false;
            }
          }
          
          // Check product
          if (lender.supported_products?.length > 0) {
            const productsLower = lender.supported_products.map(p => p.toLowerCase());
            const dealProduct = (deal.loan_product || '').toLowerCase();
            if (!productsLower.some(p => dealProduct.includes(p) || p.includes(dealProduct))) {
              return false;
            }
          }
          
          return true;
        });

        // Calculate AI-enhanced scores
        const scoredLenders = eligibleLenders.map(lender => {
          const { score, insights, warnings } = calculateAIMatchScore(lender, deal, property, performanceData);
          return {
            ...lender,
            ai_score: score,
            ai_insights: insights,
            ai_warnings: warnings,
            historical_stats: performanceData[lender.id] || null
          };
        });

        // Sort by AI score
        scoredLenders.sort((a, b) => b.ai_score - a.ai_score);

        // Get existing submissions
        const existingSubmissions = await base44.entities.LenderSubmission.filter({ deal_id });
        const contactedLenderIds = new Set(existingSubmissions.map(s => s.lender_integration_id));

        // Mark contacted lenders
        const lendersWithStatus = scoredLenders.map(lender => ({
          ...lender,
          already_contacted: contactedLenderIds.has(lender.id)
        }));

        // Generate AI recommendations for top lenders using AI Router
        let aiRecommendations = null;
        if (scoredLenders.length > 0) {
          aiRecommendations = await generateAIRecommendations(base44, deal, property, scoredLenders, performanceData);
        }

        return Response.json({
          success: true,
          matched_lenders: lendersWithStatus,
          total_matched: lendersWithStatus.length,
          already_contacted: lendersWithStatus.filter(l => l.already_contacted).length,
          ai_recommendations: aiRecommendations,
          deal_summary: {
            loan_product: deal.loan_product,
            loan_amount: deal.loan_amount,
            ltv: deal.ltv,
            dscr: deal.dscr,
            state: propertyState
          }
        });
      }

      case 'get_lender_analytics': {
        const { org_id } = params;
        const performanceData = await getLenderPerformanceData(base44, org_id);
        
        // Get lender names
        const lenders = await base44.entities.LenderIntegration.filter({ org_id });
        const lenderNames = new Map(lenders.map(l => [l.id, l.lender_name]));
        
        // Enrich with names
        const analytics = Object.entries(performanceData).map(([id, stats]) => ({
          lender_id: id,
          lender_name: lenderNames.get(id) || 'Unknown',
          ...stats
        }));
        
        // Sort by total submissions
        analytics.sort((a, b) => b.total_submissions - a.total_submissions);
        
        return Response.json({ success: true, analytics });
      }

      case 'record_outcome': {
        // Record submission outcome to improve AI model
        const { submission_id, outcome, response_days, notes } = params;
        
        await base44.entities.LenderSubmission.update(submission_id, {
          status: outcome,
          lender_response_at: new Date().toISOString(),
          notes: notes || undefined
        });
        
        return Response.json({ success: true, message: 'Outcome recorded' });
      }

      default:
        return Response.json({ 
          error: 'Invalid action. Use: ai_match_lenders, get_lender_analytics, record_outcome' 
        }, { status: 400 });
    }

  } catch (error) {
    console.error('AI Lender Matcher error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});