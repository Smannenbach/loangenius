import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { calculateDealMetrics, calculatePropertyMetrics, validateDSCRDeal } from './dscrCalculator.js';
import { logAudit, logActivity } from './auditLogHelper.js';

/**
 * Create or update a DSCR deal with multi-borrower and property support
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { 
      deal_id,
      org_id,
      loan_product,
      loan_purpose,
      is_blanket,
      loan_amount,
      interest_rate,
      loan_term_months,
      amortization_type,
      application_date,
      assigned_to_user_id,
      borrowers,
      properties
    } = await req.json();

    if (!org_id || !loan_product || !loan_purpose) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Validate borrowers
    if (!borrowers || borrowers.length === 0) {
      return Response.json({ error: 'At least one borrower required' }, { status: 400 });
    }

    // Validate properties
    if (!properties || properties.length === 0) {
      return Response.json({ error: 'At least one property required' }, { status: 400 });
    }

    // Validate blanket rules
    if (is_blanket && properties.length < 2) {
      return Response.json({ error: 'Blanket deals require 2+ properties' }, { status: 400 });
    }

    // Validate DSCR deal
    const dealValidation = validateDSCRDeal({ loan_amount, interest_rate, loan_term_months }, properties);
    if (!dealValidation.valid) {
      return Response.json({ 
        error: 'Deal validation failed',
        issues: dealValidation.issues
      }, { status: 400 });
    }

    let deal;
    const startTime = Date.now();

    if (deal_id) {
      // Update existing deal
      const existingDeal = await base44.asServiceRole.entities.Deal.filter({ id: deal_id });
      if (!existingDeal.length) {
        return Response.json({ error: 'Deal not found' }, { status: 404 });
      }

      deal = await base44.asServiceRole.entities.Deal.update(deal_id, {
        loan_product,
        loan_purpose,
        is_blanket,
        loan_amount,
        interest_rate,
        loan_term_months,
        amortization_type: amortization_type || 'fixed',
        application_date,
        assigned_to_user_id
      });

      // Audit and event logging handled by automations
    } else {
      // Create new deal
      // Generate deal number: LG-YYYYMM-XXXX
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const allDeals = await base44.asServiceRole.entities.Deal.filter({ org_id });
      const sequence = (allDeals.length % 10000) + 1;
      const deal_number = `LG-${year}${month}-${String(sequence).padStart(4, '0')}`;

      deal = await base44.asServiceRole.entities.Deal.create({
        org_id,
        deal_number,
        loan_product,
        loan_purpose,
        is_blanket: is_blanket || false,
        loan_amount,
        interest_rate,
        loan_term_months: loan_term_months || 360,
        amortization_type: amortization_type || 'fixed',
        application_date: application_date || new Date().toISOString().split('T')[0],
        assigned_to_user_id,
        stage: 'inquiry',
        status: 'draft'
      });

      // Audit and event logging handled by automations
    }

    // Handle borrowers
    for (const borrower of borrowers) {
      const existingLinks = await base44.asServiceRole.entities.DealBorrower.filter({
        deal_id: deal.id,
        borrower_id: borrower.id
      });

      if (existingLinks.length === 0) {
        await base44.asServiceRole.entities.DealBorrower.create({
          org_id,
          deal_id: deal.id,
          borrower_id: borrower.id,
          role: borrower.role || 'primary',
          ownership_percent: borrower.ownership_percent
        });
      }
    }

    // Handle properties and calculate per-property metrics
    for (const property of properties) {
      const existingLinks = await base44.asServiceRole.entities.DealProperty.filter({
        deal_id: deal.id,
        property_id: property.id
      });

      const propMetrics = is_blanket 
        ? calculatePropertyMetrics(property, property.loan_amount_allocated || loan_amount / properties.length, interest_rate, loan_term_months)
        : calculatePropertyMetrics(property, loan_amount, interest_rate, loan_term_months);

      if (existingLinks.length === 0) {
        await base44.asServiceRole.entities.DealProperty.create({
          org_id,
          deal_id: deal.id,
          property_id: property.id,
          role: property.role || 'primary',
          loan_amount_allocated: property.loan_amount_allocated || (is_blanket ? loan_amount / properties.length : loan_amount),
          dscr_ratio: propMetrics.dscr_ratio,
          ltv_ratio: propMetrics.ltv_ratio,
          monthly_pi: propMetrics.monthly_pi,
          monthly_pitia: propMetrics.monthly_pitia
        });
      } else {
        await base44.asServiceRole.entities.DealProperty.update(existingLinks[0].id, {
          loan_amount_allocated: property.loan_amount_allocated || (is_blanket ? loan_amount / properties.length : loan_amount),
          dscr_ratio: propMetrics.dscr_ratio,
          ltv_ratio: propMetrics.ltv_ratio,
          monthly_pi: propMetrics.monthly_pi,
          monthly_pitia: propMetrics.monthly_pitia
        });
      }
    }

    // Calculate and update deal metrics
    const metrics = calculateDealMetrics(deal, properties);
    const updatedDeal = await base44.asServiceRole.entities.Deal.update(deal.id, {
      dscr: metrics.dscr,
      ltv: metrics.ltv,
      monthly_pitia: metrics.monthly_pitia,
      monthly_pi: metrics.monthly_pi
    });

    // Audit log
    await logAudit(base44, {
      action_type: deal_id ? 'Update' : 'Create',
      entity_type: 'Deal',
      entity_id: updatedDeal.id,
      entity_name: updatedDeal.deal_number,
      description: `${deal_id ? 'Updated' : 'Created'} ${loan_product} deal for ${loan_purpose}`,
      severity: 'Info',
      metadata: {
        org_id,
        user_id: user.id,
        dscr: metrics.dscr,
        ltv: metrics.ltv
      }
    });

    // Activity log
    await logActivity(base44, {
      deal_id: updatedDeal.id,
      activity_type: deal_id ? 'Status_Change' : 'Note',
      title: `${deal_id ? 'Updated' : 'Created'} deal`,
      description: `${loan_product} ${loan_purpose} | DSCR: ${metrics.dscr.toFixed(2)} | LTV: ${metrics.ltv.toFixed(1)}%`,
      icon: deal_id ? '✏️' : '➕',
      color: 'blue'
    });

    const execTime = Date.now() - startTime;

    return Response.json({
      success: true,
      deal: updatedDeal,
      metrics,
      execution_ms: execTime
    });
  } catch (error) {
    console.error('Error creating/updating deal:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});