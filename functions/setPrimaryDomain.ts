import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { getTenantContext, denyIfMissingTenant } from './_shared/tenantContext.js';

/**
 * Set a domain as the primary domain for the tenant
 */
Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);
    const ctx = await getTenantContext(req);
    
    const denied = denyIfMissingTenant(ctx);
    if (denied) return denied;

    // Only tenant admins can set primary domain
    if (!['tenant_admin', 'admin'].includes(ctx.role)) {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { domain_id } = await req.json();

    if (!domain_id) {
      return Response.json({ error: 'Domain ID is required' }, { status: 400 });
    }

    // Fetch domain and verify ownership
    const domains = await base44.asServiceRole.entities.TenantDomain.filter({
      id: domain_id,
      tenant_id: ctx.tenant_id
    });

    if (domains.length === 0) {
      return Response.json({ error: 'Domain not found' }, { status: 404 });
    }

    const domain = domains[0];

    // Domain must be active to be set as primary
    if (domain.status !== 'active') {
      return Response.json({ 
        error: 'Only active domains can be set as primary' 
      }, { status: 400 });
    }

    // Remove primary flag from all other domains
    const allDomains = await base44.asServiceRole.entities.TenantDomain.filter({
      tenant_id: ctx.tenant_id,
      is_primary: true
    });

    for (const d of allDomains) {
      if (d.id !== domain_id) {
        await base44.asServiceRole.entities.TenantDomain.update(d.id, {
          is_primary: false
        });
      }
    }

    // Set this domain as primary
    await base44.asServiceRole.entities.TenantDomain.update(domain.id, {
      is_primary: true
    });

    // Update tenant account primary domain reference
    await base44.asServiceRole.entities.TenantAccount.update(ctx.tenant_id, {
      primary_domain: domain.hostname
    });

    return Response.json({
      success: true,
      message: 'Primary domain updated successfully',
      domain: {
        id: domain.id,
        hostname: domain.hostname,
        is_primary: true
      }
    });
  } catch (error) {
    console.error('Error setting primary domain:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});