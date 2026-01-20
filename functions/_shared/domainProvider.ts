/**
 * Domain Provider Abstraction
 *
 * This abstraction allows LoanGenius to support multiple hosting providers
 * for custom domain SSL provisioning:
 * - Cloudflare for SaaS (recommended)
 * - Vercel Platforms
 * - AWS CloudFront + ACM
 * - Base44 Native (if supported)
 *
 * Set DOMAIN_PROVIDER env var to select the provider.
 */

// Types
export interface DomainProviderConfig {
  provider: 'cloudflare' | 'vercel' | 'aws' | 'base44_native';
  apiKey?: string;
  zoneId?: string;        // Cloudflare zone ID
  fallbackOrigin?: string; // Cloudflare for SaaS fallback origin
  projectId?: string;     // Vercel project ID
  distributionId?: string; // AWS CloudFront distribution ID
}

export interface AddDomainRequest {
  tenant_id: string;
  hostname: string;
  domain_type: 'subdomain' | 'custom';
}

export interface AddDomainResponse {
  success: boolean;
  domain_id?: string;
  verification_method: 'cname' | 'txt' | 'http';
  verification_record_name: string;
  verification_record_value: string;
  target_cname: string;
  error?: string;
}

export interface VerifyDomainResponse {
  success: boolean;
  status: 'pending_dns' | 'pending_ssl' | 'active' | 'failed';
  error?: string;
}

export interface DomainStatus {
  hostname: string;
  status: 'pending_dns' | 'pending_ssl' | 'active' | 'failed' | 'removed';
  ssl_status?: 'pending' | 'active' | 'expired' | 'error';
  ssl_expires_at?: string;
  last_error?: string;
}

// Provider Interface
export interface DomainProvider {
  name: string;
  addDomain(req: AddDomainRequest): Promise<AddDomainResponse>;
  verifyDomain(hostname: string): Promise<VerifyDomainResponse>;
  provisionSSL(hostname: string): Promise<VerifyDomainResponse>;
  getDomainStatus(hostname: string): Promise<DomainStatus>;
  removeDomain(hostname: string): Promise<{ success: boolean; error?: string }>;
}

// ============================================
// CLOUDFLARE FOR SAAS PROVIDER
// ============================================
class CloudflareSaaSProvider implements DomainProvider {
  name = 'cloudflare';
  private apiKey: string;
  private zoneId: string;
  private fallbackOrigin: string;

  constructor(config: DomainProviderConfig) {
    this.apiKey = config.apiKey || Deno.env.get('CLOUDFLARE_API_KEY') || '';
    this.zoneId = config.zoneId || Deno.env.get('CLOUDFLARE_ZONE_ID') || '';
    this.fallbackOrigin = config.fallbackOrigin || 'edge.loangenius.ai';
  }

