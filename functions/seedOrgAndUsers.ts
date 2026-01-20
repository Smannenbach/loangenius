/**
 * Seed Organization and Users - Bootstrap new user organizations
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Check if user already has an org
    const existingMemberships = await base44.entities.OrgMembership.filter({ 
      user_id: user.email 
    });

    if (existingMemberships.length > 0) {
      return Response.json({
        success: true,
        message: 'User already has organization',
        org_id: existingMemberships[0].org_id,
        already_exists: true,
      });
    }

    // Create new organization
    const org = await base44.asServiceRole.entities.Organization.create({
      name: user.full_name ? `${user.full_name}'s Organization` : 'My Organization',
      status: 'active',
    });

    // Create admin role if not exists
    let adminRole = null;
    const roles = await base44.asServiceRole.entities.Role.filter({ name: 'admin' });
    if (roles.length === 0) {
      adminRole = await base44.asServiceRole.entities.Role.create({
        name: 'admin',
        permissions: ['*'],
      });
    } else {
      adminRole = roles[0];
    }

    // Create membership
    await base44.asServiceRole.entities.OrgMembership.create({
      org_id: org.id,
      user_id: user.email,
      role_id: adminRole.id,
      status: 'active',
    });

    // Create default org settings
    await base44.asServiceRole.entities.OrgSettings.create({
      org_id: org.id,
      company_name: org.name,
      portal_enabled: true,
    });

    return Response.json({
      success: true,
      org_id: org.id,
      message: 'Organization created successfully',
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});