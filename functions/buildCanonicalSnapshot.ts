import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Build canonical snapshot of deal data for export
 * Freezes all deal, borrower, property, fee, pricing data
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { deal_id, org_id } = await req.json();

    // Fetch all related data
    const deals = await base44.asServiceRole.entities.Deal.filter({
      id: deal_id,
      org_id,
    });

    if (deals.length === 0) {
      return Response.json({ error: 'Deal not found' }, { status: 404 });
    }

    const deal = deals[0];

    // Get all borrowers linked to deal
    const dealBorrowers = await base44.asServiceRole.entities.DealBorrower.filter({
      deal_id,
    });

    const borrowerData = await Promise.all(
      dealBorrowers.map(async (db) => {
        const borrowers = await base44.asServiceRole.entities.Borrower.filter({
          id: db.borrower_id,
        });
        return {
          ...borrowers[0],
          role: db.role,
          ownership_percent: db.ownership_percent,
        };
      })
    );

    // Get all properties linked to deal
    const dealProperties = await base44.asServiceRole.entities.DealProperty.filter({
      deal_id,
    });

    const propertyData = await Promise.all(
      dealProperties.map(async (dp) => {
        const properties = await base44.asServiceRole.entities.Property.filter({
          id: dp.property_id,
        });
        return {
          ...properties[0],
          is_subject_property: dp.is_subject_property,
          lien_position: dp.lien_position,
        };
      })
    );

    // Get fees
    const dealFees = await base44.asServiceRole.entities.DealFee.filter({
      deal_id,
    });

    // Get pricing snapshots
    const pricingSnapshots = await base44.asServiceRole.entities.PricingSnapshot.filter({
      deal_id,
    });

    // Get organization
    const organizations = await base44.asServiceRole.entities.Organization.filter({
      id: org_id,
    });

    // Build canonical snapshot
    const snapshot = {
      snapshot_timestamp: new Date().toISOString(),
      snapshot_version: '1.0',
      
      deal: deal,
      borrowers: borrowerData,
      properties: propertyData,
      deal_fees: dealFees,
      pricing_snapshots: pricingSnapshots,
      organization: organizations[0],
      
      // Add computed values
      computed: {
        total_fees: dealFees.reduce((sum, f) => sum + (f.amount || 0), 0),
        total_loan_amount: deal.loan_amount,
        all_borrowers_count: borrowerData.length,
        all_properties_count: propertyData.length,
      },
    };

    return Response.json({
      success: true,
      snapshot,
    });
  } catch (error) {
    console.error('Error building canonical snapshot:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});