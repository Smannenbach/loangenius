import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Shared backend org resolver
 * 
 * This is the canonical way to resolve orgId in backend functions.
 * NEVER use user.org_id, user.id, or any other fallback.
 * 
 * Usage in other functions:
 *   import { resolveOrgId } from './resolveOrgId.js';
 *   const orgId = await resolveOrgId(base44, user);
 * 
 * Note: This file also exposes an HTTP endpoint for testing/debugging.
 */

/**
 * Resolve the org_id for a user from OrgMembership
 * 
 * @param {Object} base44 - The Base44 SDK client (already initialized from request)
 * @param {Object} user - The authenticated user object (from base44.auth.me())
 * @param {Object} options - Options
 * @param {boolean} options.autoCreate - If true, creates org if user has none (default: false)
 * @returns {Promise<string>} - The org_id
 * @throws {Error} - If user has no org and autoCreate is false
 */
export async function resolveOrgId(base44, user, options = {}) {
  const { autoCreate = false } = options;

  if (!user || !user.email) {
    throw new Error('User not authenticated');
  }

  // Query OrgMembership for this user
  const memberships = await base44.asServiceRole.entities.OrgMembership.filter({
    user_id: user.email
  });

  if (memberships.length > 0) {
    // Return the primary membership's org_id, or the first one
    const primary = memberships.find(m => m.is_primary) || memberships[0];
    return primary.org_id;
  }

  // No membership found
  if (!autoCreate) {
    throw new Error('User not associated with any organization. Please contact support.');
  }

  // Auto-create org for this user
  console.log(`Auto-creating org for user ${user.email}`);
  
  const timestamp = Date.now();
  const orgSlug = `org-${user.email.split('@')[0]}-${timestamp}`.toLowerCase().replace(/[^a-z0-9-]/g, '-');
  
  // Create organization
  const newOrg = await base44.asServiceRole.entities.Organization.create({
    name: `${user.full_name || user.email.split('@')[0]}'s Organization`,
    slug: orgSlug,
    subscription_status: 'TRIAL',
    trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
  });

  // Create OrgMembership
  await base44.asServiceRole.entities.OrgMembership.create({
    org_id: newOrg.id,
    user_id: user.email,
    role: 'admin',
    is_primary: true,
    status: 'active',
  });

  // Create default OrgSettings
  await base44.asServiceRole.entities.OrgSettings.create({
    org_id: newOrg.id,
    company_name: `${user.full_name || 'My'} Company`,
    portal_enabled: true,
  });

  console.log(`Created org ${newOrg.id} for user ${user.email}`);
  return newOrg.id;
}

/**
 * Verify user has access to a specific org
 * 
 * @param {Object} base44 - The Base44 SDK client
 * @param {Object} user - The authenticated user object
 * @param {string} orgId - The org_id to verify access to
 * @returns {Promise<Object>} - The membership object if user has access
 * @throws {Error} - If user does not have access to this org
 */
export async function verifyOrgAccess(base44, user, orgId) {
  if (!user || !user.email) {
    throw new Error('User not authenticated');
  }

  if (!orgId) {
    throw new Error('No org_id provided');
  }

  const memberships = await base44.asServiceRole.entities.OrgMembership.filter({
    user_id: user.email,
    org_id: orgId
  });

  if (memberships.length === 0) {
    throw new Error('User does not have access to this organization');
  }

  return memberships[0];
}

// HTTP endpoint for testing/debugging
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { action, org_id } = body;

    if (action === 'verify' && org_id) {
      // Verify access to specific org
      const membership = await verifyOrgAccess(base44, user, org_id);
      return Response.json({
        success: true,
        org_id: org_id,
        role: membership.role,
        is_primary: membership.is_primary
      });
    }

    // Default: resolve user's org
    const resolvedOrgId = await resolveOrgId(base44, user, { autoCreate: body.auto_create || false });
    
    return Response.json({
      success: true,
      org_id: resolvedOrgId,
      user_email: user.email
    });

  } catch (error) {
    console.error('resolveOrgId error:', error);
    return Response.json({ 
      error: error.message,
      error_code: error.message.includes('not associated') ? 'NO_ORG' : 'ERROR'
    }, { status: error.message.includes('Unauthorized') ? 401 : 400 });
  }
});