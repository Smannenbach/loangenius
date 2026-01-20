import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const { action, tenant_id, metric_type, metric_value, metadata } = await req.json();

    if (action === 'increment') {
      if (!tenant_id || !metric_type || metric_value === undefined) {
        return Response.json({ error: 'tenant_id, metric_type, and metric_value required' }, { status: 400 });
      }

      // Get current billing period
      const now = new Date();
      const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

      // Check for existing log for this period
      const existing = await base44.asServiceRole.entities.TenantUsageLog.filter({
        tenant_id,
        metric_type,
        period_start: periodStart.toISOString(),
      });

      // Get tenant subscription for quota limits
      const subscriptions = await base44.asServiceRole.entities.TenantSubscription.filter({ tenant_id });
      const subscription = subscriptions[0];
      
      // Define limits by plan
      const quotaLimits = {
        starter: { api_calls: 10000, storage_bytes: 5 * 1024 * 1024 * 1024, ai_tokens: 100000, emails_sent: 1000, sms_sent: 100 },
        professional: { api_calls: 50000, storage_bytes: 25 * 1024 * 1024 * 1024, ai_tokens: 500000, emails_sent: 5000, sms_sent: 500 },
        enterprise: { api_calls: -1, storage_bytes: -1, ai_tokens: -1, emails_sent: -1, sms_sent: -1 },
      };

      const planId = subscription?.plan_id || 'starter';
      const limit = quotaLimits[planId]?.[metric_type] || -1;

      if (existing.length > 0) {
        // Update existing record
        const record = existing[0];
        const newValue = (record.metric_value || 0) + metric_value;
        const quotaExceeded = limit > 0 && newValue > limit;

        await base44.asServiceRole.entities.TenantUsageLog.update(record.id, {
          metric_value: newValue,
          quota_exceeded: quotaExceeded,
          metadata_json: { ...record.metadata_json, ...metadata, last_updated: now.toISOString() },
        });

        return Response.json({
          success: true,
          current_value: newValue,
          quota_limit: limit,
          quota_exceeded: quotaExceeded,
        });
      } else {
        // Create new record
        const quotaExceeded = limit > 0 && metric_value > limit;

        await base44.asServiceRole.entities.TenantUsageLog.create({
          tenant_id,
          period_start: periodStart.toISOString(),
          period_end: periodEnd.toISOString(),
          metric_type,
          metric_value,
          quota_limit: limit > 0 ? limit : null,
          quota_exceeded: quotaExceeded,
          metadata_json: { ...metadata, created_at: now.toISOString() },
        });

        return Response.json({
          success: true,
          current_value: metric_value,
          quota_limit: limit,
          quota_exceeded: quotaExceeded,
        });
      }
    }

    if (action === 'get_usage') {
      if (!tenant_id) {
        return Response.json({ error: 'tenant_id required' }, { status: 400 });
      }

      const now = new Date();
      const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);

      const logs = await base44.asServiceRole.entities.TenantUsageLog.filter({
        tenant_id,
        period_start: periodStart.toISOString(),
      });

      const usage = {};
      for (const log of logs) {
        usage[log.metric_type] = {
          value: log.metric_value,
          limit: log.quota_limit,
          exceeded: log.quota_exceeded,
        };
      }

      return Response.json({ usage, period_start: periodStart.toISOString() });
    }

    if (action === 'check_quota') {
      if (!tenant_id || !metric_type) {
        return Response.json({ error: 'tenant_id and metric_type required' }, { status: 400 });
      }

      const now = new Date();
      const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);

      const logs = await base44.asServiceRole.entities.TenantUsageLog.filter({
        tenant_id,
        metric_type,
        period_start: periodStart.toISOString(),
      });

      const currentUsage = logs[0]?.metric_value || 0;
      const limit = logs[0]?.quota_limit || -1;

      return Response.json({
        metric_type,
        current_usage: currentUsage,
        quota_limit: limit,
        remaining: limit > 0 ? Math.max(0, limit - currentUsage) : -1,
        exceeded: limit > 0 && currentUsage >= limit,
      });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Usage tracking error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});