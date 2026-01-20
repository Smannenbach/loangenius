/**
 * resolveTenantContext.ts
 *
 * THE SINGLE SOURCE OF TRUTH for tenant resolution in LoanGenius.
 *
 * Resolution Order:
 * 1. Hostname lookup (subdomain or custom domain)
 * 2. User membership lookup (fallback for main app domain)
 * 3. Token-based lookup (for portal magic links)
 *
 * SECURITY: This function MUST be called at the start of every backend function
 * that accesses tenant-scoped data. Never trust client-provided tenant_id.
 */

import { base44 } from './base44';

// Types
interface TenantContext {
  ok: boolean;
  error?: string;
  tenant_id: string;
  org_id: string;
  user_id: string;
  user_email: string;
  role: string;
  permissions: string[];
  resolved_by: 'hostname' | 'membership' | 'token';
  hostname?: string;
  domain_status?: string;
  branding: Record<string, unknown> | null;
  feature_flags: Record<string, boolean>;
}

interface ResolveOptions {
  // For portal access without full auth
  portal_token?: string;
  // Allow unauthenticated domain resolution (for public pages)
  allow_unauthenticated?: boolean;
}

// Main app domains that should fall back to membership resolution
const MAIN_APP_DOMAINS = [
  'app.loangenius.com',
  'app.loangenius.ai',
  'loangenius.local',
  'localhost',
];

// Cache for hostname -> tenant_id mapping (60 second TTL)
const domainCache = new Map<string, { tenant_id: string; org_id: string; expires: number }>();
const CACHE_TTL_MS = 60 * 1000;

/**
 * Resolve tenant context from request
 */
export async function resolveTenantContext(
  req: Request,
  options: ResolveOptions = {}
): Promise<TenantContext> {
  const hostname = extractHostname(req);

  // Step 1: Try hostname resolution first
  const domainResult = await resolveByHostname(hostname);
  if (domainResult.ok) {
    // We have a tenant from hostname, now get user context
    const userContext = await resolveUserContext(req, domainResult.tenant_id, options);
    return {
      ...domainResult,
      ...userContext,
      resolved_by: 'hostname',
      hostname,
    };
  }

  // Step 2: Check if this is a main app domain - fall back to membership
  if (isMainAppDomain(hostname)) {
    const membershipResult = await resolveByMembership(req, options);
    if (membershipResult.ok) {
      return {
        ...membershipResult,
        resolved_by: 'membership',
        hostname,
      };
    }
  }

  // Step 3: Check for portal token
  if (options.portal_token) {
    const tokenResult = await resolveByPortalToken(options.portal_token);
    if (tokenResult.ok) {
      return {
        ...tokenResult,
        resolved_by: 'token',
        hostname,
      };
    }
  }

  // Resolution failed
  return {
    ok: false,
    error: domainResult.error || 'Unable to resolve tenant context',
    tenant_id: '',
    org_id: '',
    user_id: '',
    user_email: '',
    role: '',
    permissions: [],
    resolved_by: 'hostname',
    hostname,
    branding: null,
    feature_flags: {},
  };
}

/**
 * Extract hostname from request
 */
function extractHostname(req: Request): string {
  const host = req.headers.get('host') || req.headers.get('x-forwarded-host') || '';
  // Remove port number if present
  return host.split(':')[0].toLowerCase();
}

/**
 * Check if hostname is a main app domain
 */
function isMainAppDomain(hostname: string): boolean {
  return MAIN_APP_DOMAINS.some(
    (domain) => hostname === domain || hostname.endsWith(`.${domain}`)
  );
}

/**
 * Resolve tenant by hostname (subdomain or custom domain)
 */
async function resolveByHostname(
  hostname: string
): Promise<Partial<TenantContext>> {
  if (!hostname) {
    return { ok: false, error: 'No hostname provided' };
  }

  // Check cache first
  const cached = domainCache.get(hostname);
  if (cached && cached.expires > Date.now()) {
    return {
      ok: true,
      tenant_id: cached.tenant_id,
      org_id: cached.org_id,
    };
  }

  try {
    // Look up domain in TenantDomain entity
    const domains = await base44.asServiceRole.entities.TenantDomain.filter({
      hostname: hostname,
      status: 'active',
    });

    if (domains.length === 0) {
      // Check if it's a subdomain pattern (e.g., acme.loangenius.ai)
      const subdomainResult = await resolveSubdomain(hostname);
      if (subdomainResult.ok) {
        return subdomainResult;
      }

      return { ok: false, error: 'Domain not linked to any tenant' };
    }

    const domain = domains[0];

    // Cache the result
    domainCache.set(hostname, {
      tenant_id: domain.tenant_id,
      org_id: domain.org_id,
      expires: Date.now() + CACHE_TTL_MS,
    });

    // Load branding and features
    const [branding, features] = await Promise.all([
      loadTenantBranding(domain.tenant_id),
      loadTenantFeatures(domain.tenant_id),
    ]);

    return {
      ok: true,
      tenant_id: domain.tenant_id,
      org_id: domain.org_id,
      domain_status: domain.status,
      branding,
      feature_flags: features,
    };
  } catch (error) {
    console.error('[resolveTenantContext] Domain lookup error:', error);
    return { ok: false, error: 'Domain resolution failed' };
  }
}

