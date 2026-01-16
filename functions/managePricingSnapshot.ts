/**
 * Manage pricing snapshots and rate locks
 * Captures point-in-time pricing for quotes and locking
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
    const { action, deal_id, pricing_data } = body;
    
    // Get org_id from membership if not provided
    let org_id = body.org_id;
    if (!org_id) {
      const memberships = await base44.asServiceRole.entities.OrgMembership.filter({
        user_id: user.email
      });
      org_id = memberships.length > 0 ? memberships[0].org_id : 'default';
    }

    if (!action || !deal_id) {
      return Response.json({ error: 'Missing action or deal_id' }, { status: 400 });
    }

    let result;

    switch (action) {
      case 'create_snapshot':
        result = await createPricingSnapshot(base44, org_id, deal_id, pricing_data, user);
        break;
      case 'lock_rate':
        result = await lockRate(base44, org_id, deal_id, pricing_data, user);
        break;
      case 'release_lock':
        result = await releaseLock(base44, pricing_data.rate_lock_id, user);
        break;
      case 'set_quote_of_record':
        result = await setQuoteOfRecord(base44, pricing_data.snapshot_id, user);
        break;
      case 'list_snapshots':
        result = await listSnapshots(base44, deal_id);
        break;
      default:
        return Response.json({ error: 'Invalid action' }, { status: 400 });
    }

    return Response.json(result);
  } catch (error) {
    console.error('Error managing pricing:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function createPricingSnapshot(base44, org_id, deal_id, pricingData, user) {
  const {
    interest_rate,
    points = 0,
    apr,
    prepay_type,
    prepay_penalty_pct,
    rate_lock_days,
    lender_name,
    program_name,
    monthly_payment,
    notes
  } = pricingData;

  if (!interest_rate) {
    throw new Error('Missing interest_rate');
  }

  const snapshot = await base44.asServiceRole.entities.PricingSnapshot.create({
    org_id,
    deal_id,
    snapshot_date: new Date().toISOString(),
    interest_rate,
    points,
    apr: apr || interest_rate,
    prepay_type,
    prepay_penalty_pct,
    rate_lock_days,
    rate_lock_expiration: rate_lock_days
      ? new Date(Date.now() + rate_lock_days * 86400000).toISOString().split('T')[0]
      : null,
    lender_name,
    program_name,
    monthly_payment,
    notes,
    created_by: user.id
  });

  await base44.asServiceRole.entities.ActivityLog.create({
    org_id,
    deal_id,
    activity_type: 'DEAL_UPDATED',
    description: `Pricing snapshot created: ${interest_rate}% | Points: ${points} | ${lender_name || 'Internal quote'}`,
    source: 'admin'
  });

  return { success: true, snapshot };
}

async function lockRate(base44, org_id, deal_id, pricingData, user) {
  const {
    pricing_snapshot_id,
    interest_rate,
    points = 0,
    lock_days
  } = pricingData;

  if (!interest_rate || !lock_days) {
    throw new Error('Missing interest_rate or lock_days');
  }

  const lockDate = new Date();
  const expirationDate = new Date(lockDate.getTime() + lock_days * 86400000);

  const rateLock = await base44.asServiceRole.entities.RateLock.create({
    org_id,
    deal_id,
    pricing_snapshot_id,
    lock_date: lockDate.toISOString().split('T')[0],
    expiration_date: expirationDate.toISOString().split('T')[0],
    lock_days,
    interest_rate,
    points,
    status: 'Active',
    locked_by_user_id: user.id
  });

  await base44.asServiceRole.entities.ActivityLog.create({
    org_id,
    deal_id,
    activity_type: 'DEAL_UPDATED',
    description: `Rate locked: ${interest_rate}% for ${lock_days} days, expires ${expirationDate.toLocaleDateString()}`,
    source: 'admin'
  });

  return { success: true, rate_lock: rateLock };
}

async function releaseLock(base44, rateLockId, user) {
  const locks = await base44.asServiceRole.entities.RateLock.filter({ id: rateLockId });
  if (!locks.length) {
    throw new Error('Rate lock not found');
  }

  const lock = locks[0];

  const releasedLock = await base44.asServiceRole.entities.RateLock.update(rateLockId, {
    status: 'Released',
    released_at: new Date().toISOString()
  });



  return { success: true, rate_lock: releasedLock };
}

async function setQuoteOfRecord(base44, snapshotId, user) {
  const snapshots = await base44.asServiceRole.entities.PricingSnapshot.filter({ id: snapshotId });
  if (!snapshots.length) {
    throw new Error('Snapshot not found');
  }

  const snapshot = snapshots[0];

  // Unset previous quote of record
  const previousQuotes = await base44.asServiceRole.entities.PricingSnapshot.filter({
    deal_id: snapshot.deal_id,
    is_quote_of_record: true
  });

  for (const prev of previousQuotes) {
    if (prev.id !== snapshotId) {
      await base44.asServiceRole.entities.PricingSnapshot.update(prev.id, {
        is_quote_of_record: false
      });
    }
  }

  // Set as quote of record
  const updatedSnapshot = await base44.asServiceRole.entities.PricingSnapshot.update(snapshotId, {
    is_quote_of_record: true
  });

  return { success: true, snapshot: updatedSnapshot };
}

async function listSnapshots(base44, deal_id) {
  const snapshots = await base44.asServiceRole.entities.PricingSnapshot.filter({
    deal_id
  });

  return {
    success: true,
    snapshots: snapshots.sort((a, b) => new Date(b.snapshot_date) - new Date(a.snapshot_date))
  };
}