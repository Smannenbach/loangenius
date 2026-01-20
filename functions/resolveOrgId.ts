/**
 * Resolve Organization ID for Current User
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const memberships = await base44.entities.OrgMembership.filter({
      user_id: user.email,
      status: 'active',
    });

    if (memberships.length === 0) {
      return Response.json({
        success: false,
        has_org: false,
        message: 'User is not a member of any organization',
      });
    }

    const orgId = memberships[0].org_id;
    const roleId = memberships[0].role_id;

    // Get org details
    const orgs = await base44.entities.Organization.filter({ id: orgId });
    const org = orgs.length > 0 ? orgs[0] : null;

    // Get role details
    const roles = await base44.entities.Role.filter({ id: roleId });
    const role = roles.length > 0 ? roles[0] : null;

    return Response.json({
      success: true,
      has_org: true,
      org_id: orgId,
      org_name: org?.name,
      role_name: role?.name,
      user_email: user.email,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});