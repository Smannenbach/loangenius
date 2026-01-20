import { getTenantContext } from './_shared/tenantContext.js';

Deno.serve(async (req) => {
  try {
    const context = await getTenantContext(req);
    
    // Return sanitized context (no sensitive data)
    return Response.json({
      ok: context.ok,
      tenant_id: context.tenant_id,
      org_id: context.org_id,
      tenant_name: context.tenant_name,
      tenant_slug: context.tenant_slug,
      role: context.role,
      branding: context.branding,
      features: context.features,
      domain_status: context.domain_status,
      user: context.user ? {
        email: context.user.email,
        full_name: context.user.full_name,
        role: context.user.role
      } : null,
      error: context.error || null
    });
  } catch (error) {
    return Response.json({
      ok: false,
      error: error.message
    }, { status: 500 });
  }
});