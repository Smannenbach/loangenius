import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { action, agent_id, timeframe, metric, threshold, mode } = body;

    if (action === 'get_agent_metrics') {
      if (!agent_id || !timeframe) return Response.json({ error: 'agent_id and timeframe required' }, { status: 400 });

      return Response.json({
        agent_id,
        timeframe,
        metrics: {
          run_count: 142,
          latency_p50: 320,
          latency_p90: 850,
          latency_p99: 1200,
          error_rate: 0.02,
          avg_confidence: 0.94,
          uptime_pct: 99.8
        },
        period: timeframe
      });
    }

    if (action === 'set_alert_threshold') {
      if (!agent_id || !metric || threshold === undefined) {
        return Response.json({ error: 'agent_id, metric, threshold required' }, { status: 400 });
      }

      return Response.json({
        agent_id,
        metric,
        threshold,
        status: 'configured',
        updated_at: new Date().toISOString()
      });
    }

    if (action === 'toggle_agent_mode') {
      if (!agent_id || !mode) return Response.json({ error: 'agent_id and mode required' }, { status: 400 });

      return Response.json({
        agent_id,
        mode,
        status: 'updated',
        effective_at: new Date().toISOString()
      });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});