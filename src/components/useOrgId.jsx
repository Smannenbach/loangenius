import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

/**
 * Canonical organization resolver hook
 * Used across all pages to ensure consistent org_id handling
 * 
 * Returns:
 * - orgId: The user's organization ID (null if not found)
 * - org: The full organization object
 * - membership: The user's membership record
 * - memberships: All memberships for the user
 * - userRole: The user's role in the org
 * - isLoading: Loading state
 * - error: Any error
 * - ensureOrg: Function to create org if needed
 */
export function useOrgId() {
  const queryClient = useQueryClient();

  // Get current user - cached globally
  const { data: user, isLoading: userLoading, error: userError } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    staleTime: 5 * 60 * 1000, // 5 minutes
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
    staleTime: 5 * 60 * 1000, // 5 minutes
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
    staleTime: 10 * 60 * 1000 // 10 minutes
  });

  // Mutation to ensure org exists (creates if needed)
  const ensureOrgMutation = useMutation({
    mutationFn: async () => {
      // Try to seed org and users
      try {
        await base44.functions.invoke('seedOrgAndUsers', {});
      } catch (e) {
        console.log('seedOrgAndUsers not available or failed:', e.message);
        // Create a default org manually as fallback
        const newOrg = await base44.entities.Organization.create({
          name: `${user?.full_name || 'My'} Organization`,
          slug: `org-${Date.now()}`,
          subscription_status: 'TRIAL'
        });
        
        await base44.entities.OrgMembership.create({
          org_id: newOrg.id,
          user_id: user?.email,
          role: 'admin',
          is_primary: true
        });
      }
    },
    onSuccess: () => {
      // Refetch memberships after creating
      queryClient.invalidateQueries({ queryKey: ['orgMemberships'] });
      queryClient.invalidateQueries({ queryKey: ['organization'] });
      refetchMemberships();
    }
  });

  const isLoading = userLoading || membershipLoading || orgLoading;
  const error = userError || membershipError;

  return {
    // Core values
    orgId,
    org,
    membership: primaryMembership,
    memberships,
    user,
    userRole: primaryMembership?.role || user?.role || 'user',
    
    // Status
    isLoading,
    error,
    hasOrg: !!orgId,
    
    // Actions
    ensureOrg: ensureOrgMutation.mutate,
    isEnsuringOrg: ensureOrgMutation.isPending,
    refetchMemberships
  };
}

/**
 * Hook for org-scoped entity queries
 * Automatically adds org_id filter and handles loading states
 */
export function useOrgScopedQuery(entityName, additionalFilters = {}, options = {}) {
  const { orgId, isLoading: orgLoading, hasOrg } = useOrgId();

  return useQuery({
    queryKey: [entityName, 'org', orgId, additionalFilters],
    queryFn: async () => {
      if (!orgId) return [];
      
      const filters = {
        org_id: orgId,
        ...additionalFilters
      };
      
      // Remove undefined filters
      Object.keys(filters).forEach(key => {
        if (filters[key] === undefined) delete filters[key];
      });

      const results = await base44.entities[entityName].filter(filters);
      return results || [];
    },
    enabled: !!orgId && !orgLoading,
    staleTime: options.staleTime || 30000, // 30 seconds default
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
      if (!orgId) throw new Error('No organization found');
      
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