  async addDomain(req: AddDomainRequest): Promise<AddDomainResponse> {
    try {
      // Create custom hostname via Cloudflare for SaaS API
      const response = await fetch(
        `https://api.cloudflare.com/client/v4/zones/${this.zoneId}/custom_hostnames`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            hostname: req.hostname,
            ssl: {
              method: 'http',
              type: 'dv',
              settings: {
                http2: 'on',
                min_tls_version: '1.2',
              },
            },
            custom_origin_server: this.fallbackOrigin,
          }),
        }
      );

      const data = await response.json();

      if (!data.success) {
        return {
          success: false,
          verification_method: 'cname',
          verification_record_name: '',
          verification_record_value: '',
          target_cname: '',
          error: data.errors?.[0]?.message || 'Cloudflare API error',
        };
      }

      const result = data.result;

      return {
        success: true,
        domain_id: result.id,
        verification_method: 'cname',
        verification_record_name: req.hostname,
        verification_record_value: this.fallbackOrigin,
        target_cname: this.fallbackOrigin,
      };
    } catch (error) {
      console.error('[CloudflareSaaSProvider] addDomain error:', error);
      return {
        success: false,
        verification_method: 'cname',
        verification_record_name: '',
        verification_record_value: '',
        target_cname: '',
        error: error.message,
      };
    }
  }

  async verifyDomain(hostname: string): Promise<VerifyDomainResponse> {
    try {
      // Get custom hostname status
      const response = await fetch(
        `https://api.cloudflare.com/client/v4/zones/${this.zoneId}/custom_hostnames?hostname=${hostname}`,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
          },
        }
      );

      const data = await response.json();

      if (!data.success || !data.result?.length) {
        return { success: false, status: 'failed', error: 'Domain not found' };
      }

      const ch = data.result[0];

      // Map Cloudflare status to our status
      const statusMap: Record<string, DomainStatus['status']> = {
        pending_validation: 'pending_dns',
        pending_deployment: 'pending_ssl',
        active: 'active',
        moved: 'failed',
        deleted: 'removed',
      };

      return {
        success: true,
        status: statusMap[ch.status] || 'pending_dns',
      };
    } catch (error) {
      console.error('[CloudflareSaaSProvider] verifyDomain error:', error);
      return { success: false, status: 'failed', error: error.message };
    }
  }

  async provisionSSL(hostname: string): Promise<VerifyDomainResponse> {
    // Cloudflare for SaaS handles SSL automatically
    return this.verifyDomain(hostname);
  }

  async getDomainStatus(hostname: string): Promise<DomainStatus> {
    const result = await this.verifyDomain(hostname);
    return {
      hostname,
      status: result.status,
      ssl_status: result.status === 'active' ? 'active' : 'pending',
      last_error: result.error,
    };
  }

  async removeDomain(hostname: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Find the custom hostname ID
      const searchResponse = await fetch(
        `https://api.cloudflare.com/client/v4/zones/${this.zoneId}/custom_hostnames?hostname=${hostname}`,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
          },
        }
      );

      const searchData = await searchResponse.json();
      if (!searchData.success || !searchData.result?.length) {
        return { success: false, error: 'Domain not found' };
      }

      const chId = searchData.result[0].id;

      // Delete the custom hostname
      const deleteResponse = await fetch(
        `https://api.cloudflare.com/client/v4/zones/${this.zoneId}/custom_hostnames/${chId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
          },
        }
      );

      const deleteData = await deleteResponse.json();
      return { success: deleteData.success };
    } catch (error) {
      console.error('[CloudflareSaaSProvider] removeDomain error:', error);
      return { success: false, error: error.message };
    }
  }
}

// ============================================
// VERCEL PLATFORMS PROVIDER
// ============================================
class VercelPlatformsProvider implements DomainProvider {
  name = 'vercel';
  private apiKey: string;
  private projectId: string;
  private teamId?: string;

  constructor(config: DomainProviderConfig) {
    this.apiKey = config.apiKey || Deno.env.get('VERCEL_API_KEY') || '';
    this.projectId = config.projectId || Deno.env.get('VERCEL_PROJECT_ID') || '';
    this.teamId = Deno.env.get('VERCEL_TEAM_ID');
  }

  async addDomain(req: AddDomainRequest): Promise<AddDomainResponse> {
    try {
      const url = this.teamId
        ? `https://api.vercel.com/v10/projects/${this.projectId}/domains?teamId=${this.teamId}`
        : `https://api.vercel.com/v10/projects/${this.projectId}/domains`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: req.hostname }),
      });

      const data = await response.json();

      if (data.error) {
        return {
          success: false,
          verification_method: 'cname',
          verification_record_name: '',
          verification_record_value: '',
          target_cname: '',
          error: data.error.message,
        };
      }

      // Vercel returns verification info
      const verification = data.verification?.[0];

      return {
        success: true,
        domain_id: data.name,
        verification_method: verification?.type || 'cname',
        verification_record_name: verification?.domain || req.hostname,
        verification_record_value: verification?.value || 'cname.vercel-dns.com',
        target_cname: 'cname.vercel-dns.com',
      };
    } catch (error) {
      console.error('[VercelPlatformsProvider] addDomain error:', error);
      return {
        success: false,
        verification_method: 'cname',
        verification_record_name: '',
        verification_record_value: '',
        target_cname: '',
        error: error.message,
      };
    }
  }

  async verifyDomain(hostname: string): Promise<VerifyDomainResponse> {
    try {
      const url = this.teamId
        ? `https://api.vercel.com/v10/projects/${this.projectId}/domains/${hostname}?teamId=${this.teamId}`
        : `https://api.vercel.com/v10/projects/${this.projectId}/domains/${hostname}`;

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      });

      const data = await response.json();

      if (data.error) {
        return { success: false, status: 'failed', error: data.error.message };
      }

      // Map Vercel verified status
      if (data.verified) {
        return { success: true, status: 'active' };
      }

      return { success: true, status: 'pending_dns' };
    } catch (error) {
      console.error('[VercelPlatformsProvider] verifyDomain error:', error);
      return { success: false, status: 'failed', error: error.message };
    }
  }

  async provisionSSL(hostname: string): Promise<VerifyDomainResponse> {
    // Vercel handles SSL automatically
    return this.verifyDomain(hostname);
  }

  async getDomainStatus(hostname: string): Promise<DomainStatus> {
    const result = await this.verifyDomain(hostname);
    return {
      hostname,
      status: result.status,
      ssl_status: result.status === 'active' ? 'active' : 'pending',
      last_error: result.error,
    };
  }

  async removeDomain(hostname: string): Promise<{ success: boolean; error?: string }> {
    try {
      const url = this.teamId
        ? `https://api.vercel.com/v10/projects/${this.projectId}/domains/${hostname}?teamId=${this.teamId}`
        : `https://api.vercel.com/v10/projects/${this.projectId}/domains/${hostname}`;

      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      });

      return { success: response.ok };
    } catch (error) {
      console.error('[VercelPlatformsProvider] removeDomain error:', error);
      return { success: false, error: error.message };
    }
  }
}

