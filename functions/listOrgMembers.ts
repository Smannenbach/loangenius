/**
 * List Org Members - Secure listing of organization members
 * Only accessible by admin/owner/manager roles
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

    // Resolve org and verify access
    const resolveResponse = await base44.functions.invoke('resolveOrgId', { auto_create: false });
    const orgData = resolveResponse.data;
    
    if (!orgData.ok || !orgData.has_org) {
      return Response.json({ ok: false, error: 'No organization' }, { status: 403 });
    }

    const orgId = orgData.org_id;
    const userRole = orgData.membership_role;

    // Only admin/owner/manager can list members
    if (!['admin', 'owner', 'manager'].includes(userRole)) {
      return Response.json({ ok: false, error: 'Insufficient permissions' }, { status: 403 });
    }

    // Get all memberships for this org using service role
    const memberships = await base44.asServiceRole.entities.OrgMembership.filter({
      org_id: orgId,
    });

    // Return safe fields only
    const safeMembers = memberships.map(m => ({
      id: m.id,
      user_id: m.user_id,
      email: m.user_id, // user_id is the email
      role: m.role || 'user',
      status: m.status || 'active',
      is_primary: m.is_primary || false,
      nmls_id: m.nmls_id,
      created_date: m.created_date,
    }));

    return Response.json({
      ok: true,
      org_id: orgId,
      members: safeMembers,
      count: safeMembers.length,
    });
  } catch (error) {
    console.error('listOrgMembers error:', error);
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }
});