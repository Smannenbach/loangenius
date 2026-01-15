import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const {
      deal_id,
      action_type,
      date_from,
      date_to,
      limit = 100
    } = await req.json();

    // Build filter
    const filter = {};
    if (deal_id) filter.deal_id = deal_id;
    if (action_type) filter.action_type = action_type;

    // Fetch logs
    const logs = await base44.asServiceRole.entities.ActivityLog.filter(filter);

    // Filter by date range if provided
    let filtered = logs;
    if (date_from || date_to) {
      filtered = logs.filter(log => {
        const logDate = new Date(log.created_date);
        if (date_from && logDate < new Date(date_from)) return false;
        if (date_to && logDate > new Date(date_to)) return false;
        return true;
      });
    }

    // Sort by newest first
    filtered.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));

    return Response.json({
      total_logs: filtered.length,
      logs: filtered.slice(0, limit),
      action_types: [...new Set(logs.map(l => l.action_type))],
      snapshot_date: new Date().toISOString()
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});