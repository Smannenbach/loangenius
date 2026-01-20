import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

/**
 * useOrgId - SINGLE SOURCE OF TRUTH for org resolution
 * Uses backend resolveOrgId function (never queries OrgMembership directly)
 */
export function useOrgId() {
  const queryClient = useQueryClient();

  // Get current user
  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    staleTime: 10 * 60 * 1000,
    retry: 1
  });

  // Resolve org via backend function
  const { 
    data: orgData, 
    isLoading: orgLoading,
    refetch: refetchOrg
  } = useQuery({
    queryKey: ['resolveOrgId', user?.email],
    queryFn: async () => {
      const response = await base44.functions.invoke('resolveOrgId', { auto_create: true });
      return response.data;
    },
    enabled: !!user?.email,
    staleTime: 5 * 60 * 1000,
    retry: 1
  });

  const orgId = orgData?.org_id || null;
  const userRole = orgData?.membership_role || 'user';
  const hasOrg = orgData?.has_org || false;
  const isLoading = userLoading || orgLoading;
  const isReady = !!orgId && !isLoading && hasOrg;

  return {
    orgId,
    user,
    userRole,
    hasOrg,
    isLoading,
    isReady,
    orgName: orgData?.org_name,
    refetchOrg,
  };
}

/**
 * useOrgScopedQuery - Query entities scoped to current org
 */
export function useOrgScopedQuery(entityName, additionalFilters = {}, sortBy = '-created_date', limit = 1000) {
  const { orgId, isReady } = useOrgId();

  return useQuery({
    queryKey: [entityName, 'org', orgId, JSON.stringify(additionalFilters), sortBy],
    queryFn: async () => {
      if (!orgId) {
        console.warn(`useOrgScopedQuery(${entityName}): No orgId, returning []`);
        return [];
      }
      
      const filters = { org_id: orgId, ...additionalFilters };
      Object.keys(filters).forEach(key => {
        if (key !== 'org_id' && (filters[key] === undefined || filters[key] === null)) {
          delete filters[key];
        }
      });

      const results = await base44.entities[entityName].filter(filters, sortBy, limit);
      return results || [];
    },
    enabled: isReady && !!orgId,
    staleTime: 30000,
    retry: 2,
  });
}

/**
 * useOrgScopedMutation - Create org-scoped entities
 */
export function useOrgScopedMutation(entityName, options = {}) {
  const { orgId } = useOrgId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data) => {
      if (!orgId) throw new Error('No organization context');
      const dataWithOrg = { ...data, org_id: orgId };
      return base44.entities[entityName].create(dataWithOrg);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [entityName, 'org', orgId] });
      queryClient.invalidateQueries({ queryKey: [entityName] });
      options.onSuccess?.(data);
    },
    onError: options.onError
  });
}

/**
 * useOrgScopedUpdate - Update org-scoped entities (IDOR-safe)
 */
export function useOrgScopedUpdate(entityName, options = {}) {
  const { orgId } = useOrgId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }) => {
      if (!orgId) throw new Error('No organization context');
      
      // SECURITY: Verify record belongs to current org (IDOR prevention)
      const records = await base44.entities[entityName].filter({ id });
      if (records.length === 0) throw new Error('Record not found');
      
      const record = records[0];
      if (record.org_id && record.org_id !== orgId) {
        console.error(`IDOR blocked: org ${orgId} attempted update on org ${record.org_id}`);
        throw new Error('Access denied');
      }
      
      // Never allow changing org_id or system fields
      const { org_id: _, id: __, created_by, created_date, ...safeData } = data;
      return base44.entities[entityName].update(id, safeData);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [entityName, 'org', orgId] });
      queryClient.invalidateQueries({ queryKey: [entityName] });
      options.onSuccess?.(data);
    },
    onError: options.onError
  });
}

/**
 * useOrgScopedDelete - Soft-delete org-scoped entities (IDOR-safe)
 */
export function useOrgScopedDelete(entityName, options = {}) {
  const { orgId } = useOrgId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id) => {
      if (!orgId) throw new Error('No organization context');
      
      // SECURITY: Verify record belongs to current org (IDOR prevention)
      const records = await base44.entities[entityName].filter({ id });
      if (records.length === 0) throw new Error('Record not found');
      
      const record = records[0];
      if (record.org_id && record.org_id !== orgId) {
        console.error(`IDOR blocked: org ${orgId} attempted delete on org ${record.org_id}`);
        throw new Error('Access denied');
      }
      
      return base44.entities[entityName].update(id, { is_deleted: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [entityName, 'org', orgId] });
      queryClient.invalidateQueries({ queryKey: [entityName] });
      options.onSuccess?.();
    },
    onError: options.onError
  });
}

export default useOrgId;