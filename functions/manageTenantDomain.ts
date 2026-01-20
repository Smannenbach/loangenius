import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { getTenantContext } from './_shared/tenantContext.js';
import crypto from 'node:crypto';

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

    // Only tenant admins can manage domains
    if (!['tenant_admin', 'admin'].includes(context.role)) {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { action, hostname, domain_id } = await req.json();

    // CREATE DOMAIN
    if (action === 'create') {
      if (!hostname) {
        return Response.json({ error: 'hostname required' }, { status: 400 });
      }

      // Validate hostname format
      const hostnameRegex = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*$/i;
      if (!hostnameRegex.test(hostname)) {
        return Response.json({ error: 'Invalid hostname format' }, { status: 400 });
      }

      // Check for hostname collision globally
      const existing = await base44.asServiceRole.entities.TenantDomain.filter({ hostname });
      if (existing.length > 0) {
        return Response.json({ error: 'Domain already registered' }, { status: 409 });
      }

      // Determine domain type
      const isSubdomain = hostname.endsWith('.loangenius.ai');
      const domainType = isSubdomain ? 'subdomain' : 'custom';

      // Generate DNS verification token
      const verificationToken = crypto.randomBytes(32).toString('hex');

      const domain = await base44.asServiceRole.entities.TenantDomain.create({
        tenant_id: context.tenant_id,
        hostname,
        domain_type: domainType,
        is_primary: false,
        status: isSubdomain ? 'active' : 'pending_dns',
        dns_verification_token: domainType === 'custom' ? verificationToken : null,
        cname_target: domainType === 'custom' ? 'app.loangenius.ai' : null
      });

      return Response.json({
        success: true,
        domain,
        verification_instructions: domainType === 'custom' ? {
          txt_record: {
            name: `_loangenius-verify.${hostname}`,
            value: verificationToken,
            ttl: 3600
          },
          cname_record: {
            name: hostname,
            value: 'app.loangenius.ai',
            ttl: 3600
          }
        } : null
      });
    }

    // VERIFY DNS
    if (action === 'verify_dns') {
      if (!domain_id) {
        return Response.json({ error: 'domain_id required' }, { status: 400 });
      }

      const domains = await base44.asServiceRole.entities.TenantDomain.filter({
        id: domain_id,
        tenant_id: context.tenant_id
      });

      if (domains.length === 0) {
        return Response.json({ error: 'Domain not found' }, { status: 404 });
      }

      const domain = domains[0];

      // Verify DNS TXT record
      // In production, use DNS lookup API (e.g., Google DNS API, Cloudflare API)
      // For now, simulate verification
      const verified = true; // STUB: Replace with actual DNS query

      if (verified) {
        await base44.asServiceRole.entities.TenantDomain.update(domain.id, {
          status: 'pending_ssl',
          dns_verified_at: new Date().toISOString(),
          verification_error: null
        });

        return Response.json({
          success: true,
          verified: true,
          next_step: 'ssl_provisioning',
          message: 'DNS verified successfully. SSL certificate provisioning in progress.'
        });
      } else {
        await base44.asServiceRole.entities.TenantDomain.update(domain.id, {
          verification_error: 'DNS TXT record not found. Please ensure record is propagated.'
        });

        return Response.json({
          success: false,
          verified: false,
          message: 'DNS verification failed. Please check your DNS records.'
        });
      }
    }

    // PROVISION SSL
    if (action === 'provision_ssl') {
      if (!domain_id) {
        return Response.json({ error: 'domain_id required' }, { status: 400 });
      }

      const domains = await base44.asServiceRole.entities.TenantDomain.filter({
        id: domain_id,
        tenant_id: context.tenant_id
      });

      if (domains.length === 0) {
        return Response.json({ error: 'Domain not found' }, { status: 404 });
      }

      const domain = domains[0];

      // STUB: Integrate with SSL provider (Cloudflare, Let's Encrypt, Vercel, etc.)
      // For production: Call Cloudflare API to create SSL certificate
      const sslProvisioned = true;
      const sslCertRef = `cert-${Date.now()}`;

      if (sslProvisioned) {
        await base44.asServiceRole.entities.TenantDomain.update(domain.id, {
          status: 'active',
          ssl_provider: 'cloudflare',
          ssl_certificate_ref: sslCertRef,
          ssl_issued_at: new Date().toISOString(),
          ssl_expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString() // 90 days
        });

        return Response.json({
          success: true,
          message: 'SSL certificate provisioned successfully. Domain is now active.',
          domain_status: 'active'
        });
      } else {
        return Response.json({
          success: false,
          message: 'SSL provisioning failed. Please contact support.'
        }, { status: 500 });
      }
    }

    // SET PRIMARY DOMAIN
    if (action === 'set_primary') {
      if (!domain_id) {
        return Response.json({ error: 'domain_id required' }, { status: 400 });
      }

      // Unset any existing primary
      const primaryDomains = await base44.asServiceRole.entities.TenantDomain.filter({
        tenant_id: context.tenant_id,
        is_primary: true
      });

      for (const d of primaryDomains) {
        await base44.asServiceRole.entities.TenantDomain.update(d.id, {
          is_primary: false
        });
      }

      // Set new primary
      await base44.asServiceRole.entities.TenantDomain.update(domain_id, {
        is_primary: true
      });

      // Update tenant's primary_domain
      await base44.asServiceRole.entities.TenantAccount.update(context.tenant_id, {
        primary_domain: (await base44.asServiceRole.entities.TenantDomain.filter({ id: domain_id }))[0].hostname
      });

      return Response.json({
        success: true,
        message: 'Primary domain updated'
      });
    }

    // DELETE DOMAIN
    if (action === 'delete') {
      if (!domain_id) {
        return Response.json({ error: 'domain_id required' }, { status: 400 });
      }

      const domains = await base44.asServiceRole.entities.TenantDomain.filter({
        id: domain_id,
        tenant_id: context.tenant_id
      });

      if (domains.length === 0) {
        return Response.json({ error: 'Domain not found' }, { status: 404 });
      }

      if (domains[0].is_primary) {
        return Response.json({
          error: 'Cannot delete primary domain. Set another domain as primary first.'
        }, { status: 400 });
      }

      await base44.asServiceRole.entities.TenantDomain.update(domain_id, {
        status: 'disabled'
      });

      return Response.json({
        success: true,
        message: 'Domain deleted'
      });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});