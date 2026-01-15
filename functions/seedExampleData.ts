import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Seed database with example deals and leads for demo purposes
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Check if user is authenticated
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const orgId = 'default';

    // Seed example leads
    const leads = await base44.entities.Lead.bulkCreate([
      {
        org_id: orgId,
        first_name: 'John',
        last_name: 'Anderson',
        home_email: 'john.anderson@email.com',
        mobile_phone: '(555) 123-4567',
        property_street: '123 Oak Street',
        property_city: 'Phoenix',
        property_state: 'AZ',
        property_zip: '85001',
        property_county: 'Maricopa',
        property_type: 'SFR',
        occupancy: 'Primary Residence',
        estimated_value: 450000,
        fico_score: 740,
        current_rate: 4.5,
        current_balance: 280000,
        loan_amount: 360000,
        loan_type: 'Conventional',
        loan_purpose: 'Refinance',
        status: 'new',
        source: 'Google Sheets Import'
      },
      {
        org_id: orgId,
        first_name: 'Sarah',
        last_name: 'Mitchell',
        home_email: 'sarah.mitchell@email.com',
        mobile_phone: '(555) 234-5678',
        property_street: '456 Maple Avenue',
        property_city: 'Scottsdale',
        property_state: 'AZ',
        property_zip: '85251',
        property_county: 'Maricopa',
        property_type: 'Multi-Family',
        occupancy: 'Investment Property',
        estimated_value: 850000,
        monthly_rental_income: 6500,
        fico_score: 780,
        loan_amount: 680000,
        loan_type: 'DSCR',
        loan_purpose: 'Purchase',
        status: 'contacted',
        source: 'Google Sheets Import'
      },
      {
        org_id: orgId,
        first_name: 'Michael',
        last_name: 'Chen',
        home_email: 'michael.chen@email.com',
        mobile_phone: '(555) 345-6789',
        property_street: '789 Pine Road',
        property_city: 'Mesa',
        property_state: 'AZ',
        property_zip: '85202',
        property_county: 'Maricopa',
        property_type: 'Condo',
        occupancy: 'Primary Residence',
        estimated_value: 320000,
        fico_score: 720,
        loan_amount: 250000,
        loan_type: 'FHA',
        loan_purpose: 'Purchase',
        status: 'new',
        source: 'Manual Entry'
      }
    ]);

    // Seed example deals
    const deals = await base44.entities.Deal.bulkCreate([
      {
        org_id: orgId,
        deal_number: 'LG-202501-0001',
        loan_product: 'DSCR',
        loan_purpose: 'Purchase',
        is_blanket: false,
        stage: 'processing',
        status: 'active',
        application_date: new Date().toISOString().split('T')[0],
        loan_amount: 680000,
        interest_rate: 6.25,
        loan_term_months: 360,
        amortization_type: 'fixed',
        ltv: 80,
        dscr: 1.25,
        monthly_pitia: 4200
      },
      {
        org_id: orgId,
        deal_number: 'LG-202501-0002',
        loan_product: 'Conventional',
        loan_purpose: 'Refinance',
        is_blanket: false,
        stage: 'underwriting',
        status: 'active',
        application_date: new Date().toISOString().split('T')[0],
        loan_amount: 360000,
        interest_rate: 5.75,
        loan_term_months: 360,
        amortization_type: 'fixed',
        ltv: 75,
        dscr: 1.8,
        monthly_pitia: 2100
      },
      {
        org_id: orgId,
        deal_number: 'LG-202501-0003',
        loan_product: 'Hard Money',
        loan_purpose: 'Purchase',
        is_blanket: false,
        stage: 'inquiry',
        status: 'draft',
        application_date: new Date().toISOString().split('T')[0],
        loan_amount: 450000,
        interest_rate: 7.5,
        loan_term_months: 24,
        amortization_type: 'io',
        interest_only_period_months: 24,
        ltv: 65,
        dscr: 1.5
      }
    ]);

    return Response.json({
      success: true,
      message: 'Example data seeded successfully',
      leads_created: leads?.length || 0,
      deals_created: deals?.length || 0,
    });
  } catch (error) {
    console.error('Error seeding data:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});