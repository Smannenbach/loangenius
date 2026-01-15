import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Seed default admin settings, fees, document types, etc. on org creation
 * Call this from org creation endpoint
 */
export async function seedAdminSettingsForOrg(base44, orgId) {
  try {
    // Seed Fee Catalog
    const defaultFees = [
      { fee_code: 'origination_fee', fee_name: 'Origination Fee', fee_type: 'percentage', default_percentage: 1.5, trid_category: 'A', sort_order: 1 },
      { fee_code: 'processing_fee', fee_name: 'Processing Fee', fee_type: 'fixed', default_amount: 995, trid_category: 'A', sort_order: 2 },
      { fee_code: 'underwriting_fee', fee_name: 'Underwriting Fee', fee_type: 'fixed', default_amount: 1295, trid_category: 'A', sort_order: 3 },
      { fee_code: 'admin_fee', fee_name: 'Administrative Fee', fee_type: 'fixed', default_amount: 500, trid_category: 'A', sort_order: 4 },
      { fee_code: 'doc_prep_fee', fee_name: 'Document Preparation Fee', fee_type: 'fixed', default_amount: 350, trid_category: 'A', sort_order: 5 },
      { fee_code: 'appraisal_fee', fee_name: 'Appraisal Fee', fee_type: 'fixed', default_amount: 650, trid_category: 'B', sort_order: 10 },
      { fee_code: 'credit_report_fee', fee_name: 'Credit Report Fee', fee_type: 'fixed', default_amount: 75, trid_category: 'B', sort_order: 11 },
      { fee_code: 'title_search_fee', fee_name: 'Title Search Fee', fee_type: 'fixed', default_amount: 250, trid_category: 'C', sort_order: 20 },
      { fee_code: 'title_insurance', fee_name: 'Title Insurance', fee_type: 'percentage', default_percentage: 0.5, trid_category: 'C', sort_order: 21 },
      { fee_code: 'recording_fee', fee_name: 'Recording Fees', fee_type: 'fixed', default_amount: 150, trid_category: 'E', sort_order: 30 }
    ];

    for (const fee of defaultFees) {
      await base44.asServiceRole.entities.FeeCatalog.create({
        org_id: orgId,
        ...fee,
        can_modify: true,
        is_active: true
      });
    }

    // Seed Document Types
    const defaultDocTypes = [
      { type_code: 'photo_id', type_name: 'Government-Issued Photo ID', category: 'borrower_id', required_for: ['all'], expiration_days: 365 },
      { type_code: 'ssn_card', type_name: 'Social Security Card', category: 'borrower_id', required_for: ['all'] },
      { type_code: 'bank_statements', type_name: 'Bank Statements (2-3 months)', category: 'asset', required_for: ['all'], expiration_days: 90 },
      { type_code: 'lease_agreement', type_name: 'Current Lease Agreement', category: 'property', required_for: ['all'] },
      { type_code: 'appraisal_report', type_name: 'Appraisal Report', category: 'appraisal', required_for: ['all'], expiration_days: 180 },
      { type_code: 'credit_report', type_name: 'Credit Report', category: 'credit', required_for: ['all'], expiration_days: 120 },
      { type_code: 'hazard_insurance', type_name: 'Hazard Insurance Quote/Binder', category: 'insurance', required_for: ['all'], expiration_days: 30 }
    ];

    for (const docType of defaultDocTypes) {
      await base44.asServiceRole.entities.DocumentType.create({
        org_id: orgId,
        ...docType,
        is_standard: true,
        is_active: true
      });
    }

    // Seed Loan Products
    const defaultProducts = [
      { product_code: 'dscr_purchase_std', product_name: 'DSCR Purchase - Standard', product_type: 'dscr_purchase', min_loan_amount: 75000, max_loan_amount: 3000000, min_ltv: 50, max_ltv: 80, min_dscr: 1.0, min_fico: 640 },
      { product_code: 'dscr_refi_rate_term', product_name: 'DSCR Rate/Term Refinance', product_type: 'dscr_rate_term', min_loan_amount: 75000, max_loan_amount: 3000000, min_ltv: 50, max_ltv: 80, min_dscr: 1.0, min_fico: 640 },
      { product_code: 'dscr_blanket', product_name: 'DSCR Blanket/Portfolio', product_type: 'dscr_blanket', min_loan_amount: 250000, max_loan_amount: 5000000, min_ltv: 50, max_ltv: 75, min_dscr: 1.0, min_fico: 660 }
    ];

    for (const product of defaultProducts) {
      await base44.asServiceRole.entities.LoanProductConfig.create({
        org_id: orgId,
        ...product,
        is_active: true
      });
    }

    console.log(`Seeded admin settings for org ${orgId}`);
  } catch (error) {
    console.error('Error seeding admin settings:', error);
    throw error;
  }
}