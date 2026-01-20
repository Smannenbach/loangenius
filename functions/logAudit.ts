/**
 * Central audit logging function
 * Logs all critical actions for compliance
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    const {
      action_type,
      entity_type,
      entity_id,
      entity_name,
      description,
      old_values,
      new_values,
      severity,
      org_id: requestedOrgId
    } = await req.json();

    if (!action_type || !entity_type || !description) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // SECURITY: Verify org_id from user's membership, not from request
    let org_id = 'default';
    if (user) {
      const memberships = await base44.asServiceRole.entities.OrgMembership.filter({ user_id: user.email });
      if (memberships.length > 0) {
        org_id = memberships[0].org_id;
        // If requestedOrgId provided, verify user has access
        if (requestedOrgId && requestedOrgId !== org_id) {
          const hasAccess = memberships.some(m => m.org_id === requestedOrgId);
          if (!hasAccess) {
            return Response.json({ error: 'Forbidden: Cannot log to different org' }, { status: 403 });
          }
          org_id = requestedOrgId;
        }
      }
    }

    // Calculate changed fields
    let changed_fields = [];
    if (old_values && new_values) {
      changed_fields = Object.keys(new_values).filter(
        key => JSON.stringify(old_values[key]) !== JSON.stringify(new_values[key])
      );
    }

    // Mask sensitive fields
    const maskedOld = maskSensitiveFields(old_values || {});
    const maskedNew = maskSensitiveFields(new_values || {});

    // Create audit log
    const auditLog = await base44.asServiceRole.entities.AuditLog.create({
      org_id: org_id || 'default',
      user_id: user?.id,
      action_type,
      entity_type,
      entity_id,
      entity_name,
      description,
      old_values: maskedOld,
      new_values: maskedNew,
      changed_fields,
      ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip'),
      user_agent: req.headers.get('user-agent'),
      severity: severity || 'Info'
    });

    return Response.json({
      success: true,
      audit_log_id: auditLog.id
    });
  } catch (error) {
    console.error('Error in logAudit:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function maskSensitiveFields(obj) {
  if (!obj || typeof obj !== 'object') return obj;

  const masked = { ...obj };
  const sensitiveFields = ['ssn', 'ein', 'password', 'api_key', 'access_token', 'secret'];

  for (const field of sensitiveFields) {
    if (masked[field]) {
      if (field === 'ssn') {
        masked[field] = `***-**-${String(masked[field]).slice(-4)}`;
      } else if (field === 'ein') {
        masked[field] = `**-***${String(masked[field]).slice(-4)}`;
      } else {
        masked[field] = '[REDACTED]';
      }
    }
  }

  return masked;
}