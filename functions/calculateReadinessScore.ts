/**
 * Calculate Submission Readiness Score
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { deal_id } = body;

    if (!deal_id) {
      return Response.json({ error: 'Missing deal_id' }, { status: 400 });
    }

    const deals = await base44.entities.Deal.filter({ id: deal_id });
    if (deals.length === 0) {
      return Response.json({ error: 'Deal not found' }, { status: 404 });
    }
    const deal = deals[0];

    let score = 0;
    const maxScore = 100;
    const checks = [];

    // Check 1: Basic deal info (20 points)
    if (deal.loan_amount && deal.interest_rate && deal.loan_product) {
      score += 20;
      checks.push({ name: 'Basic Info', status: 'complete', points: 20 });
    } else {
      checks.push({ name: 'Basic Info', status: 'incomplete', points: 0 });
    }

    // Check 2: Borrower info (20 points)
    const dealBorrowers = await base44.entities.DealBorrower.filter({ deal_id: deal_id });
    if (dealBorrowers.length > 0) {
      score += 20;
      checks.push({ name: 'Borrower Info', status: 'complete', points: 20 });
    } else {
      checks.push({ name: 'Borrower Info', status: 'incomplete', points: 0 });
    }

    // Check 3: Property info (20 points)
    const properties = await base44.entities.DealProperty.filter({ deal_id: deal_id });
    if (properties.length > 0) {
      score += 20;
      checks.push({ name: 'Property Info', status: 'complete', points: 20 });
    } else {
      checks.push({ name: 'Property Info', status: 'incomplete', points: 0 });
    }

    // Check 4: Required documents (25 points)
    const docReqs = await base44.entities.DealDocumentRequirement.filter({ deal_id: deal_id, is_required: true });
    const uploadedReqs = docReqs.filter(d => d.status === 'accepted' || d.status === 'uploaded');
    const docScore = docReqs.length > 0 ? Math.floor((uploadedReqs.length / docReqs.length) * 25) : 0;
    score += docScore;
    checks.push({
      name: 'Required Documents',
      status: uploadedReqs.length === docReqs.length ? 'complete' : 'incomplete',
      points: docScore,
      details: `${uploadedReqs.length}/${docReqs.length} uploaded`,
    });

    // Check 5: Conditions cleared (15 points)
    const conditions = await base44.entities.Condition.filter({ deal_id: deal_id, condition_type: 'PTD' });
    const clearedConditions = conditions.filter(c => c.status === 'fulfilled');
    const conditionScore = conditions.length > 0 ? Math.floor((clearedConditions.length / conditions.length) * 15) : 15;
    score += conditionScore;
    checks.push({
      name: 'Conditions Cleared',
      status: clearedConditions.length === conditions.length ? 'complete' : 'incomplete',
      points: conditionScore,
      details: `${clearedConditions.length}/${conditions.length} cleared`,
    });

    const readiness = score >= 90 ? 'ready' : score >= 70 ? 'almost_ready' : 'not_ready';

    return Response.json({
      success: true,
      deal_id: deal_id,
      readiness_score: score,
      max_score: maxScore,
      readiness_status: readiness,
      checks: checks,
      can_submit: readiness === 'ready',
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});