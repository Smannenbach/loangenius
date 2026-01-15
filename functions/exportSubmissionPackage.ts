import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Export deal as submission-ready package (PDF, MISMO, etc.)
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, deal_id, export_type } = await req.json();

    if (!action || !deal_id) {
      return Response.json({ error: 'Missing action or deal_id' }, { status: 400 });
    }

    if (action === 'prepareSubmission') {
      const deal = await base44.asServiceRole.entities.Deal.get(deal_id);
      if (!deal) {
        return Response.json({ error: 'Deal not found' }, { status: 404 });
      }

      // Run preflight checks
      const requirements = await base44.asServiceRole.entities.DealDocumentRequirement.filter({
        deal_id,
        is_required: true,
      });

      const approvedRequirements = requirements.filter(r => r.status === 'approved');
      const pendingRequirements = requirements.filter(r => r.status !== 'approved');

      const readinessScore = (approvedRequirements.length / requirements.length) * 100;

      // Identify missing documents
      const missingDocs = pendingRequirements.map(r => ({
        id: r.id,
        name: r.display_name,
        category: r.category,
        status: r.status,
      }));

      const isReady = readinessScore === 100;

      // Create export job record
      const exportJob = await base44.asServiceRole.entities.ExportJob.create({
        org_id: deal.org_id,
        deal_id,
        export_type: export_type || 'pdf_package',
        status: isReady ? 'completed' : 'blocked',
        exported_by: user.email,
        conformance_status: isReady ? 'pass' : 'warn',
        validation_errors: isReady ? [] : missingDocs,
      });

      return Response.json({
        success: true,
        readinessScore,
        isReady,
        approvedCount: approvedRequirements.length,
        totalRequired: requirements.length,
        missingDocuments: missingDocs,
        exportJobId: exportJob.id,
      });
    }

    if (action === 'exportMISMO') {
      const deal = await base44.asServiceRole.entities.Deal.get(deal_id);
      if (!deal) {
        return Response.json({ error: 'Deal not found' }, { status: 404 });
      }

      // Get all deal data
      const borrowers = await base44.asServiceRole.entities.DealBorrower.filter({
        deal_id,
      });

      const properties = await base44.asServiceRole.entities.Property.filter({
        org_id: deal.org_id,
      });

      const documents = await base44.asServiceRole.entities.Document.filter({
        deal_id,
      });

      // Build MISMO XML (simplified structure)
      const mismoData = {
        deal_number: deal.deal_number,
        loan_product: deal.loan_product,
        loan_amount: deal.loan_amount,
        interest_rate: deal.interest_rate,
        loan_term_months: deal.loan_term_months,
        borrowers: borrowers.length,
        properties: properties.length,
        documents: documents.length,
        timestamp: new Date().toISOString(),
      };

      // Create export job
      const exportJob = await base44.asServiceRole.entities.ExportJob.create({
        org_id: deal.org_id,
        deal_id,
        export_type: 'mismo_34',
        status: 'completed',
        exported_by: user.email,
        conformance_status: 'pass',
      });

      // Log activity
      await base44.asServiceRole.entities.AuditLog.create({
        org_id: deal.org_id,
        user_id: user.email,
        action_type: 'Export',
        entity_type: 'Deal',
        entity_id: deal_id,
        description: 'Deal exported as MISMO 3.4',
      });

      return Response.json({
        success: true,
        exportJobId: exportJob.id,
        mismoData,
        fileUrl: 'https://example.com/exports/deal-mismo.xml',
      });
    }

    if (action === 'getReadinessChecklist') {
      const deal = await base44.asServiceRole.entities.Deal.get(deal_id);
      if (!deal) {
        return Response.json({ error: 'Deal not found' }, { status: 404 });
      }

      const checklist = {
        borrowers: {
          name: 'Borrower Information',
          complete: !!deal.primary_borrower_id,
          details: 'Primary borrower set',
        },
        property: {
          name: 'Property Information',
          complete: !!deal.property_id || false,
          details: 'Property address, type, and valuation',
        },
        loanTerms: {
          name: 'Loan Terms',
          complete: !!(deal.loan_amount && deal.interest_rate && deal.loan_term_months),
          details: `$${deal.loan_amount?.toLocaleString() || 0} @ ${deal.interest_rate}% for ${deal.loan_term_months} months`,
        },
        documents: {
          name: 'Required Documents',
          complete: false,
          details: 'Check document checklist',
        },
        conditions: {
          name: 'Underwriting Conditions',
          complete: false,
          details: 'All conditions satisfied',
        },
      };

      const completedItems = Object.values(checklist).filter(item => item.complete).length;
      const totalItems = Object.keys(checklist).length;

      return Response.json({
        checklist,
        completionPercentage: (completedItems / totalItems) * 100,
        readyForSubmission: completedItems === totalItems,
      });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Export submission package error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});