/**
 * Manage deal fees - CRUD operations with automatic calculations
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { logAudit } from './auditLogHelper.js';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, deal_id, org_id, fee_data } = await req.json();

    if (!action || !deal_id || !org_id) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    let result;

    switch (action) {
      case 'create':
        result = await createDealFee(base44, org_id, deal_id, fee_data, user);
        break;
      case 'update':
        result = await updateDealFee(base44, org_id, deal_id, fee_data, user);
        break;
      case 'delete':
        result = await deleteDealFee(base44, org_id, fee_data.fee_id, user);
        break;
      case 'list':
        result = await listDealFees(base44, deal_id);
        break;
      case 'recalculate':
        result = await recalculateFees(base44, deal_id);
        break;
      default:
        return Response.json({ error: 'Invalid action' }, { status: 400 });
    }

    return Response.json(result);
  } catch (error) {
    console.error('Error managing deal fees:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function createDealFee(base44, org_id, deal_id, feeData, user) {
  const { fee_code, fee_name, fee_type, amount, percentage, trid_category } = feeData;

  if (!fee_code || !fee_name || !fee_type) {
    throw new Error('Missing required fee fields');
  }

  // Calculate amount
  const calculatedAmount = fee_type === 'percentage'
    ? (amount || 0) * (percentage || 0) / 100
    : amount || 0;

  const dealFee = await base44.asServiceRole.entities.DealFee.create({
    org_id,
    deal_id,
    fee_code,
    fee_name,
    fee_type,
    amount: amount || 0,
    percentage: percentage || 0,
    calculated_amount: calculatedAmount,
    trid_category: trid_category || 'A'
  });

  await logAudit(base44, {
    action_type: 'Create',
    entity_type: 'DealFee',
    entity_id: dealFee.id,
    entity_name: fee_name,
    description: `Added fee: ${fee_name} ($${calculatedAmount.toFixed(2)})`,
    severity: 'Info',
    metadata: { org_id, user_id: user.id, deal_id }
  });

  return { success: true, fee: dealFee };
}

async function updateDealFee(base44, org_id, deal_id, feeData, user) {
  const { fee_id, amount, percentage } = feeData;

  if (!fee_id) {
    throw new Error('Missing fee_id');
  }

  const fees = await base44.asServiceRole.entities.DealFee.filter({ id: fee_id });
  if (!fees.length) {
    throw new Error('Fee not found');
  }

  const fee = fees[0];

  // Recalculate if amount/percentage changes
  let calculatedAmount = fee.calculated_amount;
  if (amount !== undefined || percentage !== undefined) {
    calculatedAmount = fee.fee_type === 'percentage'
      ? (amount || fee.amount) * (percentage || fee.percentage) / 100
      : amount || fee.amount;
  }

  const updatedFee = await base44.asServiceRole.entities.DealFee.update(fee_id, {
    amount: amount !== undefined ? amount : fee.amount,
    percentage: percentage !== undefined ? percentage : fee.percentage,
    calculated_amount: calculatedAmount
  });

  await logAudit(base44, {
    action_type: 'Update',
    entity_type: 'DealFee',
    entity_id: fee_id,
    entity_name: fee.fee_name,
    description: `Updated fee amount to $${calculatedAmount.toFixed(2)}`,
    old_values: { calculated_amount: fee.calculated_amount },
    new_values: { calculated_amount: calculatedAmount },
    severity: 'Info',
    metadata: { org_id, user_id: user.id, deal_id }
  });

  return { success: true, fee: updatedFee };
}

async function deleteDealFee(base44, org_id, fee_id, user) {
  const fees = await base44.asServiceRole.entities.DealFee.filter({ id: fee_id });
  if (!fees.length) {
    throw new Error('Fee not found');
  }

  const fee = fees[0];

  await base44.asServiceRole.entities.DealFee.delete(fee_id);

  await logAudit(base44, {
    action_type: 'Delete',
    entity_type: 'DealFee',
    entity_id: fee_id,
    entity_name: fee.fee_name,
    description: `Deleted fee: ${fee.fee_name}`,
    severity: 'Warning',
    metadata: { org_id, user_id: user.id, deal_id: fee.deal_id }
  });

  return { success: true, deleted_fee_id: fee_id };
}

async function listDealFees(base44, deal_id) {
  const fees = await base44.asServiceRole.entities.DealFee.filter({
    deal_id
  });

  // Group by TRID category
  const grouped = {};
  let totalBorrowerPaid = 0;
  let totalSellerPaid = 0;

  fees.forEach(fee => {
    const cat = fee.trid_category || 'Other';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(fee);

    if (fee.is_borrower_paid) totalBorrowerPaid += fee.calculated_amount;
    if (fee.is_seller_paid) totalSellerPaid += fee.calculated_amount;
  });

  return {
    success: true,
    fees,
    grouped,
    totals: {
      borrower_paid: totalBorrowerPaid,
      seller_paid: totalSellerPaid,
      total: totalBorrowerPaid + totalSellerPaid
    }
  };
}

async function recalculateFees(base44, deal_id) {
  // Fetch deal to get loan amount
  const deals = await base44.asServiceRole.entities.Deal.filter({ id: deal_id });
  if (!deals.length) {
    throw new Error('Deal not found');
  }

  const deal = deals[0];
  const fees = await base44.asServiceRole.entities.DealFee.filter({ deal_id });

  let updated = 0;
  for (const fee of fees) {
    if (fee.fee_type === 'percentage') {
      const newAmount = deal.loan_amount * (fee.percentage / 100);
      await base44.asServiceRole.entities.DealFee.update(fee.id, {
        calculated_amount: newAmount
      });
      updated++;
    }
  }

  return { success: true, recalculated: updated };
}