import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Enrich property data with valuations and market data
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { property_id, org_id, deal_id, include_avm = true, include_flood = true } = await req.json();

    // Get property
    const properties = await base44.asServiceRole.entities.Property.filter({
      id: property_id,
      org_id,
    });

    if (properties.length === 0) {
      return Response.json({ error: 'Property not found' }, { status: 404 });
    }

    const property = properties[0];
    const results = {};

    // 1. AVM (Automated Valuation Model)
    if (include_avm) {
      const avmResult = await getAVMValuation(property, org_id, deal_id, user, base44);
      results.avm = avmResult;
    }

    // 2. Flood Check
    if (include_flood) {
      const floodResult = await floodRiskCheck(property, org_id, deal_id, user, base44);
      results.flood = floodResult;
    }

    return Response.json({
      success: true,
      property_id,
      results,
    });
  } catch (error) {
    console.error('Error enriching property data:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function getAVMValuation(property, org_id, deal_id, user, base44) {
  const enrichmentLog = await base44.asServiceRole.entities.EnrichmentLog.create({
    org_id,
    deal_id,
    entity_type: 'property',
    entity_id: property.id,
    enrichment_type: 'property_valuation',
    provider_name: 'CoreLogic AVM',
    status: 'processing',
    request_data: {
      address: property.address_street,
      city: property.address_city,
      state: property.address_state,
      zip: property.address_zip,
    },
    initiated_by: user.email,
  });

  try {
    // Simulate AVM API call
    // In production, call CoreLogic, Zillow, or other AVM provider
    const estimatedValue = (Math.random() * 200000) + 250000; // $250k-$450k range
    const confidence = Math.floor(Math.random() * 30) + 70; // 70-100% confidence

    const avmData = {
      estimated_value: Math.round(estimatedValue),
      confidence,
      price_per_sqft: Math.round(estimatedValue / (property.sqft || 2000)),
      market_trends: ['appreciating', 'stable', 'declining'][Math.floor(Math.random() * 3)],
      days_on_market_avg: Math.floor(Math.random() * 30) + 20,
      comparable_sales: [
        { address: 'Nearby Comp 1', sale_price: estimatedValue * 0.95, sale_date: '2025-12-01' },
        { address: 'Nearby Comp 2', sale_price: estimatedValue * 0.98, sale_date: '2025-11-15' },
        { address: 'Nearby Comp 3', sale_price: estimatedValue * 1.02, sale_date: '2025-10-20' },
      ],
    };

    const valuation = await base44.asServiceRole.entities.PropertyValuation.create({
      org_id,
      property_id: property.id,
      enrichment_log_id: enrichmentLog.id,
      valuation_type: 'avm',
      estimated_value: avmData.estimated_value,
      value_confidence: confidence,
      comparable_sales: avmData.comparable_sales,
      market_trends: avmData.market_trends,
      days_on_market_avg: avmData.days_on_market_avg,
      price_per_sqft: avmData.price_per_sqft,
      valuation_date: new Date().toISOString().split('T')[0],
      provider: 'CoreLogic',
    });

    // Update property with appraised value
    await base44.asServiceRole.entities.Property.update(property.id, {
      appraised_value: avmData.estimated_value,
    });

    // Update enrichment log
    await base44.asServiceRole.entities.EnrichmentLog.update(enrichmentLog.id, {
      status: 'completed',
      response_data: avmData,
    });

    return {
      success: true,
      valuation_id: valuation.id,
      estimated_value: avmData.estimated_value,
      confidence: confidence + '%',
    };
  } catch (error) {
    await base44.asServiceRole.entities.EnrichmentLog.update(enrichmentLog.id, {
      status: 'failed',
      error_message: error.message,
    });

    return {
      success: false,
      error: error.message,
    };
  }
}

async function floodRiskCheck(property, org_id, deal_id, user, base44) {
  const enrichmentLog = await base44.asServiceRole.entities.EnrichmentLog.create({
    org_id,
    deal_id,
    entity_type: 'property',
    entity_id: property.id,
    enrichment_type: 'flood_check',
    provider_name: 'First Street Foundation',
    status: 'completed',
    request_data: {
      address: property.address_street,
      zip: property.address_zip,
    },
    initiated_by: user.email,
  });

  // Simulate flood check
  const floodRisk = ['low', 'moderate', 'high'][Math.floor(Math.random() * 3)];
  const floodData = {
    risk_level: floodRisk,
    flood_zone: floodRisk === 'high' ? 'A' : 'X',
    fema_flood_zone: 'X',
    percent_of_county_affected: Math.floor(Math.random() * 15),
  };

  await base44.asServiceRole.entities.EnrichmentLog.update(enrichmentLog.id, {
    status: 'completed',
    response_data: floodData,
  });

  return {
    success: true,
    risk_level: floodRisk,
    flood_zone: floodData.flood_zone,
    requires_insurance: floodRisk !== 'low',
  };
}