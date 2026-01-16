/**
 * Submit Loan Application
 * Validates + creates Deal from application data
 * Optionally routes directly to Required Docs
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const application_id = body.application_id;
    
    // Get org_id from membership if not provided
    let org_id = body.org_id;
    if (!org_id) {
      try {
        const memberships = await base44.asServiceRole.entities.OrgMembership.filter({
          user_id: user.email
        });
        if (memberships.length > 0) {
          org_id = memberships[0].org_id;
        }
      } catch (e) {
        org_id = 'default';
      }
    }

    if (!application_id) {
      return Response.json({ error: 'Missing required field: application_id' }, { status: 400 });
    }

    // Fetch application
    const apps = await base44.asServiceRole.entities.LoanApplication.filter({
      id: application_id
    });

    if (!apps.length) {
      return Response.json({ error: 'Application not found' }, { status: 404 });
    }

    const app = apps[0];

    // Validate all required data present
    const errors = [];
    if (!app.loan_data_json?.loan_product) errors.push('Loan product required');
    if (!app.loan_data_json?.loan_amount) errors.push('Loan amount required');
    if (!app.property_data_json?.address_street) errors.push('Property address required');
    if (!app.borrower_data_json?.first_name) errors.push('Borrower name required');

    if (errors.length > 0) {
      return Response.json({ success: false, validation_errors: errors }, { status: 400 });
    }

    // Create deal from application
    const deal = await base44.asServiceRole.entities.Deal.create({
      org_id,
      loan_product: app.loan_data_json.loan_product,
      loan_purpose: app.loan_data_json.loan_purpose || 'Purchase',
      loan_amount: app.loan_data_json.loan_amount,
      interest_rate: app.loan_data_json.interest_rate,
      loan_term_months: app.loan_data_json.loan_term_months,
      amortization_type: app.loan_data_json.amortization_type || 'fixed',
      status: 'active',
      stage: app.auto_route_to_docs ? 'processing' : 'application'
    });

    // Create primary borrower
    const borrower = await base44.asServiceRole.entities.Borrower.create({
      org_id,
      first_name: app.borrower_data_json.first_name,
      last_name: app.borrower_data_json.last_name,
      email: app.primary_borrower_email,
      phone: app.borrower_data_json.phone
    });

    // Link borrower to deal
    await base44.asServiceRole.entities.DealBorrower.create({
      org_id,
      deal_id: deal.id,
      borrower_id: borrower.id,
      role: 'primary'
    });

    // Create property
    const property = await base44.asServiceRole.entities.Property.create({
      org_id,
      address_street: app.property_data_json.address_street,
      address_city: app.property_data_json.address_city,
      address_state: app.property_data_json.address_state,
      address_zip: app.property_data_json.address_zip,
      property_type: app.property_data_json.property_type,
      occupancy_type: app.property_data_json.occupancy_type || 'investment'
    });

    // Link property to deal
    await base44.asServiceRole.entities.DealProperty.create({
      org_id,
      deal_id: deal.id,
      property_id: property.id,
      role: 'primary'
    });

    // Update application
    await base44.asServiceRole.entities.LoanApplication.update(application_id, {
      deal_id: deal.id,
      status: 'submitted',
      submitted_at: new Date().toISOString()
    });

    // Invite co-borrowers if any
    if (app.co_borrower_emails?.length > 0) {
      for (const email of app.co_borrower_emails) {
        await base44.asServiceRole.entities.PortalMagicLink.create({
          org_id,
          deal_id: deal.id,
          borrower_email: email,
          token_hash: await hashString(crypto.randomUUID()),
          expires_at: new Date(Date.now() + 24 * 3600 * 1000).toISOString()
        });
      }
    }

    return Response.json({
      success: true,
      deal_id: deal.id,
      application_id,
      status: 'submitted',
      redirect: app.auto_route_to_docs ? `/portal/deals/${deal.id}/documents` : `/deals/${deal.id}`
    });
  } catch (error) {
    console.error('Error in submitApplication:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function hashString(str) {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}