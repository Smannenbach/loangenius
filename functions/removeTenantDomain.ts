import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { getTenantContext, denyIfMissingTenant } from './_shared/tenantContext.js';

/**
 * Remove a custom domain from the tenant
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

    // Only tenant admins can remove domains
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

    // Prevent removing primary domain
    if (domain.is_primary) {
      return Response.json({ 
        error: 'Cannot remove primary domain. Set another domain as primary first.' 
      }, { status: 400 });
    }

    // Soft delete - mark as disabled
    await base44.asServiceRole.entities.TenantDomain.update(domain.id, {
      status: 'disabled'
    });

    return Response.json({
      success: true,
      message: 'Domain removed successfully'
    });
  } catch (error) {
    console.error('Error removing domain:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});