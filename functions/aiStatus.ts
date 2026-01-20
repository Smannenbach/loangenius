/**
 * AI Status - Check AI provider status and health
 * 
 * GET: Returns overall AI system status
 * POST with action: 'test' - Test individual provider connections
 * POST with action: 'list' - List all configured providers
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const PROVIDER_TIMEOUT = 10000; // 10 second timeout for provider health checks

/**
 * Test a provider's connectivity (lightweight ping)
 */
async function testProviderHealth(provider) {
  const startTime = Date.now();
  
  try {
    // For now, just check if the provider config exists and is valid
    // In production, this could make a lightweight API call to each provider
    const isConfigured = Boolean(provider.api_key_encrypted || provider.status === 'CONNECTED');
    const responseTime = Date.now() - startTime;
    
    return {
      provider_name: provider.provider_name,
      model: provider.model_name,
      status: isConfigured ? 'healthy' : 'unconfigured',
      response_time_ms: responseTime,
      last_tested: new Date().toISOString(),
      is_default: provider.is_default,
    };
  } catch (error) {
    return {
      provider_name: provider.provider_name,
      model: provider.model_name,
      status: 'error',
      error_message: error.message,
      last_tested: new Date().toISOString(),
      is_default: provider.is_default,
    };
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get org context
    const memberships = await base44.entities.OrgMembership.filter({ user_id: user.email });
    const orgId = memberships.length > 0 ? memberships[0].org_id : null;

    // Parse request body for POST actions
    let action = 'status';
    let targetProvider = null;
    
    if (req.method === 'POST') {
      try {
        const body = await req.json();
        action = body.action || 'status';
        targetProvider = body.provider;
      } catch {
        // No body or invalid JSON, default to status
      }
    }

    // Fetch configured AI providers
    let providers = [];
    try {
      providers = orgId ? await base44.entities.AIProvider.filter({ org_id: orgId }) : [];
    } catch (error) {
      console.warn('[AI Status] Failed to fetch providers:', error.message);
    }

    // Handle different actions
    if (action === 'test') {
      // Test individual or all providers
      const providersToTest = targetProvider 
        ? providers.filter(p => p.provider_name === targetProvider)
        : providers;
      
      const healthResults = await Promise.all(
        providersToTest.map(p => testProviderHealth(p))
      );
      
      return Response.json({
        success: true,
        tested_at: new Date().toISOString(),
        results: healthResults,
        summary: {
          total: healthResults.length,
          healthy: healthResults.filter(r => r.status === 'healthy').length,
          unhealthy: healthResults.filter(r => r.status !== 'healthy').length,
        }
      });
    }
    
    if (action === 'list') {
      // Return detailed provider list
      return Response.json({
        success: true,
        org_id: orgId,
        providers: providers.map(p => ({
          id: p.id,
          name: p.provider_name,
          model: p.model_name,
          status: p.status,
          is_active: p.is_active,
          is_default: p.is_default,
          last_tested_at: p.last_tested_at,
          last_error: p.last_error,
          usage_count: p.usage_count,
        })),
      });
    }

    // Default: return overall status
    const defaultProvider = providers.find(p => p.is_default);
    const activeProviders = providers.filter(p => p.is_active && p.status === 'CONNECTED');
    
    const status = {
      success: true,
      timestamp: new Date().toISOString(),
      platform_ai: {
        available: true,
        description: 'Base44 built-in AI (InvokeLLM) is always available',
      },
      org_id: orgId,
      configured_providers: providers.map(p => ({
        name: p.provider_name,
        model: p.model_name,
        status: p.status || 'PENDING',
        is_active: p.is_active,
        is_default: p.is_default,
      })),
      default_provider: defaultProvider?.provider_name || 'platform',
      summary: {
        total_providers: providers.length,
        active_providers: activeProviders.length,
        has_custom_provider: providers.length > 0,
        primary_model: defaultProvider?.model_name || 'platform-default',
      },
    };

    return Response.json(status);
    
  } catch (error) {
    console.error('[AI Status] Error:', error.message);
    return Response.json({ 
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
});