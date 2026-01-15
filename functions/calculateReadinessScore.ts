/**
 * Calculate deal submission readiness score
 * Returns overall %, status, and breakdown by category
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { org_id, deal_id, checklist_id } = await req.json();

    if (!org_id || !deal_id) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get deal
    const deals = await base44.asServiceRole.entities.Deal.filter({ id: deal_id });
    if (!deals.length) {
      return Response.json({ error: 'Deal not found' }, { status: 404 });
    }
    const deal = deals[0];

    // Get checklist (use default if not specified)
    let checklists = [];
    if (checklist_id) {
      checklists = await base44.asServiceRole.entities.SubmissionChecklist.filter({ id: checklist_id });
    } else {
      checklists = await base44.asServiceRole.entities.SubmissionChecklist.filter({
        org_id,
        is_default: true,
        is_active: true
      });
    }

    if (!checklists.length) {
      return Response.json({ error: 'No checklist found' }, { status: 404 });
    }

    const checklist = checklists[0];

    // Get checklist items
    const items = await base44.asServiceRole.entities.SubmissionChecklistItem.filter({
      checklist_id: checklist.id,
      is_required: true
    });

    // Get related data
    const documents = await base44.asServiceRole.entities.Document.filter({ deal_id });
    const borrowers = await base44.asServiceRole.entities.DealBorrower.filter({ deal_id });
    const envelopes = await base44.asServiceRole.entities.DocuSignEnvelope.filter({ deal_id });

    // Evaluate each item
    const categories = {};
    let totalPassed = 0;
    let totalItems = 0;
    const blockingIssues = [];
    const warnings = [];

    for (const item of items) {
      if (!categories[item.category]) {
        categories[item.category] = {
          score: 0,
          total: 0,
          passed: 0,
          failed: 0,
          items: []
        };
      }

      categories[item.category].total++;
      totalItems++;

      let status = 'Failed';
      let message = '';

      // Evaluate based on category
      if (item.category === 'Documents') {
        const doc = documents.find(d => d.document_type === item.item_key);
        if (doc && ['Uploaded', 'Approved'].includes(doc.status) && !isExpired(doc)) {
          status = 'Passed';
          categories[item.category].passed++;
          totalPassed++;
        } else {
          message = doc ? `Status: ${doc.status}` : 'Missing';
        }
      } else if (item.category === 'Data_Fields') {
        const fieldPath = item.item_key.split('.');
        const value = getNestedValue(deal, fieldPath);
        if (value && value !== '' && value !== null) {
          status = 'Passed';
          categories[item.category].passed++;
          totalPassed++;
        } else {
          message = 'Missing';
        }
      } else if (item.category === 'Conditions') {
        // Check if conditions cleared
        const conditions = await base44.asServiceRole.entities.Condition.filter({
          deal_id,
          condition_type: item.item_key
        });
        const cleared = conditions.filter(c => ['Approved', 'Waived'].includes(c.status)).length;
        if (cleared === conditions.length) {
          status = 'Passed';
          categories[item.category].passed++;
          totalPassed++;
        } else {
          message = `${cleared}/${conditions.length} cleared`;
        }
      } else if (item.category === 'Signatures') {
        const signed = envelopes.filter(e => e.status === 'completed').length;
        if (signed > 0) {
          status = 'Passed';
          categories[item.category].passed++;
          totalPassed++;
        } else {
          message = 'Not signed';
        }
      }

      categories[item.category].items.push({
        item_key: item.item_key,
        display_name: item.display_name,
        status,
        is_blocking: item.is_blocking,
        message
      });

      if (status === 'Failed') {
        categories[item.category].failed++;
        if (item.is_blocking) {
          blockingIssues.push({
            category: item.category,
            display_name: item.display_name,
            message
          });
        } else {
          warnings.push({
            category: item.category,
            display_name: item.display_name,
            message
          });
        }
      }
    }

    // Calculate scores
    const overallScore = totalItems > 0 ? (totalPassed / totalItems) * 100 : 0;
    let status = 'Not Ready';
    if (overallScore === 100 && blockingIssues.length === 0) {
      status = 'Ready';
    } else if (overallScore >= 80 && blockingIssues.length === 0) {
      status = 'Almost Ready';
    }

    // Calculate category scores
    for (const cat in categories) {
      categories[cat].score = categories[cat].total > 0
        ? (categories[cat].passed / categories[cat].total) * 100
        : 0;
    }

    return Response.json({
      score: Math.round(overallScore),
      status,
      can_submit: blockingIssues.length === 0,
      categories,
      blocking_issues: blockingIssues,
      warnings
    });
  } catch (error) {
    console.error('Error in calculateReadinessScore:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function getNestedValue(obj, path) {
  let value = obj;
  for (const key of path) {
    value = value?.[key];
  }
  return value;
}

function isExpired(doc) {
  if (!doc.expires_at) return false;
  return new Date(doc.expires_at) < new Date();
}