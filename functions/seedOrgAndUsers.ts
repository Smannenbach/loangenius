import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Seed organization and org membership for demo
 * Call once to set up the org structure
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const orgId = 'default';

    // Create or update OrgMembership for current user
    const memberships = await base44.asServiceRole.entities.OrgMembership.filter({
      org_id: orgId,
      user_id: user.email,
    });

    if (memberships.length === 0) {
      await base44.asServiceRole.entities.OrgMembership.create({
        org_id: orgId,
        user_id: user.email,
        role_id: 'admin',
        status: 'active',
      });
    }

    // Create OrgSettings if not exists
    const settings = await base44.asServiceRole.entities.OrgSettings.filter({
      org_id: orgId,
    });

    if (settings.length === 0) {
      await base44.asServiceRole.entities.OrgSettings.create({
        org_id: orgId,
        company_name: 'LoanGenius Demo',
        portal_enabled: true,
      });
    }

    return Response.json({
      success: true,
      message: 'Org seeded successfully',
      org_id: orgId,
      user_email: user.email,
    });
  } catch (error) {
    console.error('Seed error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});