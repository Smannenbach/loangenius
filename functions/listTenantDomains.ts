import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { getTenantContext, denyIfMissingTenant } from './_shared/tenantContext.js';

/**
 * List all domains for the current tenant
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const ctx = await getTenantContext(req);
    
    const denied = denyIfMissingTenant(ctx);
    if (denied) return denied;

    // Fetch domains for this tenant only
    const domains = await base44.asServiceRole.entities.TenantDomain.filter({
      tenant_id: ctx.tenant_id
    });

    // Filter out deleted domains
    const activeDomains = domains.filter(d => d.status !== 'disabled');

    return Response.json({
      success: true,
      domains: activeDomains.map(d => ({
        id: d.id,
        hostname: d.hostname,
        domain_type: d.domain_type,
        is_primary: d.is_primary,
        status: d.status,
        dns_verification_token: d.dns_verification_token,
        cname_target: d.cname_target,
        verification_error: d.verification_error,
        created_date: d.created_date
      }))
    });
  } catch (error) {
    console.error('Error listing domains:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});