import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Seed organization and org membership for new users
 * Creates org if user has no memberships, or returns existing org
 * 
 * This is the canonical org bootstrap function - called automatically
 * by the frontend useOrgId hook when a user has no org membership.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // First, check if user already has any membership
    const existingMemberships = await base44.asServiceRole.entities.OrgMembership.filter({
      user_id: user.email,
    });

    if (existingMemberships.length > 0) {
      // User already has an org - return it
      const orgId = existingMemberships[0].org_id;
      return Response.json({
        success: true,
        message: 'User already has organization',
        org_id: orgId,
        user_email: user.email,
        already_existed: true,
      });
    }

    // User has no org - create one
    const timestamp = Date.now();
    const orgSlug = `org-${user.email.split('@')[0]}-${timestamp}`.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    
    // Create organization
    const newOrg = await base44.asServiceRole.entities.Organization.create({
      name: `${user.full_name || user.email.split('@')[0]}'s Organization`,
      slug: orgSlug,
      subscription_status: 'TRIAL',
      trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 days
    });

    const orgId = newOrg.id;

    // Create OrgMembership for current user as admin
    await base44.asServiceRole.entities.OrgMembership.create({
      org_id: orgId,
      user_id: user.email,
      role: 'admin',
      is_primary: true,
      status: 'active',
    });

    // Create default OrgSettings
    await base44.asServiceRole.entities.OrgSettings.create({
      org_id: orgId,
      company_name: `${user.full_name || 'My'} Company`,
      portal_enabled: true,
    });

    console.log(`Created new org ${orgId} for user ${user.email}`);

    return Response.json({
      success: true,
      message: 'Organization created successfully',
      org_id: orgId,
      user_email: user.email,
      already_existed: false,
    });
  } catch (error) {
    console.error('Seed org error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});