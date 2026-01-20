/**
 * resolveOrgId - THE SINGLE SOURCE OF TRUTH for org resolution
 * Always use this function to get org_id and membership role
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const autoCreate = body.auto_create !== false; // Default true

    // Find existing memberships using service role
    let memberships = await base44.asServiceRole.entities.OrgMembership.filter({
      user_id: user.email,
    });
    
    // Filter to active only
    memberships = memberships.filter(m => m.status === 'active' || !m.status);

    // Normalize role field on existing memberships (migration/backfill)
    for (const membership of memberships) {
      let needsUpdate = false;
      let normalizedRole = membership.role;

      // If role is missing but role_id exists
      if (!normalizedRole && membership.role_id) {
        // Check if role_id is a UUID (references Role entity) or a string role name
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(membership.role_id);
        
        if (isUUID) {
          // Look up Role entity - but skip if it fails
          try {
            const roles = await base44.asServiceRole.entities.Role.filter({ id: membership.role_id });
            if (roles.length > 0) {
              normalizedRole = roles[0].name?.toLowerCase() || 'user';
            } else {
              normalizedRole = 'user';
            }
          } catch (e) {
            normalizedRole = 'user';
          }
        } else {
          // role_id contains a string role name directly
          normalizedRole = membership.role_id.toLowerCase();
        }
        needsUpdate = true;
      }

      // Default role if still missing
      if (!normalizedRole) {
        normalizedRole = 'admin'; // First user is admin
        needsUpdate = true;
      }

      // Backfill the role field
      if (needsUpdate) {
        try {
          await base44.asServiceRole.entities.OrgMembership.update(membership.id, {
            role: normalizedRole,
          });
          membership.role = normalizedRole;
        } catch (e) {
          // Update failed, continue with current role
          membership.role = normalizedRole;
        }
      }
    }

    // If no membership exists and auto_create is true, bootstrap org
    if (memberships.length === 0 && autoCreate) {
      // Create new organization
      const org = await base44.asServiceRole.entities.Organization.create({
        name: `${user.full_name || user.email}'s Organization`,
        status: 'active',
      });

      // Create membership with admin role
      const membership = await base44.asServiceRole.entities.OrgMembership.create({
        org_id: org.id,
        user_id: user.email,
        role: 'admin',
        status: 'active',
        is_primary: true,
      });

      memberships = [membership];
    }

    if (memberships.length === 0) {
      return Response.json({
        ok: false,
        has_org: false,
        message: 'No organization membership found',
      });
    }

    // Get primary membership
    const primaryMembership = memberships.find(m => m.is_primary) || memberships[0];
    const orgId = primaryMembership.org_id;
    const membershipRole = primaryMembership.role || 'admin';

    // Validate org_id is a real ID (not "default" or similar placeholder)
    const isValidOrgId = orgId && /^[0-9a-f]{24}$/i.test(orgId);

    // Get org details only if valid ID
    let orgName = null;
    if (isValidOrgId) {
      try {
        const orgs = await base44.asServiceRole.entities.Organization.filter({ id: orgId });
        if (orgs.length > 0) {
          orgName = orgs[0].name;
        }
      } catch (e) {
        // Org lookup failed, continue without name
      }
    }

    return Response.json({
      ok: true,
      has_org: true,
      org_id: orgId,
      org_name: orgName,
      membership_id: primaryMembership.id,
      membership_role: membershipRole,
      user_email: user.email,
      user_name: user.full_name,
    });
  } catch (error) {
    console.error('resolveOrgId error:', error);
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }
});