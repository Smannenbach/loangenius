/**
 * Audit logging helper
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

export async function logAudit(base44, orgId, userId, action, entityType, entityId, oldValues, newValues, req) {
  try {
    const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-client-ip') || 'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';

    await base44.asServiceRole.entities.AuditLog.create({
      org_id: orgId,
      user_id: userId,
      action,
      entity_type: entityType,
      entity_id: entityId,
      old_values: oldValues || null,
      new_values: newValues || null,
      ip_address: ipAddress,
      user_agent: userAgent,
    });
  } catch (error) {
    console.error('Audit logging failed:', error);
    // Don't throw - audit failure should not block operation
  }
}

/**
 * Check RBAC - verify user has permission for org
 */
export async function checkOrgAccess(base44, userId, orgId) {
  try {
    const memberships = await base44.asServiceRole.entities.OrgMembership.filter({
      org_id: orgId,
      user_id: userId,
      status: 'active',
    });

    return memberships.length > 0;
  } catch (error) {
    console.error('RBAC check failed:', error);
    return false;
  }
}

/**
 * Enforce org isolation on queries
 */
export function enforceOrgScope(orgId) {
  if (!orgId) {
    throw new Error('org_id required for query');
  }
  return { org_id: orgId };
}