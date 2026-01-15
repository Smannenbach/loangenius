/**
 * Loan Application Service
 * Handles autosave, submission, co-borrower invite, and requirement generation
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { logActivity } from './auditLogHelper.js';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, org_id, data } = await req.json();

    if (!action || !org_id) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    let result;

    switch (action) {
      case 'create_application':
        result = await createApplication(base44, org_id, data, user);
        break;
      case 'autosave_step':
        result = await autosaveStep(base44, org_id, data, user);
        break;
      case 'submit_application':
        result = await submitApplication(base44, org_id, data, user);
        break;
      case 'invite_coborrower':
        result = await inviteCoBorrower(base44, org_id, data, user);
        break;
      case 'get_application':
        result = await getApplication(base44, data.application_id);
        break;
      default:
        return Response.json({ error: 'Invalid action' }, { status: 400 });
    }

    return Response.json(result);
  } catch (error) {
    console.error('Error in applicationService:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function createApplication(base44, org_id, data, user) {
  const uuid = crypto.randomUUID();
  const resumeToken = crypto.randomUUID();

  const application = await base44.asServiceRole.entities.LoanApplication.create({
    org_id,
    borrower_id: user.id,
    application_uuid: uuid,
    status: 'draft',
    current_step: 0,
    completed_steps: [],
    form_data_json: {},
    co_borrowers_json: [],
    resume_token: resumeToken,
    resume_token_expires_at: new Date(Date.now() + 30 * 86400000).toISOString()
  });

  // Create first step
  await base44.asServiceRole.entities.ApplicationStep.create({
    org_id,
    application_id: application.id,
    step_index: 0,
    step_name: 'Borrower',
    data_json: {},
    is_valid: false
  });

  return {
    success: true,
    application,
    resume_url: `/loan-application?app=${uuid}&token=${resumeToken}`
  };
}

async function autosaveStep(base44, org_id, data, user) {
  const { application_id, step_index, step_name, form_data } = data;

  if (!application_id || step_index === undefined) {
    throw new Error('Missing application_id or step_index');
  }

  // Get or create step
  const steps = await base44.asServiceRole.entities.ApplicationStep.filter({
    application_id,
    step_index
  });

  let step;
  if (steps.length) {
    step = await base44.asServiceRole.entities.ApplicationStep.update(steps[0].id, {
      data_json: form_data,
      last_saved_at: new Date().toISOString()
    });
  } else {
    step = await base44.asServiceRole.entities.ApplicationStep.create({
      org_id,
      application_id,
      step_index,
      step_name,
      data_json: form_data,
      last_saved_at: new Date().toISOString()
    });
  }

  // Update application
  const apps = await base44.asServiceRole.entities.LoanApplication.filter({ id: application_id });
  if (apps.length) {
    const app = apps[0];
    const updatedCompleted = Array.from(new Set([...app.completed_steps, step_index]));
    await base44.asServiceRole.entities.LoanApplication.update(application_id, {
      form_data_json: { ...app.form_data_json, [step_name]: form_data },
      completed_steps: updatedCompleted,
      current_step: step_index
    });
  }

  return { success: true, step, saved_at: new Date().toISOString() };
}

async function submitApplication(base44, org_id, data, user) {
  const { application_id, loan_product, loan_purpose, form_data } = data;

  if (!application_id || !loan_product || !loan_purpose) {
    throw new Error('Missing required submission fields');
  }

  const apps = await base44.asServiceRole.entities.LoanApplication.filter({ id: application_id });
  if (!apps.length) {
    throw new Error('Application not found');
  }

  const app = apps[0];

  // Create canonical snapshot
  const canonicalSnapshot = {
    submitted_at: new Date().toISOString(),
    submitted_by_user_id: user.id,
    loan_product,
    loan_purpose,
    borrower: form_data.Borrower || {},
    entity: form_data.Entity || {},
    property: form_data.Property || {},
    income: form_data.Income || {},
    liabilities: form_data.Liabilities || {},
    terms: form_data.Terms || {},
    consents: form_data.Consents || {}
  };

  // Update application
  const submittedApp = await base44.asServiceRole.entities.LoanApplication.update(application_id, {
    status: 'submitted',
    loan_product,
    loan_purpose,
    submitted_at: new Date().toISOString(),
    canonical_snapshot_json: canonicalSnapshot
  });

  // Create deal from application
  const deal = await base44.asServiceRole.entities.Deal.create({
    org_id,
    loan_product,
    loan_purpose,
    stage: 'application',
    status: 'active',
    application_date: new Date().toISOString().split('T')[0],
    assigned_to_user_id: data.assigned_to_user_id || null,
    primary_borrower_id: app.borrower_id,
    loan_amount: parseFloat(form_data.Terms?.loan_amount) || 0,
    interest_rate: parseFloat(form_data.Terms?.interest_rate) || 0,
    loan_term_months: parseInt(form_data.Terms?.loan_term_months) || 360
  });

  // Generate deal number
  const orgId = org_id;
  const month = new Date().toISOString().slice(0, 7).replace('-', '');
  const seq = deal.id.slice(-4); // Last 4 chars of ID
  const dealNumber = `LG-${month}-${seq}`;
  await base44.asServiceRole.entities.Deal.update(deal.id, {
    deal_number: dealNumber
  });

  // Update application with deal link
  await base44.asServiceRole.entities.LoanApplication.update(application_id, {
    deal_id: deal.id,
    status: 'converted_to_deal'
  });

  // Generate document requirements
  await generateRequirementsForDeal(base44, deal.id, org_id, loan_product, loan_purpose);

  // Log activity
  await logActivity(base44, {
    deal_id: deal.id,
    borrower_id: app.borrower_id,
    activity_type: 'System_Event',
    title: 'Application submitted',
    description: `Loan application submitted for ${loan_product} - ${loan_purpose}`,
    icon: '📋',
    color: 'green'
  });

  return {
    success: true,
    application: submittedApp,
    deal,
    deal_number: dealNumber,
    portal_docs_url: `/borrower-portal/${deal.id}/documents`
  };
}

async function inviteCoBorrower(base44, org_id, data, user) {
  const { application_id, coborrower_email, coborrower_name, role } = data;

  if (!application_id || !coborrower_email) {
    throw new Error('Missing application_id or coborrower_email');
  }

  const apps = await base44.asServiceRole.entities.LoanApplication.filter({ id: application_id });
  if (!apps.length) {
    throw new Error('Application not found');
  }

  const app = apps[0];
  const inviteToken = crypto.randomUUID();

  // Add to co_borrowers_json
  const coBorrowers = app.co_borrowers_json || [];
  coBorrowers.push({
    email: coborrower_email,
    name: coborrower_name,
    role: role || 'co-borrower',
    status: 'invited',
    invite_token: inviteToken,
    invited_at: new Date().toISOString(),
    invited_by: user.id
  });

  await base44.asServiceRole.entities.LoanApplication.update(application_id, {
    co_borrowers_json: coBorrowers
  });

  // Send email with invite link
  const inviteUrl = `${Deno.env.get('APP_URL') || 'https://app.loangenius.io'}/loan-application?app=${app.application_uuid}&invite=${inviteToken}`;

  await base44.integrations.Core.SendEmail({
    to: coborrower_email,
    subject: `${user.full_name} invited you to complete a loan application`,
    body: `Hi ${coborrower_name},\n\n${user.full_name} has invited you to complete a loan application.\n\nClick here to join: ${inviteUrl}\n\nYour invite expires in 30 days.`
  });

  return {
    success: true,
    invite_sent_to: coborrower_email,
    invite_url: inviteUrl
  };
}

async function getApplication(base44, application_id) {
  const apps = await base44.asServiceRole.entities.LoanApplication.filter({ id: application_id });
  if (!apps.length) {
    throw new Error('Application not found');
  }

  const app = apps[0];
  const steps = await base44.asServiceRole.entities.ApplicationStep.filter({
    application_id
  });

  return {
    success: true,
    application: app,
    steps: steps.sort((a, b) => a.step_index - b.step_index)
  };
}

async function generateRequirementsForDeal(base44, deal_id, org_id, loan_product, loan_purpose) {
  // Fetch document requirements template
  const reqTemplates = await base44.asServiceRole.entities.DocumentRequirement.filter({
    org_id,
    loan_product,
    loan_purpose,
    is_active: true
  });

  // Create Condition for each requirement
  for (const template of reqTemplates) {
    await base44.asServiceRole.entities.Condition.create({
      org_id,
      deal_id,
      document_requirement_id: template.id,
      title: template.document_type,
      description: `${template.document_type} required for ${loan_product} ${loan_purpose}`,
      condition_type: 'PTD',
      status: 'pending',
      due_at: new Date(Date.now() + 7 * 86400000).toISOString()
    });
  }
}