import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { getTenantContext } from './_shared/tenantContext.js';

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);
    const context = await getTenantContext(req);

    if (!context.ok) {
      return Response.json({ error: context.error }, { status: context.status });
    }

    // Only tenant admins can update branding
    if (!['tenant_admin', 'admin'].includes(context.role)) {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const brandingData = await req.json();

    // Find existing branding or create new
    const existing = await base44.asServiceRole.entities.TenantBranding.filter({
      tenant_id: context.tenant_id
    });

    let branding;
    if (existing.length > 0) {
      branding = await base44.asServiceRole.entities.TenantBranding.update(
        existing[0].id,
        brandingData
      );
    } else {
      branding = await base44.asServiceRole.entities.TenantBranding.create({
        tenant_id: context.tenant_id,
        ...brandingData
      });
    }

    return Response.json({
      success: true,
      branding
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});