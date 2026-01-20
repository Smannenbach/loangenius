import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useEffect, useRef } from 'react';

/**
 * Canonical organization resolver hook
 * Used across all pages to ensure consistent org_id handling
 * 
 * USAGE: Import this hook in any page that needs org-scoped data.
 * It handles:
 * - Getting current user
 * - Looking up OrgMembership
 * - Auto-creating org if none exists (for new users)
 * - Caching to prevent duplicate queries
 * 
 * CRITICAL: This is the ONLY source of truth for orgId in the frontend.
 * Never use user.org_id, user.id, or any other fallback for org_id.
 */
export function useOrgId() {
  const queryClient = useQueryClient();
  const hasAttemptedBootstrap = useRef(false);

  // Get current user - cached globally with long stale time
  const { data: user, isLoading: userLoading, error: userError } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    staleTime: 10 * 60 * 1000, // 10 minutes - user doesn't change often
    gcTime: 30 * 60 * 1000, // Keep in cache for 30 minutes
    retry: 1
  });

  // Get user's org memberships - cached and dependent on user
  const { 
    data: memberships = [], 
    isLoading: membershipLoading, 
    error: membershipError,
    refetch: refetchMemberships
  } = useQuery({
    queryKey: ['orgMemberships', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      const results = await base44.entities.OrgMembership.filter({ 
        user_id: user.email 
      });
      return results || [];
    },
    enabled: !!user?.email,
    staleTime: 5 * 60 * 1000, // 5 minutes - check more frequently for bootstrap
    gcTime: 30 * 60 * 1000,
    retry: 1
  });

  // Get the primary membership (first one, or the one marked as default)
  const primaryMembership = memberships.find(m => m.is_primary) || memberships[0] || null;
  const orgId = primaryMembership?.org_id || null;

  // Get the organization details if we have an org_id
  const { data: org, isLoading: orgLoading } = useQuery({
    queryKey: ['organization', orgId],
    queryFn: async () => {
      if (!orgId) return null;
      try {
        const orgs = await base44.entities.Organization.filter({ id: orgId });
        return orgs[0] || null;
      } catch {
        return null;
      }
    },
    enabled: !!orgId,
    staleTime: 10 * 60 * 1000
  });

  // Mutation to ensure org exists (creates if needed via backend)
  const ensureOrgMutation = useMutation({
    mutationFn: async () => {
      // Call the canonical backend bootstrap function
      const response = await base44.functions.invoke('seedOrgAndUsers', {});
      return response.data;
    },
    onSuccess: (data) => {
      console.log('Org bootstrap complete:', data);
      // Invalidate and refetch all org-related queries
      queryClient.invalidateQueries({ queryKey: ['orgMemberships'] });
      queryClient.invalidateQueries({ queryKey: ['organization'] });
      // Also invalidate any org-scoped entity queries that may have run with null orgId
      queryClient.invalidateQueries({ queryKey: ['Lead'] });
      queryClient.invalidateQueries({ queryKey: ['Deal'] });
      queryClient.invalidateQueries({ queryKey: ['Contact'] });
      queryClient.invalidateQueries({ queryKey: ['Task'] });
      refetchMemberships();
    },
    onError: (error) => {
      console.error('Org bootstrap failed:', error);
    }
  });

  // Auto-ensure org exists for new users (only once per session)
  useEffect(() => {
    if (
      user?.email && 
      !membershipLoading && 
      memberships.length === 0 && 
      !ensureOrgMutation.isPending &&
      !hasAttemptedBootstrap.current
    ) {
      // User exists but has no org - create one
      hasAttemptedBootstrap.current = true;
      console.log('No org membership found for user, bootstrapping...');
      ensureOrgMutation.mutate();
    }
  }, [user?.email, membershipLoading, memberships.length]);

  // Reset bootstrap flag if user changes
  useEffect(() => {
    hasAttemptedBootstrap.current = false;
  }, [user?.email]);

  const isLoading = userLoading || membershipLoading || orgLoading || ensureOrgMutation.isPending;
  const error = userError || membershipError || ensureOrgMutation.error;
  const bootstrapError = ensureOrgMutation.error && memberships.length === 0;

  return {
    // Core values - NEVER use fallbacks like user.org_id or user.id
    orgId,
    org,
    membership: primaryMembership,
    memberships,
    user,
    userRole: primaryMembership?.role || user?.role || 'user',
    
    // Status
    isLoading,
    isReady: !!orgId && !isLoading,
    error: bootstrapError ? ensureOrgMutation.error : error,
    hasOrg: !!orgId,
    
    // Actions
    ensureOrg: () => {
      hasAttemptedBootstrap.current = false;
      ensureOrgMutation.mutate();
    },
    isEnsuringOrg: ensureOrgMutation.isPending,
    refetchMemberships
  };
}

/**
 * Hook for org-scoped entity queries
 * Automatically adds org_id filter and handles loading states
 * 
 * CRITICAL: NEVER falls back to list() - returns empty array if no org.
 * This ensures data isolation between organizations.
 */
export function useOrgScopedQuery(entityName, additionalFilters = {}, options = {}) {
  const { orgId, isLoading: orgLoading, isReady } = useOrgId();

  return useQuery({
    queryKey: [entityName, 'org', orgId, JSON.stringify(additionalFilters)],
    queryFn: async () => {
      // SECURITY: Never query without org_id - this is critical for data isolation
      if (!orgId) {
        console.warn(`useOrgScopedQuery(${entityName}): No orgId available, returning empty array`);
        return [];
      }
      
      const filters = {
        org_id: orgId,
        ...additionalFilters
      };
      
      // Remove undefined/null filters but NEVER remove org_id
      Object.keys(filters).forEach(key => {
        if (key !== 'org_id' && (filters[key] === undefined || filters[key] === null)) {
          delete filters[key];
        }
      });

      const results = await base44.entities[entityName].filter(filters);
      return results || [];
    },
    // Only enable when org is ready and we have an orgId
    enabled: isReady && !!orgId && !orgLoading,
    staleTime: options.staleTime || 30000, // 30 seconds default
    retry: 2,
    ...options
  });
}

/**
 * Hook for creating org-scoped entities
 * Automatically adds org_id to created records
 */
export function useOrgScopedMutation(entityName, options = {}) {
  const { orgId } = useOrgId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data) => {
      if (!orgId) throw new Error('No organization found. Please refresh the page.');
      
      const dataWithOrg = {
        ...data,
        org_id: orgId
      };
      
      return base44.entities[entityName].create(dataWithOrg);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [entityName, 'org', orgId] });
      options.onSuccess?.(data);
    },
    onError: options.onError
  });
}

export default useOrgId;