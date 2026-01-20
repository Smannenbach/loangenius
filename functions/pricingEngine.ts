import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { action, deal_id, org_id, pricing_rule_id, scenarios } = await req.json();

    if (action === 'calculate_pricing') {
      const deals = await base44.entities.Deal.filter({ id: deal_id });
      const deal = deals[0];
      if (!deal) return Response.json({ error: 'Deal not found' }, { status: 404 });

      const properties = await base44.entities.Property.filter({ deal_id });
      const property = properties[0];
      
      // Find applicable pricing rule
      const rules = await base44.entities.PricingRule.filter({ org_id: org_id || deal.org_id, is_active: true });
      const rule = pricing_rule_id 
        ? rules.find(r => r.id === pricing_rule_id)
        : rules.find(r => r.loan_type === deal.loan_product) || rules[0];
      
      if (!rule) return Response.json({ error: 'No pricing rule found' }, { status: 400 });
      
      const loanAmount = deal.loan_amount || 0;
      const propertyValue = property?.estimated_value || property?.purchase_price || deal.purchase_price || 0;
      const ltv = propertyValue > 0 ? (loanAmount / propertyValue) * 100 : 0;
      const fico = deal.fico_score || 700;
      const propertyType = property?.property_type || 'sfr';
      const occupancy = property?.occupancy_type || 'investment';
      
      let baseRate = rule.base_rate || 7.5;
      const adjustments = [];
      
      // LTV adjustment
      const ltvAdj = rule.ltv_adjustments_json || {};
      let ltvAdjustment = 0;
      if (ltv <= 60) ltvAdjustment = ltvAdj['0-60'] || -0.125;
      else if (ltv <= 70) ltvAdjustment = ltvAdj['60-70'] || 0;
      else if (ltv <= 75) ltvAdjustment = ltvAdj['70-75'] || 0.125;
      else ltvAdjustment = ltvAdj['75-80'] || 0.25;
      adjustments.push({ name: 'LTV', value: ltvAdjustment, reason: `LTV: ${ltv.toFixed(1)}%` });
      
      // FICO adjustment
      const ficoAdj = rule.fico_adjustments_json || {};
      let ficoAdjustment = 0;
      if (fico >= 740) ficoAdjustment = ficoAdj['740+'] || -0.25;
      else if (fico >= 720) ficoAdjustment = ficoAdj['720-739'] || -0.125;
      else if (fico >= 700) ficoAdjustment = ficoAdj['700-719'] || 0;
      else ficoAdjustment = ficoAdj['680-699'] || 0.25;
      adjustments.push({ name: 'FICO', value: ficoAdjustment, reason: `FICO: ${fico}` });
      
      // Property type adjustment
      const propAdj = rule.property_type_adjustments_json || {};
      const propAdjustment = propAdj[propertyType] || 0;
      adjustments.push({ name: 'Property Type', value: propAdjustment, reason: propertyType });
      
      // Occupancy adjustment
      const occAdj = rule.occupancy_adjustments_json || {};
      const occAdjustment = occAdj[occupancy] || 0.5;
      adjustments.push({ name: 'Occupancy', value: occAdjustment, reason: occupancy });
      
      const totalAdjustment = adjustments.reduce((sum, a) => sum + a.value, 0);
      const finalRate = baseRate + totalAdjustment;
      
      // Calculate monthly payment
      const rate = finalRate / 100 / 12;
      const term = deal.loan_term_months || 360;
      const monthlyPayment = loanAmount * (rate * Math.pow(1 + rate, term)) / (Math.pow(1 + rate, term) - 1);
      
      // Calculate APR (simplified)
      const apr = finalRate + 0.125;
      
      // Save pricing result
      const existing = await base44.entities.LoanPricing.filter({ deal_id });
      const pricingData = {
        org_id: org_id || deal.org_id, deal_id, pricing_rule_id: rule.id, base_rate: baseRate,
        adjustments_json: { adjustments, total_adjustment: totalAdjustment },
        final_rate: finalRate, apr, monthly_payment: monthlyPayment,
        calculated_at: new Date().toISOString()
      };
      
      if (existing.length > 0) {
        await base44.entities.LoanPricing.update(existing[0].id, pricingData);
      } else {
        await base44.entities.LoanPricing.create(pricingData);
      }
      
      return Response.json({ base_rate: baseRate, adjustments, final_rate: finalRate, apr, monthly_payment: monthlyPayment, breakdown: { ltv, fico, property_type: propertyType, occupancy } });
    }

    if (action === 'get_scenarios') {
      const results = [];
      for (const scenario of scenarios || []) {
        const { ltv, fico } = scenario;
        // Simplified scenario calculation
        let baseRate = 7.5;
        let adjustment = 0;
        if (ltv <= 60) adjustment -= 0.125;
        else if (ltv > 75) adjustment += 0.25;
        if (fico >= 740) adjustment -= 0.25;
        else if (fico < 700) adjustment += 0.25;
        
        results.push({ scenario, rate: baseRate + adjustment });
      }
      return Response.json({ scenarios: results });
    }

    if (action === 'get_improvements') {
      const deals = await base44.entities.Deal.filter({ id: deal_id });
      const deal = deals[0];
      const properties = await base44.entities.Property.filter({ deal_id });
      const property = properties[0];
      
      const ltv = property ? ((deal.loan_amount || 0) / (property.estimated_value || 1)) * 100 : 80;
      const fico = deal?.fico_score || 700;
      
      const suggestions = [];
      if (fico < 740) suggestions.push({ improvement: 'Increase FICO to 740+', potential_savings: '0.25%' });
      if (ltv > 70) suggestions.push({ improvement: 'Reduce LTV to 70% or below', potential_savings: '0.125%' });
      
      return Response.json({ current_metrics: { ltv, fico }, improvement_suggestions: suggestions });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Pricing engine error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});