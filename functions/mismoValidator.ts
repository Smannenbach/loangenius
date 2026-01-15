import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const REQUIRED_FIELDS = [
  { path: 'deal_number', label: 'Deal Number', section: 'deal' },
  { path: 'loan_amount', label: 'Loan Amount', section: 'loan' },
  { path: 'interest_rate', label: 'Interest Rate', section: 'loan' },
  { path: 'loan_term_months', label: 'Loan Term', section: 'loan' }
];

function getNestedValue(obj, path) {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

async function runPreflightCheck(dealId, base44) {
  const deal = await base44.asServiceRole.entities.Deal.get(dealId);
  if (!deal) throw new Error('Deal not found');

  const errors = [];
  const warnings = [];

  // Check required fields
  for (const field of REQUIRED_FIELDS) {
    const value = getNestedValue(deal, field.path);
    if (!value) {
      errors.push({
        field: field.path,
        message: `${field.label} is required for MISMO export`,
        severity: 'error'
      });
    }
  }

  const requiredComplete = REQUIRED_FIELDS.filter(f => {
    const value = getNestedValue(deal, f.path);
    return value;
  }).length;

  const completionPercent = Math.round((requiredComplete / REQUIRED_FIELDS.length) * 100);

  return {
    isValid: errors.length === 0,
    canExport: errors.length === 0,
    errors,
    warnings,
    completionPercent,
    requiredFieldsComplete: requiredComplete,
    requiredFieldsTotal: REQUIRED_FIELDS.length
  };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { dealId } = req.body;
    if (!dealId) return Response.json({ error: 'dealId required' }, { status: 400 });

    const result = await runPreflightCheck(dealId, base44);
    return Response.json(result);
  } catch (error) {
    console.error('MISMO validation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});