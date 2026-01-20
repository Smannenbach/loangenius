/**
 * TenantProvider - Multi-tenant context for LoanGenius
 *
 * This provider resolves tenant context from the current hostname and provides:
 * - tenant_id and org_id for data scoping
 * - Branding configuration
 * - Feature flags
 * - User role and permissions
 *
 * USAGE:
 * 1. Wrap your app with <TenantProvider>
 * 2. Use useTenant() hook to access context
 * 3. Use useTenantFeature('feature_name') to check feature availability
 */

import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { PageLoader } from '@/components/ui/skeleton-cards';

// Default branding (LoanGenius defaults)
const DEFAULT_BRANDING = {
  app_name: 'LoanGenius',
  company_name: 'LoanGenius',
  primary_color: '#2563eb',
  secondary_color: '#1e40af',
  accent_color: '#0891b2',
  background_color: '#f9fafb',
  surface_color: '#ffffff',
  text_color: '#111827',
  text_muted_color: '#6b7280',
  font_family: 'Inter',
  button_style: 'rounded',
  border_radius: 'md',
  logo_light_url: null,
  logo_dark_url: null,
  favicon_url: null,
  support_email: 'support@loangenius.ai',
  support_phone: null,
};

// Default feature flags
const DEFAULT_FEATURES = {
  borrower_portal: true,
  white_label: false,
  custom_domains: false,
  docusign: false,
  ai_assistant: false,
  ai_lender_match: false,
  api_access: false,
  advanced_reporting: false,
  bulk_operations: false,
  webhooks: false,
  google_sheets_sync: true,
  ghl_integration: false,
};

// Context
const TenantContext = createContext(null);

/**
 * TenantProvider component
 */
