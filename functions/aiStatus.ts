/**
 * AI Status - Check AI provider status
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const memberships = await base44.entities.OrgMembership.filter({ user_id: user.email });
    const orgId = memberships.length > 0 ? memberships[0].org_id : null;

    // Check configured AI providers
    const providers = orgId ? await base44.entities.AIProvider.filter({ org_id: orgId }) : [];
    
    const status = {
      platform_ai: true, // Base44 built-in AI is always available
      configured_providers: providers.map(p => ({
        name: p.provider_name,
        model: p.model_name,
        status: p.status,
        is_default: p.is_default,
      })),
      default_provider: providers.find(p => p.is_default)?.provider_name || 'platform',
    };

    return Response.json(status);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});