import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Comprehensive deal compliance check
 * Validates: MISMO fields, documents, borrower info, property info, consent
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { deal_id } = await req.json();

    if (!deal_id) {
      return Response.json({ error: 'Deal ID required' }, { status: 400 });
    }

    // Get deal
    const deal = await base44.asServiceRole.entities.Deal.get(deal_id);
    if (!deal) {
      return Response.json({ error: 'Deal not found' }, { status: 404 });
    }

    const errors = [];
    const warnings = [];
    const checks = {};

    // 1. Loan Data Completeness
    checks.loan_data = {
      passed: true,
      items: [],
    };

    if (!deal.loan_amount) {
      errors.push({ category: 'Loan Data', field: 'loan_amount', message: 'Loan amount required' });
      checks.loan_data.passed = false;
    }
    if (!deal.interest_rate) {
      errors.push({ category: 'Loan Data', field: 'interest_rate', message: 'Interest rate required' });
      checks.loan_data.passed = false;
    }
    if (!deal.loan_term_months) {
      errors.push({ category: 'Loan Data', field: 'loan_term_months', message: 'Loan term required' });
      checks.loan_data.passed = false;
    }
    if (!deal.loan_product) {
      errors.push({ category: 'Loan Data', field: 'loan_product', message: 'Loan product required' });
      checks.loan_data.passed = false;
    }

    checks.loan_data.items = [
      { name: 'Loan Amount', complete: !!deal.loan_amount },
      { name: 'Interest Rate', complete: !!deal.interest_rate },
      { name: 'Loan Term', complete: !!deal.loan_term_months },
      { name: 'Loan Product', complete: !!deal.loan_product },
    ];

    // 2. Borrower Information
    checks.borrower_info = {
      passed: true,
      items: [],
    };

    const dealBorrowers = await base44.asServiceRole.entities.DealBorrower.filter({
      deal_id,
      role: 'primary',
    });

    if (dealBorrowers.length === 0) {
      errors.push({ category: 'Borrower', field: 'borrower', message: 'Primary borrower required' });
      checks.borrower_info.passed = false;
    } else {
      const borrower = await base44.asServiceRole.entities.Borrower.get(dealBorrowers[0].borrower_id);

      const borrowerChecks = [
        { name: 'First Name', complete: !!borrower?.first_name },
        { name: 'Last Name', complete: !!borrower?.last_name },
        { name: 'Email', complete: !!borrower?.email },
        { name: 'Phone', complete: !!borrower?.phone },
      ];

      if (!borrower?.first_name) {
        errors.push({ category: 'Borrower', field: 'first_name', message: 'Borrower first name required' });
        checks.borrower_info.passed = false;
      }
      if (!borrower?.last_name) {
        errors.push({ category: 'Borrower', field: 'last_name', message: 'Borrower last name required' });
        checks.borrower_info.passed = false;
      }
      if (!borrower?.email) {
        errors.push({ category: 'Borrower', field: 'email', message: 'Borrower email required' });
        checks.borrower_info.passed = false;
      }

      checks.borrower_info.items = borrowerChecks;
    }

    // 3. Property Information
    checks.property_info = {
      passed: true,
      items: [],
    };

    const dealProperties = await base44.asServiceRole.entities.DealProperty.filter({
      deal_id,
    });

    if (dealProperties.length === 0) {
      errors.push({ category: 'Property', field: 'property', message: 'At least one property required' });
      checks.property_info.passed = false;
    } else {
      const property = await base44.asServiceRole.entities.Property.get(dealProperties[0].property_id);

      const propertyChecks = [
        { name: 'Street Address', complete: !!property?.address_street },
        { name: 'City', complete: !!property?.address_city },
        { name: 'State', complete: !!property?.address_state },
        { name: 'ZIP', complete: !!property?.address_zip },
        { name: 'Property Type', complete: !!property?.property_type },
      ];

      if (!property?.address_street) {
        errors.push({ category: 'Property', field: 'address_street', message: 'Property street address required' });
        checks.property_info.passed = false;
      }
      if (!property?.address_city) {
        errors.push({ category: 'Property', field: 'address_city', message: 'Property city required' });
        checks.property_info.passed = false;
      }
      if (!property?.address_state) {
        errors.push({ category: 'Property', field: 'address_state', message: 'Property state required' });
        checks.property_info.passed = false;
      }
      if (!property?.address_zip) {
        errors.push({ category: 'Property', field: 'address_zip', message: 'Property ZIP required' });
        checks.property_info.passed = false;
      }

      checks.property_info.items = propertyChecks;
    }

    // 4. Document Requirements
    checks.documents = {
      passed: false,
      items: [],
    };

    const requirements = await base44.asServiceRole.entities.DealDocumentRequirement.filter({
      deal_id,
    });

    const requiredDocs = requirements.filter(r => r.is_required);
    const uploadedDocs = requirements.filter(r => ['uploaded', 'approved'].includes(r.status));

    checks.documents.items = [
      { name: 'Total Required', complete: null, value: requiredDocs.length },
      { name: 'Uploaded/Approved', complete: null, value: uploadedDocs.length },
      { name: 'Completion %', complete: null, value: requiredDocs.length > 0 ? Math.round((uploadedDocs.length / requiredDocs.length) * 100) : 0 },
    ];

    if (uploadedDocs.length === requiredDocs.length && requiredDocs.length > 0) {
      checks.documents.passed = true;
    } else if (requiredDocs.length > 0) {
      warnings.push({
        category: 'Documents',
        field: 'documents',
        message: `${requiredDocs.length - uploadedDocs.length} required document(s) pending`,
      });
    }

    // 5. Consent & Compliance
    checks.consent = {
      passed: true,
      items: [],
    };

    if (dealBorrowers.length > 0 && borrower?.email) {
      const consentRecords = await base44.asServiceRole.entities.ConsentRecord.filter({
        contact_email: borrower.email,
      });

      const hasEmailConsent = consentRecords.some(c => c.consent_type === 'email' && c.status === 'opt_in');

      checks.consent.items = [
        { name: 'Email Consent', complete: hasEmailConsent },
      ];

      if (!hasEmailConsent) {
        warnings.push({
          category: 'Consent',
          field: 'email_consent',
          message: 'Email consent not recorded',
        });
      }
    }

    // Overall status
    const isCompliant = errors.length === 0;
    const compliancePercent = Math.round(
      ((Object.values(checks).filter(c => c.passed).length) / Object.values(checks).length) * 100
    );

    // Log audit check
    await base44.asServiceRole.entities.AuditLog.create({
      org_id: deal.org_id,
      user_id: user.email,
      action_type: 'Read',
      entity_type: 'Deal',
      entity_id: deal_id,
      description: `Compliance check: ${isCompliant ? 'PASSED' : 'FAILED'} (${compliancePercent}%)`,
      severity: isCompliant ? 'Info' : 'Warning',
    });

    return Response.json({
      success: true,
      deal_id,
      is_compliant: isCompliant,
      compliance_percent: compliancePercent,
      errors,
      warnings,
      checks,
    });
  } catch (error) {
    console.error('Compliance validation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});