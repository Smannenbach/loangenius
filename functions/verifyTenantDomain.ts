import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { getTenantContext, denyIfMissingTenant } from './_shared/tenantContext.js';

/**
 * Verify DNS configuration for a tenant domain
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

    if (domain.status === 'active') {
      return Response.json({ 
        success: true, 
        message: 'Domain is already verified and active',
        domain: {
          id: domain.id,
          hostname: domain.hostname,
          status: domain.status
        }
      });
    }

    // Verify DNS records using DNS-over-HTTPS
    const hostname = domain.hostname;
    const cnameTarget = domain.cname_target || 'edge.loangenius.ai';
    
    let cnameVerified = false;
    let txtVerified = false;
    const errors = [];

    try {
      // Check CNAME record
      const cnameResponse = await fetch(
        `https://cloudflare-dns.com/dns-query?name=${hostname}&type=CNAME`,
        { headers: { 'Accept': 'application/dns-json' } }
      );
      const cnameData = await cnameResponse.json();
      
      if (cnameData.Answer) {
        for (const answer of cnameData.Answer) {
          if (answer.type === 5) { // CNAME record type
            const target = answer.data.replace(/\.$/, ''); // Remove trailing dot
            if (target.toLowerCase() === cnameTarget.toLowerCase()) {
              cnameVerified = true;
              break;
            }
          }
        }
      }
      
      if (!cnameVerified) {
        errors.push(`CNAME record not found. Expected: ${hostname} → ${cnameTarget}`);
      }
    } catch (dnsError) {
      errors.push(`Failed to check CNAME: ${dnsError.message}`);
    }

    try {
      // Check TXT record for verification token
      const txtRecordName = `_loangenius-verify.${hostname}`;
      const expectedValue = `loangenius-verify=${domain.dns_verification_token}`;
      
      const txtResponse = await fetch(
        `https://cloudflare-dns.com/dns-query?name=${txtRecordName}&type=TXT`,
        { headers: { 'Accept': 'application/dns-json' } }
      );
      const txtData = await txtResponse.json();
      
      if (txtData.Answer) {
        for (const answer of txtData.Answer) {
          if (answer.type === 16) { // TXT record type
            const value = answer.data.replace(/"/g, '');
            if (value === expectedValue) {
              txtVerified = true;
              break;
            }
          }
        }
      }
      
      if (!txtVerified) {
        errors.push(`TXT verification record not found or incorrect`);
      }
    } catch (dnsError) {
      errors.push(`Failed to check TXT record: ${dnsError.message}`);
    }

    // Update domain status based on verification results
    if (cnameVerified) {
      const newStatus = 'active'; // In production, would go to pending_ssl first
      
      await base44.asServiceRole.entities.TenantDomain.update(domain.id, {
        status: newStatus,
        dns_verified_at: new Date().toISOString(),
        last_verified_at: new Date().toISOString(),
        verification_error: null,
        retry_count: 0
      });

      return Response.json({
        success: true,
        verified: true,
        message: 'Domain verified and activated!',
        domain: {
          id: domain.id,
          hostname: domain.hostname,
          status: newStatus
        }
      });
    } else {
      // Update retry count and error
      await base44.asServiceRole.entities.TenantDomain.update(domain.id, {
        last_verified_at: new Date().toISOString(),
        verification_error: errors.join('; '),
        retry_count: (domain.retry_count || 0) + 1
      });

      return Response.json({
        success: false,
        verified: false,
        errors,
        message: 'DNS verification failed. Please check your DNS settings.',
        instructions: [
          `Ensure CNAME record exists: ${hostname} → ${cnameTarget}`,
          `DNS changes can take up to 48 hours to propagate`,
          `Try again in a few minutes`
        ]
      });
    }
  } catch (error) {
    console.error('Error verifying domain:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});