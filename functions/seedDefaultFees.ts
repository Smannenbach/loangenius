import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Get org_id from body or query params or user membership
    const body = await req.json().catch(() => ({}));
    const url = new URL(req.url);
    let orgId = body.org_id || url.searchParams.get('org_id');

    if (!orgId) {
      // Try to get from user membership
      const memberships = await base44.asServiceRole.entities.OrgMembership.filter({
        user_id: user.email
      });
      if (memberships.length > 0) {
        orgId = memberships[0].org_id;
      }
    }

    if (!orgId) {
      orgId = 'default';
    }

    const defaultFees = [
      {
        org_id: orgId,
        fee_code: 'origination_fee',
        fee_name: 'Origination Fee',
        fee_type: 'percentage',
        default_percentage: 1.5,
        trid_category: 'A',
        sort_order: 10,
      },
      {
        org_id: orgId,
        fee_code: 'processing_fee',
        fee_name: 'Processing Fee',
        fee_type: 'fixed',
        default_amount: 995,
        trid_category: 'A',
        sort_order: 20,
      },
      {
        org_id: orgId,
        fee_code: 'underwriting_fee',
        fee_name: 'Underwriting Fee',
        fee_type: 'fixed',
        default_amount: 895,
        trid_category: 'A',
        sort_order: 30,
      },
      {
        org_id: orgId,
        fee_code: 'discount_points',
        fee_name: 'Discount Points',
        fee_type: 'percentage',
        default_percentage: 0,
        trid_category: 'A',
        sort_order: 40,
      },
      {
        org_id: orgId,
        fee_code: 'appraisal_fee',
        fee_name: 'Appraisal Fee',
        fee_type: 'fixed',
        default_amount: 650,
        trid_category: 'B',
        sort_order: 50,
      },
      {
        org_id: orgId,
        fee_code: 'credit_report',
        fee_name: 'Credit Report',
        fee_type: 'fixed',
        default_amount: 75,
        trid_category: 'B',
        sort_order: 60,
      },
      {
        org_id: orgId,
        fee_code: 'flood_cert',
        fee_name: 'Flood Certification',
        fee_type: 'fixed',
        default_amount: 20,
        trid_category: 'B',
        sort_order: 70,
      },
      {
        org_id: orgId,
        fee_code: 'tax_service',
        fee_name: 'Tax Service Fee',
        fee_type: 'fixed',
        default_amount: 85,
        trid_category: 'B',
        sort_order: 80,
      },
      {
        org_id: orgId,
        fee_code: 'lenders_title',
        fee_name: "Lender's Title Insurance",
        fee_type: 'percentage',
        default_percentage: 0.5,
        trid_category: 'C',
        sort_order: 90,
      },
      {
        org_id: orgId,
        fee_code: 'owners_title',
        fee_name: "Owner's Title Insurance",
        fee_type: 'percentage',
        default_percentage: 0.5,
        trid_category: 'C',
        sort_order: 100,
      },
      {
        org_id: orgId,
        fee_code: 'settlement_fee',
        fee_name: 'Settlement/Closing Fee',
        fee_type: 'fixed',
        default_amount: 450,
        trid_category: 'C',
        sort_order: 110,
      },
      {
        org_id: orgId,
        fee_code: 'title_search',
        fee_name: 'Title Search',
        fee_type: 'fixed',
        default_amount: 200,
        trid_category: 'C',
        sort_order: 120,
      },
      {
        org_id: orgId,
        fee_code: 'recording_deed',
        fee_name: 'Recording Fee - Deed',
        fee_type: 'fixed',
        default_amount: 50,
        trid_category: 'E',
        sort_order: 140,
      },
      {
        org_id: orgId,
        fee_code: 'recording_mortgage',
        fee_name: 'Recording Fee - Mortgage',
        fee_type: 'fixed',
        default_amount: 150,
        trid_category: 'E',
        sort_order: 150,
      },
      {
        org_id: orgId,
        fee_code: 'prepaid_interest',
        fee_name: 'Prepaid Interest',
        fee_type: 'per_diem',
        trid_category: 'F',
        is_prepaid: true,
        sort_order: 170,
      },
    ];

    const created = await base44.entities.FeeCatalog.bulkCreate(defaultFees);

    return Response.json({
      success: true,
      created: created.length,
      message: `Created ${created.length} default fees`,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});