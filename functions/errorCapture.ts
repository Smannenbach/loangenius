import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Backend error capture endpoint
 * Receives error events from frontend and stores them for analysis
 */

// Sensitive field patterns to redact
const REDACT_PATTERNS = [
  /\b\d{3}-\d{2}-\d{4}\b/g,
  /\b\d{9}\b/g,
  /Bearer\s+[A-Za-z0-9\-_.]+/gi,
  /api[_-]?key[=:]\s*[A-Za-z0-9\-_]+/gi
];

function redactSensitiveData(text) {
  if (!text || typeof text !== 'string') return text;
  let redacted = text;
  for (const pattern of REDACT_PATTERNS) {
    redacted = redacted.replace(pattern, '[REDACTED]');
  }
  return redacted;
}

function redactObject(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  
  const redacted = Array.isArray(obj) ? [] : {};
  
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      redacted[key] = redactSensitiveData(value);
    } else if (typeof value === 'object' && value !== null) {
      redacted[key] = redactObject(value);
    } else {
      redacted[key] = value;
    }
  }
  
  return redacted;
}

Deno.serve(async (req) => {
  // Accept both POST and beacon
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }
  
  try {
    const base44 = createClientFromRequest(req);
    
    // Parse error event
    let errorEvent;
    try {
      errorEvent = await req.json();
    } catch {
      return Response.json({ error: 'Invalid JSON' }, { status: 400 });
    }
    
    // Redact any remaining sensitive data
    const safeEvent = redactObject(errorEvent);
    
    // Get user context if available
    let user = null;
    let org_id = safeEvent.org_id || 'unknown';
    
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
      // User not authenticated, continue with anonymous
    }
    
    // Store error in AuditLog
    await base44.asServiceRole.entities.AuditLog.create({
      org_id,
      user_id: user?.id || user?.email || safeEvent.user_id_hash,
      action_type: 'FRONTEND_ERROR',
      entity_type: 'Error',
      description: `${safeEvent.error_type}: ${safeEvent.error_message?.slice(0, 200)}`,
      severity: 'Warning',
      metadata: {
        trace_id: safeEvent.trace_id,
        span_id: safeEvent.span_id,
        error_type: safeEvent.error_type,
        error_message: safeEvent.error_message,
        error_stack: safeEvent.error_stack?.slice(0, 2000), // Limit stack size
        route: safeEvent.route,
        feature_area: safeEvent.feature_area,
        env: safeEvent.env,
        version: safeEvent.version,
        url: safeEvent.url,
        user_agent: safeEvent.user_agent?.slice(0, 200),
        breadcrumbs: safeEvent.breadcrumbs?.slice(-10) // Last 10 breadcrumbs
      }
    });
    
    // Log to console for immediate visibility
    console.error('[ErrorCapture]', {
      trace_id: safeEvent.trace_id,
      error_type: safeEvent.error_type,
      error_message: safeEvent.error_message,
      route: safeEvent.route,
      feature_area: safeEvent.feature_area
    });
    
    return Response.json({ success: true, trace_id: safeEvent.trace_id });
    
  } catch (error) {
    console.error('[ErrorCapture] Failed to capture error:', error);
    // Don't fail - error capture should be fire-and-forget
    return Response.json({ success: false, error: 'Capture failed' }, { status: 202 });
  }
});