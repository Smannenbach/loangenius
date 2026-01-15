import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const DSCR_TEMPLATES = [
  // Compliance
  {
    name: "Business Purpose Letter / Anti-Steering Disclosure",
    description: "Signed acknowledgment that this is a business purpose loan",
    category: "Compliance",
    document_type: "Anti_Steering_Letter",
    is_required: true,
    applies_to_loan_types: ["DSCR"],
    help_text: "Signed acknowledgment that this is a business purpose loan",
    sort_order: 10,
  },
  // Identity
  {
    name: "Government-Issued Photo ID",
    description: "Valid driver's license, passport, or state ID",
    category: "Identity",
    document_type: "Photo_ID",
    is_required: true,
    per_borrower: true,
    help_text: "Valid driver's license, passport, or state ID (front and back)",
    sort_order: 20,
  },
  // Credit
  {
    name: "Credit Report Authorization",
    category: "Credit",
    document_type: "Credit_Auth",
    is_required: true,
    per_borrower: true,
    sort_order: 30,
  },
  // Entity Docs
  {
    name: "Articles of Organization / Formation",
    description: "Filed articles from Secretary of State",
    category: "Entity",
    document_type: "Formation_Docs",
    is_required: true,
    applies_to_party_type: "Entity",
    help_text: "Filed articles from Secretary of State",
    sort_order: 40,
  },
  {
    name: "Operating Agreement / Bylaws",
    category: "Entity",
    document_type: "Operating_Agreement",
    is_required: true,
    applies_to_party_type: "Entity",
    sort_order: 50,
  },
  {
    name: "Certificate of Good Standing",
    category: "Entity",
    document_type: "Good_Standing",
    is_required: true,
    applies_to_party_type: "Entity",
    max_age_days: 90,
    help_text: "Must be dated within 90 days",
    sort_order: 60,
  },
  {
    name: "EIN Letter (IRS SS-4)",
    category: "Entity",
    document_type: "EIN_Letter",
    is_required: true,
    applies_to_party_type: "Entity",
    sort_order: 70,
  },
  // Property Docs
  {
    name: "Executed Lease Agreement(s)",
    description: "Current signed lease for each unit",
    category: "Property",
    document_type: "Lease_Agreement",
    is_required: true,
    per_property: true,
    applies_to_loan_types: ["DSCR"],
    help_text: "Current signed lease for each unit",
    sort_order: 80,
  },
  {
    name: "Property Insurance Declaration Page",
    description: "Shows coverage amount and mortgagee clause",
    category: "Property",
    document_type: "Insurance_Dec",
    is_required: true,
    per_property: true,
    help_text: "Shows coverage amount, effective dates, and mortgagee clause",
    sort_order: 90,
  },
  {
    name: "Flood Insurance (if applicable)",
    category: "Property",
    document_type: "Flood_Insurance",
    is_required: false,
    per_property: true,
    sort_order: 100,
  },
  {
    name: "HOA Contact / Questionnaire (if applicable)",
    category: "Property",
    document_type: "HOA_Info",
    is_required: false,
    per_property: true,
    sort_order: 110,
  },
  {
    name: "Current Mortgage Statement(s)",
    description: "Most recent statement showing balance and payment",
    category: "Property",
    document_type: "Mortgage_Statement",
    is_required: true,
    per_property: true,
    applies_to_loan_purposes: ["Rate_Term_Refinance", "Cash_Out_Refinance"],
    months_valid: 1,
    help_text: "Most recent statement showing balance and payment",
    sort_order: 120,
  },
  {
    name: "Property Tax Bill",
    category: "Property",
    document_type: "Tax_Bill",
    is_required: false,
    per_property: true,
    sort_order: 130,
  },
  // Asset Docs
  {
    name: "Bank Statements (2 months)",
    description: "Most recent 2 months, all pages",
    category: "Asset",
    document_type: "Bank_Statement",
    is_required: true,
    months_valid: 2,
    help_text: "Most recent 2 months, all pages",
    sort_order: 140,
  },
  {
    name: "Proof of Down Payment / Reserves",
    category: "Asset",
    document_type: "Reserves_Proof",
    is_required: true,
    applies_to_loan_purposes: ["Purchase"],
    sort_order: 150,
  },
  // Title/Appraisal/Closing
  {
    name: "Preliminary Title Report",
    category: "Title",
    document_type: "Prelim_Title",
    is_required: true,
    per_property: true,
    sort_order: 160,
  },
  {
    name: "Appraisal Report",
    category: "Appraisal",
    document_type: "Appraisal",
    is_required: true,
    per_property: true,
    sort_order: 170,
  },
  {
    name: "Purchase Contract",
    category: "Closing",
    document_type: "Purchase_Contract",
    is_required: true,
    applies_to_loan_purposes: ["Purchase"],
    per_property: true,
    sort_order: 180,
  },
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== "admin") {
      return Response.json({ error: "Admin access required" }, { status: 403 });
    }

    // Get org_id (for now use 'default-org')
    const org_id = "default-org";

    // Create templates
    const created = await base44.entities.DocumentTemplate.bulkCreate(
      DSCR_TEMPLATES.map((t) => ({ ...t, org_id }))
    );

    return Response.json({
      success: true,
      message: `Created ${created.length} document templates`,
      count: created.length,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});