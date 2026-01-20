/**
 * Shared Organization Resolver
 * Canonical org_id resolution from user context
 */

/**
 * Resolve the organization ID for the authenticated user
 * @param {object} base44 - The Base44 SDK client
 * @param {object} user - The authenticated user object
 * @returns {Promise<{orgId: string, membership: object}>} Organization info
 * @throws {Error} If user is not part of any organization
 */
export async function resolveOrgId(base44, user) {
  if (!user?.email) {
    throw new Error('User not authenticated');
  }

  const memberships = await base44.entities.OrgMembership.filter({
    user_id: user.email
  });

  if (memberships.length === 0) {
    throw new Error('User not associated with any organization');
  }

  // Return the first (primary) organization
  const membership = memberships[0];
  return {
    orgId: membership.org_id,
    membership
  };
}

/**
 * Check if user has admin role in their organization
 * @param {object} membership - The OrgMembership record
 * @returns {boolean} True if user is admin/owner
 */
export function isOrgAdmin(membership) {
  const role = membership?.role_id || membership?.role || 'user';
  return ['admin', 'owner', 'super_admin'].includes(role);
}