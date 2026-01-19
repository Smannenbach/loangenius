import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const DSCR_DOCUMENT_REQUIREMENTS = [
  {
    requirement_name: 'Photo ID',
    requirement_type: 'photo_id',
    category: 'identity',
    is_required: true,
    instructions: 'Upload a clear photo of your driver\'s license or government-issued ID (both front and back)'
  },
  {
    requirement_name: 'Bank Statements - 2 Most Recent Months',
    requirement_type: 'bank_statements',
    category: 'financials',
    is_required: true,
    instructions: 'Upload all pages of your 2 most recent bank statements showing reserves (6-12 months of PITIA recommended)'
  },
  {
    requirement_name: 'Mortgage Statement',
    requirement_type: 'mortgage_statement',
    category: 'financials',
    is_required: false,
    is_conditional: true,
    condition_description: 'Required if refinance',
    instructions: 'Upload your most recent mortgage statement showing current balance and payment'
  },
  {
    requirement_name: 'LLC Articles of Organization',
    requirement_type: 'llc_articles',
    category: 'entity',
    is_required: false,
    is_conditional: true,
    condition_description: 'Required if vesting in entity',
    instructions: 'Upload the filed Articles of Organization for your LLC'
  },
  {
    requirement_name: 'LLC EIN Letter',
    requirement_type: 'llc_ein',
    category: 'entity',
    is_required: false,
    is_conditional: true,
    condition_description: 'Required if vesting in entity',
    instructions: 'Upload IRS EIN confirmation letter (CP 575 or SS-4)'
  },
  {
    requirement_name: 'LLC Operating Agreement',
    requirement_type: 'llc_operating_agreement',
    category: 'entity',
    is_required: false,
    is_conditional: true,
    condition_description: 'Required if vesting in entity',
    instructions: 'Upload signed Operating Agreement showing all members and ownership percentages'
  },
  {
    requirement_name: 'Certificate of Good Standing',
    requirement_type: 'llc_good_standing',
    category: 'entity',
    is_required: false,
    is_conditional: true,
    condition_description: 'Required if vesting in entity',
    instructions: 'Upload current Certificate of Good Standing from your state (dated within last 6 months)'
  },
  {
    requirement_name: 'Lease Agreement(s)',
    requirement_type: 'lease_agreement',
    category: 'property',
    is_required: true,
    instructions: 'Upload executed lease agreement(s) showing proof of rental income for DSCR ratio calculation'
  },
  {
    requirement_name: 'Homeowners Insurance',
    requirement_type: 'homeowners_insurance',
    category: 'property',
    is_required: true,
    instructions: 'Upload current homeowners insurance declarations page showing property address and coverage amount'
  },
  {
    requirement_name: 'Property Tax Bill',
    requirement_type: 'property_tax_bill',
    category: 'property',
    is_required: true,
    instructions: 'Upload most recent property tax bill or statement'
  },
  {
    requirement_name: 'Payoff Demand Statement',
    requirement_type: 'payoff_demand',
    category: 'financials',
    is_required: false,
    is_conditional: true,
    condition_description: 'Required if refinance',
    instructions: 'Request and upload payoff demand statement from your current lender'
  },
  {
    requirement_name: 'Purchase Contract',
    requirement_type: 'purchase_contract',
    category: 'property',
    is_required: false,
    is_conditional: true,
    condition_description: 'Required if purchase',
    instructions: 'Upload fully executed purchase agreement with all addendums'
  },
  {
    requirement_name: 'Borrower Certification & Authorization',
    requirement_type: 'borrower_certification',
    category: 'authorization',
    is_required: true,
    instructions: 'Sign and upload the borrower certification form (will be provided)'
  },
  {
    requirement_name: 'Credit Authorization',
    requirement_type: 'credit_authorization',
    category: 'authorization',
    is_required: true,
    instructions: 'Sign and upload credit check authorization form'
  },
  {
    requirement_name: 'E-Consent',
    requirement_type: 'econsent',
    category: 'authorization',
    is_required: true,
    instructions: 'Sign and upload electronic consent for communications'
  },
  {
    requirement_name: 'Appraisal',
    requirement_type: 'appraisal',
    category: 'appraisal',
    is_required: false,
    is_conditional: true,
    condition_description: 'Will be ordered by lender',
    instructions: 'Appraisal will be ordered once application is submitted'
  }
];

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  
  try {
    const user = await base44.auth.me();
    // Allow automation calls without user auth
    const isAutomation = req.headers.get('x-automation') === 'true';
    if (!user && !isAutomation) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    
    // Handle entity automation payload (triggered by Deal create)
    // Entity automations send: { event: { type, entity_name, entity_id }, data: {...} }
    let deal_id = body.deal_id;
    let loan_purpose = body.loan_purpose;
    let vesting_type = body.vesting_type;
    
    if (!deal_id && body.event?.entity_id) {
      deal_id = body.event.entity_id;
    }
    if (!deal_id && body.data?.id) {
      deal_id = body.data.id;
    }
    
    // Extract loan_purpose and vesting_type from entity data if available
    if (body.data) {
      loan_purpose = loan_purpose || body.data.loan_purpose;
      vesting_type = vesting_type || body.data.vesting_type;
    }
    
    if (!deal_id) {
      return Response.json({ error: 'deal_id is required' }, { status: 400 });
    }

    // Get deal to determine org_id
    const deal = await base44.asServiceRole.entities.Deal.get(deal_id);
    const org_id = deal.org_id;

    // Use deal data if loan_purpose/vesting_type not provided
    loan_purpose = loan_purpose || deal.loan_purpose;
    vesting_type = vesting_type || deal.vesting_type;

    // Filter requirements based on loan purpose and vesting
    let requirements = DSCR_DOCUMENT_REQUIREMENTS.filter(req => {
      // Always include non-conditional requirements
      if (!req.is_conditional) return true;
      
      // Check conditions
      if (req.condition_description?.includes('refinance') && 
          (loan_purpose === 'Refinance' || loan_purpose === 'Cash-Out Refinance')) {
        return true;
      }
      
      if (req.condition_description?.includes('purchase') && loan_purpose === 'Purchase') {
        return true;
      }
      
      if (req.condition_description?.includes('entity') && vesting_type === 'Entity') {
        return true;
      }
      
      // Include appraisal as informational even though lender orders
      if (req.requirement_type === 'appraisal') {
        return true;
      }
      
      return false;
    });

    // Create document requirements
    const created = [];
    for (const req of requirements) {
      const docReq = await base44.asServiceRole.entities.DealDocumentRequirement.create({
        org_id,
        deal_id,
        requirement_name: req.requirement_name,
        requirement_type: req.requirement_type,
        category: req.category,
        is_required: req.is_required,
        is_conditional: req.is_conditional || false,
        condition_description: req.condition_description || '',
        instructions: req.instructions,
        status: 'pending',
        reminder_sent_count: 0
      });
      created.push(docReq);
    }

    return Response.json({
      success: true,
      requirements_created: created.length,
      requirements: created
    });

  } catch (error) {
    console.error('Error creating document requirements:', error);
    return Response.json(
      { error: error.message },
      { status: 500 }
    );
  }
});