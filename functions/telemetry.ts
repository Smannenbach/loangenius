import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Backend telemetry endpoint
 * Receives spans and metrics from frontend
 */

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }
  
  try {
    const base44 = createClientFromRequest(req);
    
    // Parse telemetry event
    let telemetryEvent;
    try {
      telemetryEvent = await req.json();
    } catch {
      return Response.json({ error: 'Invalid JSON' }, { status: 400 });
    }
    
    // Get user context
    let user = null;
    let org_id = 'unknown';
    
    try {
      user = await base44.auth.me();
      if (user) {
        const memberships = await base44.asServiceRole.entities.OrgMembership.filter({
          user_id: user.email
        });
        if (memberships.length > 0) {
          org_id = memberships[0].org_id;
        }
      }
    } catch {
      // Continue without user context
    }
    
    // Handle based on type
    if (telemetryEvent.type === 'span') {
      // Store span as audit log
      await base44.asServiceRole.entities.AuditLog.create({
        org_id,
        user_id: user?.id || user?.email,
        action_type: 'TELEMETRY_SPAN',
        entity_type: 'Span',
        description: `${telemetryEvent.name}: ${telemetryEvent.duration_ms}ms (${telemetryEvent.status})`,
        severity: telemetryEvent.status === 'error' ? 'Warning' : 'Info',
        metadata: {
          trace_id: telemetryEvent.trace_id,
          span_id: telemetryEvent.span_id,
          name: telemetryEvent.name,
          duration_ms: telemetryEvent.duration_ms,
          status: telemetryEvent.status,
          error: telemetryEvent.error,
          route: telemetryEvent.attributes?.route,
          attributes: telemetryEvent.attributes
        }
      });
      
    } else if (telemetryEvent.type === 'metric') {
      // Store metric
      await base44.asServiceRole.entities.AuditLog.create({
        org_id,
        user_id: user?.id || user?.email,
        action_type: 'TELEMETRY_METRIC',
        entity_type: 'Metric',
        description: `${telemetryEvent.name}: ${telemetryEvent.value}`,
        severity: 'Info',
        metadata: {
          trace_id: telemetryEvent.trace_id,
          name: telemetryEvent.name,
          value: telemetryEvent.value,
          labels: telemetryEvent.labels
        }
      });
    }
    
    return Response.json({ success: true });
    
  } catch (error) {
    console.error('[Telemetry] Failed to store telemetry:', error);
    // Don't fail - telemetry should be fire-and-forget
    return Response.json({ success: false }, { status: 202 });
  }
});