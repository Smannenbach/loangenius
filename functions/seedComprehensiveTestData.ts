import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Seeds comprehensive test data for LoanGenius
 * Creates: Organizations, Deals, Leads, Borrowers, Properties, Documents, Requirements
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized - admin only' }, { status: 403 });
    }

    // Get user's org
    const memberships = await base44.asServiceRole.entities.OrgMembership.filter({
      user_id: user.email,
    });
    
    if (memberships.length === 0) {
      return Response.json({ error: 'User not part of any organization' }, { status: 403 });
    }

    const org_id = memberships[0].org_id;
    const results = { created: {}, errors: [] };

    // 1. Create Borrowers
    const borrowers = [
      {
        org_id,
        first_name: 'John',
        last_name: 'Smith',
        email: 'john.smith@example.com',
        phone: '(555) 123-4567',
        borrower_type: 'individual',
        citizenship_status: 'US_Citizen',
        marital_status: 'Married',
        credit_score_est: 720,
      },
      {
        org_id,
        first_name: 'Sarah',
        last_name: 'Johnson',
        email: 'sarah.johnson@example.com',
        phone: '(555) 234-5678',
        borrower_type: 'individual',
        citizenship_status: 'US_Citizen',
        marital_status: 'Single',
        credit_score_est: 750,
      },
      {
        org_id,
        first_name: 'Michael',
        last_name: 'Chen',
        email: 'michael.chen@example.com',
        phone: '(555) 345-6789',
        borrower_type: 'individual',
        citizenship_status: 'Permanent_Resident',
        marital_status: 'Married',
        credit_score_est: 680,
      },
    ];

    const createdBorrowers = [];
    for (const b of borrowers) {
      try {
        const borrower = await base44.asServiceRole.entities.Borrower.create(b);
        createdBorrowers.push(borrower);
      } catch (error) {
        results.errors.push(`Borrower ${b.first_name}: ${error.message}`);
      }
    }
    results.created.borrowers = createdBorrowers.length;

    // 2. Create Properties
    const properties = [
      {
        org_id,
        address_street: '123 Main Street',
        address_city: 'Phoenix',
        address_state: 'AZ',
        address_zip: '85001',
        county: 'Maricopa',
        property_type: 'SFR',
        occupancy_type: 'investment',
        year_built: 2015,
        sqft: 2400,
        beds: 4,
        baths: 2.5,
        gross_rent_monthly: 3200,
        taxes_monthly: 450,
        insurance_monthly: 180,
      },
      {
        org_id,
        address_street: '456 Oak Avenue',
        address_city: 'Scottsdale',
        address_state: 'AZ',
        address_zip: '85251',
        county: 'Maricopa',
        property_type: 'Condo',
        occupancy_type: 'investment',
        year_built: 2018,
        sqft: 1800,
        beds: 3,
        baths: 2,
        gross_rent_monthly: 2800,
        taxes_monthly: 350,
        insurance_monthly: 150,
        hoa_monthly: 250,
      },
      {
        org_id,
        address_street: '789 Elm Court',
        address_city: 'Tempe',
        address_state: 'AZ',
        address_zip: '85281',
        county: 'Maricopa',
        property_type: '2-Unit',
        occupancy_type: 'investment',
        year_built: 2010,
        sqft: 3200,
        beds: 6,
        baths: 4,
        gross_rent_monthly: 4500,
        taxes_monthly: 550,
        insurance_monthly: 220,
      },
    ];

    const createdProperties = [];
    for (const p of properties) {
      try {
        const property = await base44.asServiceRole.entities.Property.create(p);
        createdProperties.push(property);
      } catch (error) {
        results.errors.push(`Property ${p.address_street}: ${error.message}`);
      }
    }
    results.created.properties = createdProperties.length;

    // 3. Create Deals
    const deals = [
      {
        org_id,
        deal_number: `LG-${new Date().getFullYear()}${(new Date().getMonth() + 1).toString().padStart(2, '0')}-001`,
        loan_product: 'DSCR',
        loan_purpose: 'Purchase',
        stage: 'application',
        status: 'active',
        loan_amount: 480000,
        interest_rate: 7.5,
        loan_term_months: 360,
        amortization_type: 'fixed',
        primary_borrower_id: createdBorrowers[0]?.id,
        assigned_to_user_id: user.email,
        application_date: new Date().toISOString().split('T')[0],
      },
      {
        org_id,
        deal_number: `LG-${new Date().getFullYear()}${(new Date().getMonth() + 1).toString().padStart(2, '0')}-002`,
        loan_product: 'DSCR - No Ratio',
        loan_purpose: 'Refinance',
        stage: 'processing',
        status: 'active',
        loan_amount: 350000,
        interest_rate: 7.25,
        loan_term_months: 360,
        amortization_type: 'fixed',
        primary_borrower_id: createdBorrowers[1]?.id,
        assigned_to_user_id: user.email,
        application_date: new Date().toISOString().split('T')[0],
      },
      {
        org_id,
        deal_number: `LG-${new Date().getFullYear()}${(new Date().getMonth() + 1).toString().padStart(2, '0')}-003`,
        loan_product: 'DSCR',
        loan_purpose: 'Cash-Out Refinance',
        stage: 'underwriting',
        status: 'active',
        loan_amount: 600000,
        interest_rate: 7.75,
        loan_term_months: 360,
        amortization_type: 'io',
        interest_only_period_months: 60,
        primary_borrower_id: createdBorrowers[2]?.id,
        assigned_to_user_id: user.email,
        application_date: new Date().toISOString().split('T')[0],
      },
    ];

    const createdDeals = [];
    for (let i = 0; i < deals.length; i++) {
      try {
        const deal = await base44.asServiceRole.entities.Deal.create(deals[i]);
        createdDeals.push(deal);

        // Link borrower to deal
        if (createdBorrowers[i]) {
          await base44.asServiceRole.entities.DealBorrower.create({
            org_id,
            deal_id: deal.id,
            borrower_id: createdBorrowers[i].id,
            role: 'primary',
            ownership_percent: 100,
          });
        }

        // Link property to deal
        if (createdProperties[i]) {
          await base44.asServiceRole.entities.DealProperty.create({
            org_id,
            deal_id: deal.id,
            property_id: createdProperties[i].id,
          });
        }

        // Create document requirements
        const requirements = [
          {
            org_id,
            deal_id: deal.id,
            document_type: 'bank_statements',
            display_name: 'Bank Statements (Last 2 Months)',
            instructions: 'Please upload your most recent 2 months of bank statements',
            status: i === 0 ? 'pending' : (i === 1 ? 'uploaded' : 'approved'),
            is_required: true,
            is_visible_to_borrower: true,
          },
          {
            org_id,
            deal_id: deal.id,
            document_type: 'tax_returns',
            display_name: 'Tax Returns (Last 2 Years)',
            instructions: 'Please upload your last 2 years of personal tax returns',
            status: i === 0 ? 'pending' : 'uploaded',
            is_required: true,
            is_visible_to_borrower: true,
          },
          {
            org_id,
            deal_id: deal.id,
            document_type: 'lease_agreement',
            display_name: 'Current Lease Agreement',
            instructions: 'Upload the current lease agreement for the property',
            status: 'pending',
            is_required: true,
            is_visible_to_borrower: true,
          },
        ];

        for (const req of requirements) {
          await base44.asServiceRole.entities.DealDocumentRequirement.create(req);
        }

        // Create activity log
        await base44.asServiceRole.entities.ActivityLog.create({
          org_id,
          deal_id: deal.id,
          borrower_id: createdBorrowers[i]?.id,
          activity_type: 'DEAL_CREATED',
          description: `Loan application created for ${deal.deal_number}`,
          source: 'system',
          user_id: user.email,
        });
      } catch (error) {
        results.errors.push(`Deal ${i + 1}: ${error.message}`);
      }
    }
    results.created.deals = createdDeals.length;

    // 4. Create Leads
    const leads = [
      {
        org_id,
        first_name: 'Emma',
        last_name: 'Davis',
        home_email: 'emma.davis@example.com',
        mobile_phone: '(555) 456-7890',
        property_street: '321 Pine Street',
        property_city: 'Mesa',
        property_state: 'AZ',
        property_zip: '85201',
        property_type: 'SFR',
        loan_amount: 425000,
        loan_type: 'DSCR',
        loan_purpose: 'Purchase',
        status: 'new',
        source: 'Website',
        fico_score: 700,
      },
      {
        org_id,
        first_name: 'Robert',
        last_name: 'Wilson',
        home_email: 'robert.wilson@example.com',
        mobile_phone: '(555) 567-8901',
        property_street: '654 Maple Drive',
        property_city: 'Gilbert',
        property_state: 'AZ',
        property_zip: '85296',
        property_type: 'Condo',
        loan_amount: 300000,
        loan_type: 'DSCR',
        loan_purpose: 'Refinance',
        status: 'contacted',
        source: 'Referral',
        fico_score: 730,
      },
      {
        org_id,
        first_name: 'Lisa',
        last_name: 'Martinez',
        home_email: 'lisa.martinez@example.com',
        mobile_phone: '(555) 678-9012',
        property_street: '987 Cedar Lane',
        property_city: 'Chandler',
        property_state: 'AZ',
        property_zip: '85224',
        property_type: '2-Unit',
        loan_amount: 550000,
        loan_type: 'DSCR',
        loan_purpose: 'Cash-Out',
        status: 'qualified',
        source: 'Google Ads',
        fico_score: 710,
      },
    ];

    let createdLeadsCount = 0;
    for (const lead of leads) {
      try {
        await base44.asServiceRole.entities.Lead.create(lead);
        createdLeadsCount++;
      } catch (error) {
        results.errors.push(`Lead ${lead.first_name}: ${error.message}`);
      }
    }
    results.created.leads = createdLeadsCount;

    // 5. Create Portal Sessions
    if (createdDeals.length > 0 && createdBorrowers.length > 0) {
      try {
        // Helper to hash token
        const hashToken = async (token) => {
          const encoder = new TextEncoder();
          const data = encoder.encode(token);
          const hashBuffer = await crypto.subtle.digest('SHA-256', data);
          const hashArray = Array.from(new Uint8Array(hashBuffer));
          return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        };

        const testToken = 'test-portal-token-123';
        const hashedToken = await hashToken(testToken);
        const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

        await base44.asServiceRole.entities.PortalSession.create({
          org_id,
          deal_id: createdDeals[0].id,
          borrower_id: createdBorrowers[0].id,
          session_token_hash: hashedToken,
          expires_at: expiresAt,
        });

        results.created.portal_sessions = 1;
        results.test_portal_url = `/BorrowerPortalLogin?token=${testToken}`;
      } catch (error) {
        results.errors.push(`Portal Session: ${error.message}`);
      }
    }

    return Response.json({
      success: true,
      message: 'Test data created successfully',
      ...results,
      summary: {
        borrowers: results.created.borrowers || 0,
        properties: results.created.properties || 0,
        deals: results.created.deals || 0,
        leads: results.created.leads || 0,
        portal_sessions: results.created.portal_sessions || 0,
      }
    });
  } catch (error) {
    console.error('Seed error:', error);
    return Response.json({ 
      success: false,
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});