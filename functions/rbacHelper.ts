import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * RBAC Permission Matrix - Server-Side Enforcement
 * This helper ensures consistent permission checking across all backend functions
 */

const PERMISSIONS = {
  // Deals
  'deal:create': ['super_admin', 'admin', 'owner', 'loan_officer'],
  'deal:read_all': ['super_admin', 'admin', 'owner', 'underwriter'],
  'deal:read_assigned': ['super_admin', 'admin', 'owner', 'loan_officer', 'processor', 'underwriter', 'partner', 'borrower'],
  'deal:update': ['super_admin', 'admin', 'owner', 'loan_officer', 'processor'],
  'deal:delete': ['super_admin', 'admin', 'owner'],
  'deal:export_mismo': ['super_admin', 'admin', 'owner', 'loan_officer', 'underwriter'],
  'deal:change_stage': ['super_admin', 'admin', 'owner', 'loan_officer', 'processor', 'underwriter'],
  'deal:approve': ['super_admin', 'admin', 'owner', 'underwriter'],
  
  // Leads
  'lead:create': ['super_admin', 'admin', 'owner', 'loan_officer', 'partner'],
  'lead:read_all': ['super_admin', 'admin', 'owner', 'loan_officer'],
  'lead:update': ['super_admin', 'admin', 'owner', 'loan_officer'],
  'lead:delete': ['super_admin', 'admin', 'owner'],
  'lead:import': ['super_admin', 'admin', 'owner', 'loan_officer'],
  'lead:export': ['super_admin', 'admin', 'owner', 'loan_officer'],
  'lead:convert': ['super_admin', 'admin', 'owner', 'loan_officer'],
  
  // Borrowers
  'borrower:create': ['super_admin', 'admin', 'owner', 'loan_officer'],
  'borrower:read_all': ['super_admin', 'admin', 'owner', 'underwriter'],
  'borrower:read_assigned': ['super_admin', 'admin', 'owner', 'loan_officer', 'processor', 'underwriter'],
  'borrower:update': ['super_admin', 'admin', 'owner', 'loan_officer', 'processor'],
  'borrower:delete': ['super_admin', 'admin', 'owner'],
  
  // Documents
  'document:upload': ['super_admin', 'admin', 'owner', 'loan_officer', 'processor', 'borrower'],
  'document:read_all': ['super_admin', 'admin', 'owner', 'underwriter'],
  'document:read_assigned': ['super_admin', 'admin', 'owner', 'loan_officer', 'processor', 'underwriter', 'borrower'],
  'document:download': ['super_admin', 'admin', 'owner', 'loan_officer', 'processor', 'underwriter', 'borrower'],
  'document:approve': ['super_admin', 'admin', 'owner', 'processor', 'underwriter'],
  'document:delete': ['super_admin', 'admin', 'owner'],
  
  // Conditions
  'condition:create': ['super_admin', 'admin', 'owner', 'loan_officer', 'processor', 'underwriter'],
  'condition:read': ['super_admin', 'admin', 'owner', 'loan_officer', 'processor', 'underwriter', 'borrower'],
  'condition:update': ['super_admin', 'admin', 'owner', 'processor', 'underwriter'],
  'condition:waive': ['super_admin', 'admin', 'owner', 'underwriter'],
  'condition:delete': ['super_admin', 'admin', 'owner'],
  
  // Tasks
  'task:create': ['super_admin', 'admin', 'owner', 'loan_officer', 'processor', 'underwriter'],
  'task:read_all': ['super_admin', 'admin', 'owner'],
  'task:read_assigned': ['super_admin', 'admin', 'owner', 'loan_officer', 'processor', 'underwriter', 'borrower'],
  'task:update': ['super_admin', 'admin', 'owner', 'loan_officer', 'processor', 'underwriter', 'borrower'],
  'task:delete': ['super_admin', 'admin', 'owner'],
  
  // Communications
  'communication:send': ['super_admin', 'admin', 'owner', 'loan_officer', 'processor', 'underwriter', 'borrower'],
  'communication:read_all': ['super_admin', 'admin', 'owner'],
  'communication:read_deal': ['super_admin', 'admin', 'owner', 'loan_officer', 'processor', 'underwriter', 'borrower'],
  'communication:delete': ['super_admin'],
  
  // Users
  'user:list': ['super_admin', 'admin', 'owner'],
  'user:invite': ['super_admin', 'admin', 'owner'],
  'user:update': ['super_admin', 'admin', 'owner'],
  'user:deactivate': ['super_admin', 'admin', 'owner'],
  'user:change_role': ['super_admin', 'admin', 'owner'],
  
  // Organization
  'org:read_settings': ['super_admin', 'admin', 'owner', 'loan_officer', 'processor', 'underwriter'],
  'org:update_settings': ['super_admin', 'admin', 'owner'],
  'org:update_branding': ['super_admin', 'admin', 'owner'],
  'org:manage_integrations': ['super_admin', 'admin', 'owner'],
  
  // Imports/Exports
  'import:leads': ['super_admin', 'admin', 'owner', 'loan_officer'],
  'export:leads': ['super_admin', 'admin', 'owner', 'loan_officer'],
  'export:mismo': ['super_admin', 'admin', 'owner', 'loan_officer', 'underwriter'],
  'export:reports': ['super_admin', 'admin', 'owner', 'loan_officer', 'underwriter'],
  'audit:view_logs': ['super_admin', 'admin', 'owner'],
  
  // Lender Integrations
  'lender:configure': ['super_admin', 'admin', 'owner'],
  'lender:submit': ['super_admin', 'admin', 'owner', 'loan_officer', 'processor', 'underwriter'],
  'lender:view_submissions': ['super_admin', 'admin', 'owner', 'loan_officer', 'processor', 'underwriter'],
};