/**
 * Resolve subdomain pattern (e.g., acme.loangenius.ai -> tenant "acme")
 */
async function resolveSubdomain(hostname: string): Promise<Partial<TenantContext>> {
  // Extract subdomain from patterns like "acme.loangenius.ai"
  const subdomainPatterns = [
    /^([a-z0-9-]+)\.loangenius\.ai$/,
    /^([a-z0-9-]+)\.loangenius\.com$/,
    /^([a-z0-9-]+)\.loangenius\.local$/,
  ];

  let slug: string | null = null;
  for (const pattern of subdomainPatterns) {
    const match = hostname.match(pattern);
    if (match) {
      slug = match[1];
      break;
    }
  }

  if (!slug || slug === 'app' || slug === 'www' || slug === 'api') {
    return { ok: false, error: 'Invalid subdomain' };
  }

  try {
    // Look up tenant by slug
    const tenants = await base44.asServiceRole.entities.TenantAccount.filter({
      slug: slug,
      status: 'active',
    });

    if (tenants.length === 0) {
      return { ok: false, error: `Tenant not found for subdomain: ${slug}` };
    }

    const tenant = tenants[0];

    // Cache with subdomain hostname
    domainCache.set(hostname, {
      tenant_id: tenant.id,
      org_id: tenant.id, // org_id = tenant_id in simple mode
      expires: Date.now() + CACHE_TTL_MS,
    });

    const [branding, features] = await Promise.all([
      loadTenantBranding(tenant.id),
      loadTenantFeatures(tenant.id),
    ]);

    return {
      ok: true,
      tenant_id: tenant.id,
      org_id: tenant.id,
      branding,
      feature_flags: features,
    };
  } catch (error) {
    console.error('[resolveTenantContext] Subdomain lookup error:', error);
    return { ok: false, error: 'Subdomain resolution failed' };
  }
}

/**
 * Resolve tenant by user membership (fallback for main app domain)
 */
async function resolveByMembership(
  req: Request,
  options: ResolveOptions
): Promise<Partial<TenantContext>> {
  if (options.allow_unauthenticated) {
    return { ok: false, error: 'Authentication required' };
  }

  try {
    const user = await base44.auth.me();
    if (!user?.email) {
      return { ok: false, error: 'User not authenticated' };
    }

    // Get user's primary org membership
    const memberships = await base44.asServiceRole.entities.OrgMembership.filter({
      user_id: user.email,
    });

    if (memberships.length === 0) {
      return { ok: false, error: 'User has no organization membership' };
    }

    // Find primary or first membership
    const primary = memberships.find((m: any) => m.is_primary) || memberships[0];

    // Load org's tenant mapping (org_id may equal tenant_id)
    const org_id = primary.org_id;
    const tenant_id = primary.tenant_id || org_id; // Fallback to org_id

    const [branding, features] = await Promise.all([
      loadTenantBranding(tenant_id),
      loadTenantFeatures(tenant_id),
    ]);

    return {
      ok: true,
      tenant_id,
      org_id,
      user_id: user.id,
      user_email: user.email,
      role: normalizeRole(primary.role || primary.role_id),
      permissions: await loadRolePermissions(primary.role || primary.role_id),
      branding,
      feature_flags: features,
    };
  } catch (error) {
    console.error('[resolveTenantContext] Membership lookup error:', error);
    return { ok: false, error: 'Membership resolution failed' };
  }
}

/**
 * Resolve tenant by portal magic link token
 */
async function resolveByPortalToken(token: string): Promise<Partial<TenantContext>> {
  try {
    const links = await base44.asServiceRole.entities.PortalMagicLink.filter({
      token: token,
    });

    if (links.length === 0) {
      return { ok: false, error: 'Invalid or expired portal token' };
    }

    const link = links[0];

    // Check expiration
    if (link.expires_at && new Date(link.expires_at) < new Date()) {
      return { ok: false, error: 'Portal token expired' };
    }

    const tenant_id = link.tenant_id || link.org_id;
    const [branding, features] = await Promise.all([
      loadTenantBranding(tenant_id),
      loadTenantFeatures(tenant_id),
    ]);

    return {
      ok: true,
      tenant_id,
      org_id: link.org_id,
      user_id: link.borrower_email,
      user_email: link.borrower_email,
      role: 'borrower',
      permissions: ['portal_access'],
      branding,
      feature_flags: features,
    };
  } catch (error) {
    console.error('[resolveTenantContext] Token lookup error:', error);
    return { ok: false, error: 'Token resolution failed' };
  }
}

/**
 * Get user context within a resolved tenant
 */