export function TenantProvider({ children }) {
  const [isReady, setIsReady] = useState(false);

  // Resolve tenant context from backend
  const {
    data: tenantContext,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['tenantContext', window.location.hostname],
    queryFn: async () => {
      try {
        // Call backend resolver
        const result = await base44.functions.invoke('resolveTenantContext', {
          hostname: window.location.hostname,
        });

        if (result.ok) {
          return result;
        }

        // If resolver fails, fall back to legacy org resolution
        console.warn('[TenantProvider] Tenant resolution failed, using legacy org resolver');
        return await fallbackToLegacyOrg();
      } catch (err) {
        console.warn('[TenantProvider] Error resolving tenant, using fallback:', err);
        return await fallbackToLegacyOrg();
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });

  // Fallback to legacy org resolution (for backwards compatibility)
  const fallbackToLegacyOrg = async () => {
    try {
      const user = await base44.auth.me();
      if (!user?.email) {
        throw new Error('User not authenticated');
      }

      const memberships = await base44.entities.OrgMembership.filter({
        user_id: user.email,
      });

      if (memberships.length === 0) {
        throw new Error('No organization membership');
      }

      const primary = memberships.find((m) => m.is_primary) || memberships[0];

      // Load branding
      const branding = await base44.entities.PortalBranding.filter({
        org_id: primary.org_id,
      });

      return {
        ok: true,
        tenant_id: primary.org_id,
        org_id: primary.org_id,
        user_id: user.id,
        user_email: user.email,
        role: primary.role || 'user',
        permissions: [],
        resolved_by: 'membership',
        hostname: window.location.hostname,
        branding: branding?.[0] || null,
        feature_flags: DEFAULT_FEATURES,
      };
    } catch (err) {
      console.error('[TenantProvider] Fallback failed:', err);
      return {
        ok: false,
        error: err.message,
        tenant_id: '',
        org_id: '',
        user_id: '',
        user_email: '',
        role: '',
        permissions: [],
        resolved_by: 'none',
        branding: null,
        feature_flags: DEFAULT_FEATURES,
      };
    }
  };

  // Apply branding CSS variables when tenant context loads
  useEffect(() => {
    if (tenantContext?.branding) {
      applyBrandingCSS(tenantContext.branding);
    }
    if (tenantContext?.ok) {
      setIsReady(true);
    }
  }, [tenantContext]);

  // Memoized context value
  const contextValue = useMemo(() => {
    if (!tenantContext) {
      return {
        isLoading: true,
        isReady: false,
        error: null,
        tenant_id: '',
        org_id: '',
        user_id: '',
        user_email: '',
        role: '',
        permissions: [],
        branding: DEFAULT_BRANDING,
        features: DEFAULT_FEATURES,
        refetch,
        hasFeature: () => false,
        hasPermission: () => false,
        isWhiteLabel: false,
      };
    }

    const branding = { ...DEFAULT_BRANDING, ...tenantContext.branding };
    const features = { ...DEFAULT_FEATURES, ...tenantContext.feature_flags };

    return {
      isLoading,
      isReady,
      error: tenantContext.ok ? null : tenantContext.error,
      tenant_id: tenantContext.tenant_id,
      org_id: tenantContext.org_id,
      user_id: tenantContext.user_id,
      user_email: tenantContext.user_email,
      role: tenantContext.role,
      permissions: tenantContext.permissions || [],
      branding,
      features,
      refetch,
      hasFeature: (featureKey) => features[featureKey] === true,
      hasPermission: (permission) => {
        if (!tenantContext.permissions) return false;
        if (tenantContext.permissions.includes('*')) return true;
        return tenantContext.permissions.includes(permission);
      },
      isWhiteLabel: features.white_label === true,
    };
  }, [tenantContext, isLoading, isReady, refetch]);

  // Show loading state
  if (isLoading && !isReady) {
    return <PageLoader message="Loading workspace..." />;
  }

  return (
    <TenantContext.Provider value={contextValue}>
      {children}
    </TenantContext.Provider>
  );
}

/**
 * Apply branding as CSS custom properties
 */
function applyBrandingCSS(branding) {
  if (!branding) return;

  const root = document.documentElement;

  // Colors
  if (branding.primary_color) {
    root.style.setProperty('--color-primary', branding.primary_color);
    root.style.setProperty('--primary', branding.primary_color);
  }
  if (branding.secondary_color) {
    root.style.setProperty('--color-secondary', branding.secondary_color);
  }
  if (branding.accent_color) {
    root.style.setProperty('--color-accent', branding.accent_color);
    root.style.setProperty('--accent', branding.accent_color);
  }
  if (branding.background_color) {
    root.style.setProperty('--color-background', branding.background_color);
    root.style.setProperty('--background', branding.background_color);
  }
  if (branding.surface_color) {
    root.style.setProperty('--color-surface', branding.surface_color);
    root.style.setProperty('--card', branding.surface_color);
  }
  if (branding.text_color) {
    root.style.setProperty('--color-text', branding.text_color);
    root.style.setProperty('--foreground', branding.text_color);
  }
  if (branding.text_muted_color) {
    root.style.setProperty('--color-text-muted', branding.text_muted_color);
    root.style.setProperty('--muted-foreground', branding.text_muted_color);
  }

  // Typography
  if (branding.font_family) {
    root.style.setProperty('--font-family', branding.font_family);
    root.style.setProperty('--font-sans', branding.font_family);
  }

  // Border radius
  const radiusMap = {
    none: '0',
    sm: '0.125rem',
    md: '0.375rem',
    lg: '0.5rem',
    full: '9999px',
  };
  if (branding.border_radius) {
    root.style.setProperty('--radius', radiusMap[branding.border_radius] || '0.375rem');
  }

  // Favicon
  if (branding.favicon_url) {
    const favicon = document.querySelector("link[rel='icon']");
    if (favicon) {
      favicon.href = branding.favicon_url;
    }
  }

  // Document title (app name)
  if (branding.app_name && branding.app_name !== 'LoanGenius') {
    // Update title if white-labeled
    document.title = document.title.replace('LoanGenius', branding.app_name);
  }
}

/**
 * Hook to access tenant context
 */
export function useTenant() {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
}

/**
 * Hook to check if a feature is enabled
 */
export function useTenantFeature(featureKey) {
  const { hasFeature } = useTenant();
  return hasFeature(featureKey);
}

/**
 * Hook to check if user has a permission
 */
export function useTenantPermission(permission) {
  const { hasPermission } = useTenant();
  return hasPermission(permission);
}

/**
 * Hook to get branding values
 */
export function useBrandingValues() {
  const { branding, isWhiteLabel } = useTenant();
  return { branding, isWhiteLabel };
}

/**
 * Hook to get tenant-scoped IDs for queries
 */
export function useTenantIds() {
  const { tenant_id, org_id } = useTenant();
  return { tenant_id, org_id };
}

/**
 * HOC to require tenant context
 */
export function withTenant(Component) {
  return function TenantWrapped(props) {
    const tenant = useTenant();

    if (!tenant.isReady) {
      return <PageLoader message="Loading workspace..." />;
    }

    if (tenant.error) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center p-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Unable to Load Workspace
            </h2>
            <p className="text-gray-600 mb-4">{tenant.error}</p>
            <button
              onClick={() => tenant.refetch()}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Retry
            </button>
          </div>
        </div>
      );
    }

    return <Component {...props} tenant={tenant} />;
  };
}

/**
 * Component to conditionally render based on feature flag
 */
export function FeatureGate({ feature, children, fallback = null }) {
  const hasFeature = useTenantFeature(feature);
  return hasFeature ? children : fallback;
}

/**
 * Component to conditionally render based on permission
 */
export function PermissionGate({ permission, children, fallback = null }) {
  const hasPermission = useTenantPermission(permission);
  return hasPermission ? children : fallback;
}

export default TenantProvider;