/**
 * Check if a user has permission for an action
 * @param {string} userRole - The user's role
 * @param {string} permission - The permission key (e.g., 'deal:create')
 * @returns {boolean}
 */
export function hasPermission(userRole, permission) {
  const allowedRoles = PERMISSIONS[permission];
  if (!allowedRoles) {
    console.warn(`Unknown permission: ${permission}`);
    return false;
  }
  return allowedRoles.includes(userRole);
}

/**
 * Get user context from request - includes org_id and role
 * @param {Request} req - The incoming request
 * @returns {Promise<{user, org_id, role, membership} | null>}
 */
export async function getUserContext(req) {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  
  if (!user) return null;
  
  const memberships = await base44.asServiceRole.entities.OrgMembership.filter({
    user_id: user.email
  });
  
  if (memberships.length === 0) return null;
  
  const membership = memberships[0];
  
  return {
    user,
    org_id: membership.org_id,
    role: membership.role || 'user',
    membership,
    base44
  };
}

/**
 * Verify org ownership for a resource
 * @param {object} base44 - SDK instance
 * @param {string} entityName - Entity type
 * @param {string} entityId - Entity ID
 * @param {string} userOrgId - User's org_id
 * @returns {Promise<{authorized: boolean, entity: object | null}>}
 */
export async function verifyOrgOwnership(base44, entityName, entityId, userOrgId) {
  try {
    const entity = await base44.asServiceRole.entities[entityName].get(entityId);
    if (!entity) {
      return { authorized: false, entity: null };
    }
    
    if (entity.org_id !== userOrgId) {
      return { authorized: false, entity: null };
    }
    
    return { authorized: true, entity };
  } catch (e) {
    return { authorized: false, entity: null };
  }
}

/**
 * Standard unauthorized response
 */
export function unauthorizedResponse(message = 'Unauthorized') {
  return Response.json({ error: message }, { status: 401 });
}

/**
 * Standard forbidden response
 */
export function forbiddenResponse(message = 'Forbidden: Insufficient permissions') {
  return Response.json({ error: message }, { status: 403 });
}

/**
 * Standard not found response (use for cross-tenant access to hide existence)
 */
export function notFoundResponse(message = 'Resource not found') {
  return Response.json({ error: message }, { status: 404 });
}

/**
 * Log audit event for permission denial
 */
export async function logPermissionDenied(base44, context, action, entityType, entityId) {
  try {
    await base44.asServiceRole.entities.AuditLog.create({
      org_id: context.org_id,
      user_id: context.user?.id || context.user?.email,
      action_type: 'PERMISSION_DENIED',
      entity_type: entityType,
      entity_id: entityId,
      description: `Permission denied for action: ${action}`,
      outcome: 'denied',
      severity: 'Warning',
      metadata: {
        attempted_action: action,
        user_role: context.role
      }
    });
  } catch (e) {
    console.error('Failed to log permission denied:', e);
  }
}

// Export for use in backend functions
Deno.serve(async (req) => {
  // This function can be called to check permissions
  if (req.method === 'POST') {
    try {
      const { action, permission } = await req.json();
      
      if (action === 'check_permission') {
        const context = await getUserContext(req);
        if (!context) {
          return unauthorizedResponse();
        }
        
        const allowed = hasPermission(context.role, permission);
        return Response.json({ 
          allowed,
          role: context.role,
          org_id: context.org_id
        });
      }
      
      return Response.json({ error: 'Invalid action' }, { status: 400 });
    } catch (e) {
      return Response.json({ error: e.message }, { status: 500 });
    }
  }
  
  return Response.json({ error: 'Method not allowed' }, { status: 405 });
});