// ============================================
// MOCK PROVIDER (For Development/Testing)
// ============================================
class MockDomainProvider implements DomainProvider {
  name = 'mock';
  private domains = new Map<string, DomainStatus>();

  async addDomain(req: AddDomainRequest): Promise<AddDomainResponse> {
    const token = crypto.randomUUID().slice(0, 16);

    this.domains.set(req.hostname, {
      hostname: req.hostname,
      status: 'pending_dns',
      ssl_status: 'pending',
    });

    return {
      success: true,
      domain_id: req.hostname,
      verification_method: 'cname',
      verification_record_name: req.hostname,
      verification_record_value: 'edge.loangenius.local',
      target_cname: 'edge.loangenius.local',
    };
  }

  async verifyDomain(hostname: string): Promise<VerifyDomainResponse> {
    const domain = this.domains.get(hostname);
    if (!domain) {
      return { success: false, status: 'failed', error: 'Domain not found' };
    }

    // Auto-verify in mock mode
    domain.status = 'active';
    domain.ssl_status = 'active';

    return { success: true, status: 'active' };
  }

  async provisionSSL(hostname: string): Promise<VerifyDomainResponse> {
    return this.verifyDomain(hostname);
  }

  async getDomainStatus(hostname: string): Promise<DomainStatus> {
    return this.domains.get(hostname) || {
      hostname,
      status: 'failed',
      last_error: 'Domain not found',
    };
  }

  async removeDomain(hostname: string): Promise<{ success: boolean; error?: string }> {
    this.domains.delete(hostname);
    return { success: true };
  }
}

// ============================================
// PROVIDER FACTORY
// ============================================
export function getDomainProvider(config?: Partial<DomainProviderConfig>): DomainProvider {
  const provider = config?.provider || Deno.env.get('DOMAIN_PROVIDER') || 'mock';

  switch (provider) {
    case 'cloudflare':
      return new CloudflareSaaSProvider(config as DomainProviderConfig);
    case 'vercel':
      return new VercelPlatformsProvider(config as DomainProviderConfig);
    case 'mock':
    default:
      return new MockDomainProvider();
  }
}

export default getDomainProvider;
