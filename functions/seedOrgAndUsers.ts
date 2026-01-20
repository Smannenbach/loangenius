/**
 * seedOrgAndUsers - Delegates to resolveOrgId for consistency
 * This function is kept for backwards compatibility
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Simply delegate to resolveOrgId with auto_create=true
    const response = await base44.functions.invoke('resolveOrgId', { auto_create: true });
    return Response.json(response.data);
  } catch (error) {
    console.error('seedOrgAndUsers error:', error);
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }
});