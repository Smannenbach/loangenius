import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Score leads based on qualification factors
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { lead_id, lead_ids, org_id: provided_org_id } = await req.json();

    // Support single lead_id or array of lead_ids
    const leadId = lead_id || (lead_ids && lead_ids[0]);
    
    if (!leadId) {
      return Response.json({ error: 'Missing lead_id' }, { status: 400 });
    }

    // Get lead
    const leads = await base44.asServiceRole.entities.Lead.filter({
      id: leadId,
    });

    if (leads.length === 0) {
      return Response.json({ error: 'Lead not found' }, { status: 404 });
    }

    const lead = leads[0];
    const org_id = provided_org_id || lead.org_id || 'default';

    const enrichmentLog = await base44.asServiceRole.entities.EnrichmentLog.create({
      org_id,
      entity_type: 'lead',
      entity_id: lead_id,
      enrichment_type: 'lead_scoring',
      provider_name: 'Internal Scoring Engine',
      status: 'processing',
      initiated_by: user.email,
    });

    try {
      // Score factors
      let score = 0;
      const factors = {};

      // 1. Source Quality (30 points)
      const sourceQuality = evaluateSourceQuality(lead.meta_json);
      factors.source_quality = sourceQuality;
      score += sourceQuality;

      // 2. Profile Completeness (20 points)
      const completeness = evaluateCompleteness(lead);
      factors.profile_completeness = completeness;
      score += completeness;

      // 3. Engagement Quality (20 points)
      const engagement = evaluateEngagement(lead);
      factors.engagement_quality = engagement;
      score += engagement;

      // 4. Property Fit (15 points)
      const propertyFit = evaluatePropertyFit(lead);
      factors.property_fit = propertyFit;
      score += propertyFit;

      // 5. Timing & Intent (15 points)
      const timing = evaluateTiming(lead);
      factors.timing_and_intent = timing;
      score += timing;

      const totalScore = Math.min(score, 100);
      const leadQuality = totalScore >= 75 ? 'hot' : totalScore >= 50 ? 'warm' : 'cold';
      const recommendedAction = getRecommendedAction(leadQuality, totalScore);

      const leadScore = await base44.asServiceRole.entities.LeadScore.create({
        org_id,
        lead_id,
        enrichment_log_id: enrichmentLog.id,
        overall_score: Math.round(totalScore),
        lead_quality: leadQuality,
        qualification_score: Math.round(totalScore * 0.8),
        engagement_score: Math.round(engagement * 5),
        scoring_factors: factors,
        recommended_action: recommendedAction,
        confidence: 85,
        scored_at: new Date().toISOString(),
      });

      await base44.asServiceRole.entities.EnrichmentLog.update(enrichmentLog.id, {
        status: 'completed',
        response_data: {
          score: totalScore,
          quality: leadQuality,
          recommendation: recommendedAction,
        },
      });

      return Response.json({
        success: true,
        lead_score_id: leadScore.id,
        overall_score: Math.round(totalScore),
        lead_quality: leadQuality,
        recommended_action: recommendedAction,
        factors,
      });
    } catch (error) {
      await base44.asServiceRole.entities.EnrichmentLog.update(enrichmentLog.id, {
        status: 'failed',
        error_message: error.message,
      });

      throw error;
    }
  } catch (error) {
    console.error('Error scoring lead:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function evaluateSourceQuality(metaJson) {
  // Sources like organic search, referrals score higher
  const sourceQuality = {
    referral: 30,
    organic: 28,
    paid_search: 25,
    social_media: 20,
    list: 15,
    other: 10,
  };

  const source = metaJson?.lead_source || 'other';
  return sourceQuality[source] || 10;
}

function evaluateCompleteness(lead) {
  // Check how many fields are filled
  const fieldsPresent = [
    lead.primary_contact_id,
    lead.meta_json?.phone,
    lead.meta_json?.email,
    lead.meta_json?.loan_amount,
    lead.meta_json?.property_address,
  ].filter(Boolean).length;

  return Math.min(fieldsPresent * 4, 20);
}

function evaluateEngagement(lead) {
  // Recent visits, form submissions, etc.
  const lastTouched = lead.updated_date ? new Date(lead.updated_date) : new Date('2020-01-01');
  const daysSinceContact = Math.floor((new Date() - lastTouched) / (1000 * 60 * 60 * 24));

  if (daysSinceContact === 0) return 20;
  if (daysSinceContact <= 7) return 15;
  if (daysSinceContact <= 30) return 10;
  return 0;
}

function evaluatePropertyFit(lead) {
  // Loan amount, property type alignment with capabilities
  const loanAmount = lead.meta_json?.loan_amount || 0;
  const propertyType = lead.meta_json?.property_type || 'unknown';

  if (loanAmount >= 300000 && loanAmount <= 2000000) {
    return propertyType === 'multi_family' ? 15 : 13;
  }
  if (loanAmount >= 100000) return 10;
  return 5;
}

function evaluateTiming(lead) {
  // When do they need the loan?
  const timelineMonths = lead.meta_json?.timeline_months || 12;

  if (timelineMonths <= 3) return 15;
  if (timelineMonths <= 6) return 12;
  if (timelineMonths <= 12) return 8;
  return 0;
}

function getRecommendedAction(quality, score) {
  if (quality === 'hot') return 'immediate_outreach';
  if (quality === 'warm' && score >= 60) return 'nurture_sequence';
  if (quality === 'warm') return 'research_needed';
  return 'disqualify';
}