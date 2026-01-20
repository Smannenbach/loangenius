import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Migration Script: Backfill tenant_id = org_id for existing data
 * 
 * This is a one-time migration to convert org-scoped data to tenant-scoped.
 * Run this after deploying the tenant entities.
 */

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { action, dry_run = true } = await req.json();

    const results = {
      tenants_created: 0,
      memberships_created: 0,
      domains_created: 0,
      branding_migrated: 0,
      errors: []
    };

    if (action === 'migrate_orgs_to_tenants') {
      // Step 1: Get all Organizations
      const orgs = await base44.asServiceRole.entities.Organization.filter({});
      
      for (const org of orgs) {
        try {
          // Check if tenant already exists for this org
          const existingTenants = await base44.asServiceRole.entities.TenantAccount.filter({
            slug: org.id.slice(0, 12)
          });

          if (existingTenants.length > 0) {
            continue; // Already migrated
          }

          // Create TenantAccount from Organization
          const tenantData = {
            name: org.name || 'Migrated Account',
            slug: org.id.slice(0, 12),
            status: 'active',
            metadata_json: {
              migrated_from_org_id: org.id,
              migrated_at: new Date().toISOString()
            }
          };

          if (!dry_run) {
            const tenant = await base44.asServiceRole.entities.TenantAccount.create(tenantData);
            
            // Create default subdomain
            await base44.asServiceRole.entities.TenantDomain.create({
              tenant_id: tenant.id,
              hostname: `${tenant.slug}.loangenius.ai`,
              domain_type: 'subdomain',
              is_primary: true,
              status: 'active'
            });
            results.domains_created++;

            // Migrate OrgMemberships to TenantMemberships
            const memberships = await base44.asServiceRole.entities.OrgMembership.filter({
              org_id: org.id
            });

            for (const membership of memberships) {
              await base44.asServiceRole.entities.TenantMembership.create({
                tenant_id: tenant.id,
                user_id: membership.user_id,
                role: membership.role_id === 'admin' ? 'tenant_admin' : 'user',
                org_id: org.id,
                status: membership.status || 'active',
                is_primary: true
              });
              results.memberships_created++;
            }

            // Migrate PortalBranding to TenantBranding
            const brandings = await base44.asServiceRole.entities.PortalBranding.filter({
              org_id: org.id
            });

            if (brandings.length > 0) {
              const pb = brandings[0];
              await base44.asServiceRole.entities.TenantBranding.create({
                tenant_id: tenant.id,
                app_name: pb.company_name || 'LoanGenius',
                logo_light_url: pb.logo_url,
                logo_dark_url: pb.logo_dark_url,
                primary_color: pb.primary_color || '#2563eb',
                secondary_color: pb.secondary_color || '#1e40af',
                support_email: pb.support_email,
                support_phone: pb.support_phone
              });
              results.branding_migrated++;
            }
          }

          results.tenants_created++;
        } catch (err) {
          results.errors.push({
            org_id: org.id,
            error: err.message
          });
        }
      }
    }

    return Response.json({
      success: true,
      dry_run,
      results,
      message: dry_run 
        ? 'Dry run complete. Set dry_run=false to execute migration.' 
        : 'Migration complete.'
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});