async function resolveUserContext(
  req: Request,
  tenant_id: string,
  options: ResolveOptions
): Promise<Partial<TenantContext>> {
  if (options.allow_unauthenticated) {
    return {
      user_id: '',
      user_email: '',
      role: 'anonymous',
      permissions: [],
    };
  }

  try {
    const user = await base44.auth.me();
    if (!user?.email) {
      return {
        user_id: '',
        user_email: '',
        role: 'anonymous',
        permissions: [],
      };
    }

    // Verify user has membership in this tenant
    const memberships = await base44.asServiceRole.entities.OrgMembership.filter({
      user_id: user.email,
      tenant_id: tenant_id,
    });

    if (memberships.length === 0) {
      // Check if user has org membership that maps to this tenant
      const orgMemberships = await base44.asServiceRole.entities.OrgMembership.filter({
        user_id: user.email,
      });

      // Find membership where org's tenant matches
      const validMembership = orgMemberships.find(
        (m: any) => m.tenant_id === tenant_id || m.org_id === tenant_id
      );

      if (!validMembership) {
        return {
          ok: false,
          error: 'User not authorized for this tenant',
          user_id: user.id,
          user_email: user.email,
          role: '',
          permissions: [],
        };
      }

      return {
        user_id: user.id,
        user_email: user.email,
        role: normalizeRole(validMembership.role),
        permissions: await loadRolePermissions(validMembership.role),
      };
    }

    const membership = memberships[0];
    return {
      user_id: user.id,
      user_email: user.email,
      role: normalizeRole(membership.role),
      permissions: await loadRolePermissions(membership.role),
    };
  } catch (error) {
    console.error('[resolveTenantContext] User context error:', error);
    return {
      user_id: '',
      user_email: '',
      role: 'anonymous',
      permissions: [],
    };
  }
}

/**
 * Load tenant branding
 */
async function loadTenantBranding(tenant_id: string): Promise<Record<string, unknown> | null> {
  try {
    // Try TenantBranding first
    const tenantBranding = await base44.asServiceRole.entities.TenantBranding?.filter({
      tenant_id,
    });

    if (tenantBranding?.length > 0) {
      return tenantBranding[0];
    }

    // Fallback to PortalBranding (legacy)
    const portalBranding = await base44.asServiceRole.entities.PortalBranding.filter({
      org_id: tenant_id,
    });

    return portalBranding?.[0] || null;
  } catch {
    return null;
  }
}

/**
 * Load tenant feature flags
 */
async function loadTenantFeatures(tenant_id: string): Promise<Record<string, boolean>> {
  try {
    const flags = await base44.asServiceRole.entities.TenantFeatureFlag?.filter({
      tenant_id,
    });

    if (!flags || flags.length === 0) {
      // Return default feature set
      return {
        borrower_portal: true,
        white_label: false,
        custom_domains: false,
        docusign: false,
        ai_assistant: false,
      };
    }

    const result: Record<string, boolean> = {};
    for (const flag of flags) {
      result[flag.key] = flag.enabled;
    }
    return result;
  } catch {
    return { borrower_portal: true };
  }
}

/**
 * Load permissions for a role
 */
async function loadRolePermissions(role: string): Promise<string[]> {
  // Default permissions by role
  const rolePermissions: Record<string, string[]> = {
    super_admin: ['*'],
    admin: ['*'],
    owner: ['*'],
    manager: [
      'deal:*', 'lead:*', 'contact:*', 'document:*', 'task:*',
      'org:read', 'org:members', 'reports:read'
    ],
    loan_officer: [
      'deal:create', 'deal:read', 'deal:update',
      'lead:*', 'contact:*', 'document:upload', 'document:read',
      'task:*'
    ],
    processor: [
      'deal:read', 'deal:update',
      'document:*', 'task:*', 'condition:*'
    ],
    underwriter: [
      'deal:read', 'deal:approve', 'deal:deny',
      'document:read', 'condition:*'
    ],
    borrower: ['portal_access'],
    user: ['deal:read', 'document:read'],
  };

  return rolePermissions[role] || rolePermissions.user;
}

/**
 * Normalize role string
 */
function normalizeRole(role: string | undefined): string {
  if (!role) return 'user';

  // Handle UUID role references
  if (role.match(/^[0-9a-f-]{36}$/i)) {
    // This is a role_id, would need to look up the role name
    return 'user';
  }

  return role.toLowerCase();
}

/**
 * Clear domain cache (for testing or when domains change)
 */
export function clearDomainCache(hostname?: string): void {
  if (hostname) {
    domainCache.delete(hostname);
  } else {
    domainCache.clear();
  }
}

// Export for Deno
export default async function handler(req: Request): Promise<Response> {
  try {
    const context = await resolveTenantContext(req);

    if (!context.ok) {
      return new Response(JSON.stringify({ error: context.error }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify(context), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[resolveTenantContext] Handler error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

Deno.serve(handler);
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
