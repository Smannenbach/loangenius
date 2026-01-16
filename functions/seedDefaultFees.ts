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
        name: 'Origination Fee',
        category: 'Origination',
        fee_type: 'Percentage',
        percentage: 1.5,
        percentage_of: 'Loan_Amount',
        hud_line: 'A.1',
        cd_section: 'A',
        auto_add: true,
        sort_order: 10,
      },
      {
        org_id: orgId,
        name: 'Processing Fee',
        category: 'Origination',
        fee_type: 'Fixed',
        fixed_amount: 995,
        hud_line: 'A.2',
        cd_section: 'A',
        auto_add: true,
        sort_order: 20,
      },
      {
        org_id: orgId,
        name: 'Underwriting Fee',
        category: 'Origination',
        fee_type: 'Fixed',
        fixed_amount: 895,
        hud_line: 'A.3',
        cd_section: 'A',
        auto_add: true,
        sort_order: 30,
      },
      {
        org_id: orgId,
        name: 'Discount Points',
        category: 'Origination',
        fee_type: 'Percentage',
        percentage: 0,
        percentage_of: 'Loan_Amount',
        hud_line: 'A.4',
        cd_section: 'A',
        auto_add: false,
        sort_order: 40,
      },
      {
        org_id: orgId,
        name: 'Appraisal Fee',
        category: 'Third_Party',
        fee_type: 'Fixed',
        fixed_amount: 650,
        hud_line: 'B.1',
        cd_section: 'B',
        auto_add: true,
        sort_order: 50,
      },
      {
        org_id: orgId,
        name: 'Credit Report',
        category: 'Third_Party',
        fee_type: 'Fixed',
        fixed_amount: 75,
        hud_line: 'B.2',
        cd_section: 'B',
        auto_add: true,
        sort_order: 60,
      },
      {
        org_id: orgId,
        name: 'Flood Certification',
        category: 'Third_Party',
        fee_type: 'Fixed',
        fixed_amount: 20,
        hud_line: 'B.3',
        cd_section: 'B',
        auto_add: true,
        sort_order: 70,
      },
      {
        org_id: orgId,
        name: 'Tax Service Fee',
        category: 'Third_Party',
        fee_type: 'Fixed',
        fixed_amount: 85,
        hud_line: 'B.4',
        cd_section: 'B',
        auto_add: true,
        sort_order: 80,
      },
      {
        org_id: orgId,
        name: "Title - Lender's Title Insurance",
        category: 'Title',
        fee_type: 'Calculated',
        hud_line: 'C.1',
        cd_section: 'C',
        auto_add: true,
        sort_order: 90,
        description: 'Based on loan amount, calculated per rate schedule',
      },
      {
        org_id: orgId,
        name: "Title - Owner's Title Insurance",
        category: 'Title',
        fee_type: 'Calculated',
        hud_line: 'C.2',
        cd_section: 'C',
        auto_add: true,
        default_paid_by: 'Seller',
        sort_order: 100,
      },
      {
        org_id: orgId,
        name: 'Title - Settlement/Closing Fee',
        category: 'Title',
        fee_type: 'Fixed',
        fixed_amount: 450,
        hud_line: 'C.3',
        cd_section: 'C',
        auto_add: true,
        sort_order: 110,
      },
      {
        org_id: orgId,
        name: 'Title - Title Search',
        category: 'Title',
        fee_type: 'Fixed',
        fixed_amount: 200,
        hud_line: 'C.4',
        cd_section: 'C',
        auto_add: true,
        sort_order: 120,
      },
      {
        org_id: orgId,
        name: 'Title - Recording Service Fee',
        category: 'Title',
        fee_type: 'Fixed',
        fixed_amount: 75,
        hud_line: 'C.5',
        cd_section: 'C',
        auto_add: true,
        sort_order: 130,
      },
      {
        org_id: orgId,
        name: 'Recording Fee - Deed',
        category: 'Government',
        fee_type: 'Fixed',
        fixed_amount: 50,
        hud_line: 'E.1',
        cd_section: 'E',
        auto_add: true,
        sort_order: 140,
      },
      {
        org_id: orgId,
        name: 'Recording Fee - Mortgage',
        category: 'Government',
        fee_type: 'Fixed',
        fixed_amount: 150,
        hud_line: 'E.2',
        cd_section: 'E',
        auto_add: true,
        sort_order: 150,
      },
      {
        org_id: orgId,
        name: 'Transfer Tax',
        category: 'Government',
        fee_type: 'Calculated',
        hud_line: 'E.3',
        cd_section: 'E',
        auto_add: false,
        default_paid_by: 'Seller',
        sort_order: 160,
        description: 'Varies by state/county',
      },
      {
        org_id: orgId,
        name: 'Prepaid Interest',
        category: 'Prepaid',
        fee_type: 'Per_Diem',
        hud_line: 'F.1',
        cd_section: 'F',
        auto_add: true,
        sort_order: 170,
        description: 'Per diem interest from closing to first payment',
      },
      {
        org_id: orgId,
        name: "Homeowner's Insurance Premium (12 months)",
        category: 'Prepaid',
        fee_type: 'Calculated',
        hud_line: 'F.2',
        cd_section: 'F',
        auto_add: true,
        sort_order: 180,
        description: 'First year premium, from insurance quote',
      },
      {
        org_id: orgId,
        name: 'Escrow - Property Taxes (2 months)',
        category: 'Escrow',
        fee_type: 'Calculated',
        hud_line: 'G.1',
        cd_section: 'G',
        auto_add: true,
        sort_order: 190,
      },
      {
        org_id: orgId,
        name: "Escrow - Homeowner's Insurance (2 months)",
        category: 'Escrow',
        fee_type: 'Calculated',
        hud_line: 'G.2',
        cd_section: 'G',
        auto_add: true,
        sort_order: 200,
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