import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { getTenantContext, denyIfMissingTenant } from './_shared/tenantContext.js';

/**
 * Add a custom domain to the tenant
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

    // Only tenant admins can add domains
    if (!['tenant_admin', 'admin'].includes(ctx.role)) {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { hostname, domain_type = 'custom' } = await req.json();

    if (!hostname) {
      return Response.json({ error: 'Hostname is required' }, { status: 400 });
    }

    // Validate hostname format
    const hostnameRegex = /^([a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
    if (!hostnameRegex.test(hostname)) {
      return Response.json({ error: 'Invalid hostname format' }, { status: 400 });
    }

    // Check for global uniqueness
    const existing = await base44.asServiceRole.entities.TenantDomain.filter({
      hostname: hostname.toLowerCase()
    });

    if (existing.length > 0) {
      return Response.json({ error: 'This domain is already registered' }, { status: 409 });
    }

    // Generate verification token
    const verificationToken = crypto.randomUUID().replace(/-/g, '').slice(0, 32);
    
    // Determine verification details based on domain type
    const isSubdomain = hostname.endsWith('.loangenius.ai') || hostname.endsWith('.loangenius.com');
    const actualDomainType = isSubdomain ? 'subdomain' : 'custom';
    
    // For custom domains, they need to add a CNAME
    const cnameTarget = 'edge.loangenius.ai';
    const verificationRecordName = `_loangenius-verify.${hostname}`;
    const verificationRecordValue = `loangenius-verify=${verificationToken}`;

    const domain = await base44.asServiceRole.entities.TenantDomain.create({
      tenant_id: ctx.tenant_id,
      hostname: hostname.toLowerCase(),
      domain_type: actualDomainType,
      is_primary: false,
      status: isSubdomain ? 'active' : 'pending_dns',
      dns_verification_token: verificationToken,
      cname_target: cnameTarget,
      ssl_provider: 'cloudflare'
    });

    return Response.json({
      success: true,
      domain: {
        id: domain.id,
        hostname: domain.hostname,
        status: domain.status,
        domain_type: domain.domain_type
      },
      verification: isSubdomain ? null : {
        type: 'CNAME',
        host: hostname,
        value: cnameTarget,
        txt_record: {
          name: verificationRecordName,
          value: verificationRecordValue
        },
        instructions: [
          `1. Log in to your DNS provider (e.g., Cloudflare, GoDaddy, Namecheap)`,
          `2. Add a CNAME record: ${hostname} → ${cnameTarget}`,
          `3. Add a TXT record: ${verificationRecordName} → ${verificationRecordValue}`,
          `4. Wait for DNS propagation (usually 5-30 minutes)`,
          `5. Click "Verify Domain" in the settings`
        ]
      }
    });
  } catch (error) {
    console.error('Error adding domain:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});