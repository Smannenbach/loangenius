import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Create or update a deal with full org isolation
 */
Deno.serve(async (req) => {
  try {
    if (req.method === 'GET') {
      return Response.json({ error: 'POST only' }, { status: 405 });
    }

    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, dealData } = await req.json();

    if (!action || !dealData) {
      return Response.json({ error: 'Missing action or dealData' }, { status: 400 });
    }

    if (action === 'create') {
      const {
        loan_product,
        loan_purpose,
        is_blanket,
        loan_amount,
        interest_rate,
        loan_term_months,
        amortization_type,
        properties,
        borrowers,
      } = dealData;

      if (!loan_product || !loan_purpose) {
        return Response.json({ error: 'Missing loan_product or loan_purpose' }, { status: 400 });
      }

      // Get user's org from OrgMembership
      const memberships = await base44.asServiceRole.entities.OrgMembership.filter({
        user_id: user.email,
      });

      if (memberships.length === 0) {
        return Response.json({ error: 'User not part of any organization' }, { status: 403 });
      }

      const org_id = memberships[0].org_id;

      // Generate deal number: LG-YYYYMM-XXXX
      const now = new Date();
      const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
      const counter = Math.floor(Math.random() * 10000)
        .toString()
        .padStart(4, '0');
      const deal_number = `LG-${yearMonth}-${counter}`;

      // Create deal
      const deal = await base44.asServiceRole.entities.Deal.create({
        org_id,
        deal_number,
        loan_product,
        loan_purpose,
        is_blanket: is_blanket || false,
        stage: 'inquiry',
        status: 'active',
        application_date: new Date().toISOString().split('T')[0],
        assigned_to_user_id: user.email,
        loan_amount: loan_amount || 0,
        interest_rate: interest_rate || 0,
        loan_term_months: loan_term_months || 360,
        amortization_type: amortization_type || 'fixed',
      });

      // Create properties if provided
      if (properties && properties.length > 0) {
        for (const prop of properties) {
          await base44.asServiceRole.entities.Property.create({
            org_id,
            address_street: prop.street,
            address_unit: prop.unit,
            address_city: prop.city,
            address_state: prop.state,
            address_zip: prop.zip,
            property_type: prop.propertyType || 'SFR',
            occupancy_type: prop.occupancyType || 'investment',
            year_built: prop.yearBuilt,
            sqft: prop.squareFeet,
            gross_rent_monthly: prop.monthlyRent,
          });
        }
      }

      // Create borrowers if provided
      if (borrowers && borrowers.length > 0) {
        for (const borrower of borrowers) {
          const borrowerRecord = await base44.asServiceRole.entities.Borrower.create({
            org_id,
            first_name: borrower.firstName,
            last_name: borrower.lastName,
            email: borrower.email,
            phone: borrower.phone,
            borrower_type: 'individual',
          });

          // Link to deal
          await base44.asServiceRole.entities.DealBorrower.create({
            org_id,
            deal_id: deal.id,
            borrower_id: borrowerRecord.id,
            role: borrower.role || 'primary',
            ownership_percent: borrower.ownershipPercent || 100,
          });
        }
      }

      // Log audit event
      await base44.asServiceRole.entities.AuditLog.create({
        org_id,
        user_id: user.email,
        action_type: 'Create',
        entity_type: 'Deal',
        entity_id: deal.id,
        entity_name: deal.deal_number,
        description: `Deal created: ${deal.deal_number} (${loan_product})`,
      });

      return Response.json({
        success: true,
        deal: {
          id: deal.id,
          deal_number: deal.deal_number,
          org_id,
        },
      });
    }

    if (action === 'update') {
      const { deal_id, updates } = dealData;

      if (!deal_id) {
        return Response.json({ error: 'Missing deal_id' }, { status: 400 });
      }

      // Verify deal exists and belongs to user's org
      const deal = await base44.asServiceRole.entities.Deal.get(deal_id);
      if (!deal) {
        return Response.json({ error: 'Deal not found' }, { status: 404 });
      }

      // Check org access
      const memberships = await base44.asServiceRole.entities.OrgMembership.filter({
        user_id: user.email,
        org_id: deal.org_id,
      });

      if (memberships.length === 0) {
        return Response.json({ error: 'Unauthorized: not in deal org' }, { status: 403 });
      }

      // Update deal
      const updated = await base44.asServiceRole.entities.Deal.update(deal_id, updates);

      // Log audit
      await base44.asServiceRole.entities.AuditLog.create({
        org_id: deal.org_id,
        user_id: user.email,
        action_type: 'Update',
        entity_type: 'Deal',
        entity_id: deal_id,
        entity_name: deal.deal_number,
        description: `Deal updated: ${Object.keys(updates).join(', ')}`,
        new_values: updates,
      });

      return Response.json({
        success: true,
        deal: updated,
      });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Create/update deal error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});