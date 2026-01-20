import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Tenant Context Resolution
 * 
 * Resolves tenant_id, org_id, user, role from request.
 * Enforces tenant isolation by preventing cross-tenant access.
 * 
 * @param {Request} req - Incoming HTTP request
 * @returns {Promise<TenantContext>}
 */
export async function getTenantContext(req) {
  const base44 = createClientFromRequest(req);
  
  // Step 1: Authenticate user
  const user = await base44.auth.me();
  if (!user) {
    return {
      ok: false,
      error: 'Unauthorized',
      status: 401,
      tenant_id: null,
      org_id: null,
      user: null,
      role: null,
    };
  }

  // Step 2: Resolve tenant from hostname
  const hostname = req.headers.get('host')?.split(':')[0]; // Remove port
  let tenant = null;
  let tenantDomain = null;

  if (hostname) {
    // Look up tenant by domain
    const domains = await base44.asServiceRole.entities.TenantDomain.filter({
      hostname,
      status: 'active'
    });
    
    if (domains.length > 0) {
      tenantDomain = domains[0];
      const tenants = await base44.asServiceRole.entities.TenantAccount.filter({
        id: tenantDomain.tenant_id,
        status: { $in: ['trial', 'active'] }
      });
      tenant = tenants[0];
    }
  }

  // Step 3: If no domain match, fall back to user's primary tenant membership
  if (!tenant) {
    const memberships = await base44.asServiceRole.entities.TenantMembership.filter({
      user_id: user.email,
      status: 'active',
      is_primary: true
    });

    if (memberships.length > 0) {
      const tenants = await base44.asServiceRole.entities.TenantAccount.filter({
        id: memberships[0].tenant_id,
        status: { $in: ['trial', 'active'] }
      });
      tenant = tenants[0];
    } else {
      // Try any active membership
      const anyMemberships = await base44.asServiceRole.entities.TenantMembership.filter({
        user_id: user.email,
        status: 'active'
      });
      if (anyMemberships.length > 0) {
        const tenants = await base44.asServiceRole.entities.TenantAccount.filter({
          id: anyMemberships[0].tenant_id
        });
        tenant = tenants[0];
      }
    }

    // MIGRATION FALLBACK: Check legacy OrgMembership
    if (!tenant) {
      const orgMemberships = await base44.asServiceRole.entities.OrgMembership.filter({
        user_id: user.email,
        status: 'active'
      });
      
      if (orgMemberships.length > 0) {
        // Auto-create tenant from legacy org
        const org = await base44.asServiceRole.entities.Organization.filter({
          id: orgMemberships[0].org_id
        }).then(orgs => orgs[0]);

        if (org) {
          tenant = await base44.asServiceRole.entities.TenantAccount.create({
            name: org.name || 'Migrated Account',
            slug: org.id.slice(0, 12),
            status: 'active',
            admin_email: user.email,
            admin_user_id: user.email,
            metadata_json: { migrated_from_org_id: org.id }
          });

          // Create tenant membership
          await base44.asServiceRole.entities.TenantMembership.create({
            tenant_id: tenant.id,
            user_id: user.email,
            role: orgMemberships[0].role_id === 'admin' ? 'tenant_admin' : 'user',
            org_id: org.id,
            status: 'active',
            is_primary: true
          });

          // Create default subdomain
          await base44.asServiceRole.entities.TenantDomain.create({
            tenant_id: tenant.id,
            hostname: `${tenant.slug}.loangenius.ai`,
            domain_type: 'subdomain',
            is_primary: true,
            status: 'active'
          });
        }
      }
    }
  }

  if (!tenant) {
    return {
      ok: false,
      error: 'No tenant found for user',
      status: 403,
      tenant_id: null,
      org_id: null,
      user,
      role: null,
    };
  }

  // Step 4: Get tenant membership and role
  const memberships = await base44.asServiceRole.entities.TenantMembership.filter({
    tenant_id: tenant.id,
    user_id: user.email,
    status: 'active'
  });

  const membership = memberships[0];
  if (!membership) {
    return {
      ok: false,
      error: 'User not authorized for this tenant',
      status: 403,
      tenant_id: tenant.id,
      org_id: null,
      user,
      role: null,
    };
  }

  // Step 5: Resolve org_id (defaults to tenant_id if no sub-orgs)
  const org_id = membership.org_id || tenant.id;

  // Step 6: Load branding
  const branding = await base44.asServiceRole.entities.TenantBranding.filter({
    tenant_id: tenant.id
  }).then(results => results[0] || null);

  // Step 7: Load feature flags
  const featureFlags = await base44.asServiceRole.entities.TenantFeatureFlag.filter({
    tenant_id: tenant.id,
    enabled: true
  });

  const features = {};
  featureFlags.forEach(f => {
    features[f.feature_key] = f.payload_json || true;
  });

  return {
    ok: true,
    tenant_id: tenant.id,
    org_id,
    user,
    role: membership.role,
    tenant_name: tenant.name,
    tenant_slug: tenant.slug,
    tenant_status: tenant.status,
    branding: branding || {},
    features,
    domain_hostname: hostname,
    domain_status: tenantDomain?.status || 'unknown',
  };
}

/**
 * Middleware: Deny request if no tenant context
 */
export async function denyIfMissingTenant(req) {
  const context = await getTenantContext(req);
  if (!context.ok) {
    return Response.json(
      { error: context.error },
      { status: context.status }
    );
  }
  return null; // Continue
}

/**
 * Assert tenant ownership of a record
 * Prevents IDOR attacks by verifying record belongs to tenant
 */
export async function assertTenantOwnership(base44, entityName, recordId, expectedTenantId) {
  const record = await base44.asServiceRole.entities[entityName].filter({ id: recordId });
  
  if (record.length === 0) {
    throw new Error('Record not found');
  }

  const actualTenantId = record[0].tenant_id || record[0].org_id;
  if (actualTenantId !== expectedTenantId) {
    throw new Error('Access denied: record belongs to different tenant');
  }

  return record[0];
}

/**
 * Safe tenant-scoped query helper
 */
export function tenantScopedFilter(tenant_id, additionalFilters = {}) {
  return {
    tenant_id,
    is_deleted: false,
    ...additionalFilters
  };
}