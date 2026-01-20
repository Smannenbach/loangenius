import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { action, deal_id, org_id, rate_lock_id, data } = await req.json();

    if (action === 'request_lock') {
      const { locked_rate, locked_points, lock_period_days, lock_fee, float_down_eligible, lender_submission_id } = data;
      
      const lockDate = new Date();
      const expirationDate = new Date(lockDate.getTime() + (lock_period_days || 30) * 24 * 60 * 60 * 1000);
      
      const rateLock = await base44.entities.RateLock.create({
        org_id, deal_id, lender_submission_id, locked_rate, locked_points, lock_period_days: lock_period_days || 30,
        lock_fee, float_down_eligible: float_down_eligible || false,
        lock_date: lockDate.toISOString(), expiration_date: expirationDate.toISOString(),
        status: 'locked', locked_by: user.email
      });
      
      return Response.json({ success: true, rate_lock_id: rateLock.id, expiration_date: expirationDate.toISOString() });
    }

    if (action === 'extend_lock') {
      const { extension_days } = data;
      
      const locks = await base44.entities.RateLock.filter({ id: rate_lock_id });
      const lock = locks[0];
      if (!lock) return Response.json({ error: 'Rate lock not found' }, { status: 404 });
      
      const currentExpiration = new Date(lock.expiration_date);
      const newExpiration = new Date(currentExpiration.getTime() + (extension_days || 7) * 24 * 60 * 60 * 1000);
      const extensionFee = (extension_days || 7) * 50; // $50/day example
      
      await base44.entities.RateLock.update(rate_lock_id, {
        extension_count: (lock.extension_count || 0) + 1,
        extension_days: (lock.extension_days || 0) + extension_days,
        new_expiration_date: newExpiration.toISOString(),
        expiration_date: newExpiration.toISOString(),
        extension_fee: (lock.extension_fee || 0) + extensionFee,
        status: 'extended'
      });
      
      return Response.json({ success: true, new_expiration: newExpiration.toISOString(), extension_fee: extensionFee, total_extensions: (lock.extension_count || 0) + 1 });
    }

    if (action === 'execute_float_down') {
      const { new_rate } = data;
      
      const locks = await base44.entities.RateLock.filter({ id: rate_lock_id });
      const lock = locks[0];
      if (!lock) return Response.json({ error: 'Rate lock not found' }, { status: 404 });
      if (!lock.float_down_eligible) return Response.json({ error: 'Float down not eligible' }, { status: 400 });
      if (new_rate >= lock.locked_rate) return Response.json({ error: 'New rate must be lower' }, { status: 400 });
      
      const savings = lock.locked_rate - new_rate;
      
      await base44.entities.RateLock.update(rate_lock_id, {
        float_down_executed: true, float_down_date: new Date().toISOString(), float_down_rate: new_rate, locked_rate: new_rate
      });
      
      return Response.json({ success: true, new_rate, savings: savings.toFixed(3) });
    }

    if (action === 'check_expiring') {
      const locks = await base44.entities.RateLock.filter({ org_id, status: 'locked' });
      const now = Date.now();
      
      const expiringSoon = locks.filter(l => {
        const exp = new Date(l.expiration_date).getTime();
        const daysUntil = (exp - now) / (24 * 60 * 60 * 1000);
        return daysUntil <= 10 && daysUntil > 0;
      });
      
      return Response.json({ expiring_soon: expiringSoon.map(l => ({ id: l.id, deal_id: l.deal_id, expiration_date: l.expiration_date, days_until: Math.ceil((new Date(l.expiration_date).getTime() - now) / (24 * 60 * 60 * 1000)) })) });
    }

    if (action === 'get_dashboard') {
      const locks = await base44.entities.RateLock.filter({ org_id });
      const active = locks.filter(l => l.status === 'locked' || l.status === 'extended');
      const now = Date.now();
      
      const expiringThisWeek = active.filter(l => {
        const exp = new Date(l.expiration_date).getTime();
        return (exp - now) / (24 * 60 * 60 * 1000) <= 7;
      });
      
      const totalVolume = active.reduce((sum, l) => sum + (l.locked_rate ? 1 : 0), 0);
      const avgPeriod = active.length > 0 ? active.reduce((sum, l) => sum + (l.lock_period_days || 30), 0) / active.length : 0;
      
      return Response.json({ active_locks: active.length, expiring_this_week: expiringThisWeek.length, total_volume: totalVolume, avg_lock_period: avgPeriod.toFixed(0) });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Rate lock error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});