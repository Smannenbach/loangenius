/**
 * Test AI Provider Connection
 * Tests if an AI provider is properly configured and responding
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Resolve org membership and verify admin role
    const memberships = await base44.entities.OrgMembership.filter({ user_id: user.email });
    if (memberships.length === 0) {
      return Response.json({ error: 'User not part of any organization' }, { status: 403 });
    }
    const orgId = memberships[0].org_id;
    const userRole = memberships[0].role_id || memberships[0].role || 'user';
    
    if (!['admin', 'owner', 'super_admin'].includes(userRole)) {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { provider_id } = await req.json();

    if (!provider_id) {
      return Response.json({ error: 'Missing provider_id' }, { status: 400 });
    }

    // Get the provider config - verify it belongs to this org
    let provider;
    try {
      provider = await base44.asServiceRole.entities.AIProvider.get(provider_id);
    } catch (e) {
      return Response.json({ error: 'Provider not found' }, { status: 404 });
    }
    
    if (!provider) {
      return Response.json({ error: 'Provider not found' }, { status: 404 });
    }
    
    // Verify org scope
    if (provider.org_id && provider.org_id !== orgId) {
      return Response.json({ error: 'Provider not found' }, { status: 404 });
    }

    // Test the provider based on type
    let testResult = { success: false, message: '', latency: 0 };
    const startTime = Date.now();

    try {
      if (provider.provider_name === 'OpenAI' || provider.provider_name === 'openai') {
        testResult = await testOpenAI(provider);
      } else if (provider.provider_name === 'Anthropic' || provider.provider_name === 'anthropic') {
        testResult = await testAnthropic(provider);
      } else if (provider.provider_name === 'Google' || provider.provider_name === 'google') {
        testResult = await testGoogle(provider);
      } else {
        // Generic test - just mark as connected if we have an API key
        testResult = {
          success: !!provider.api_key_encrypted,
          message: provider.api_key_encrypted ? 'API key configured' : 'No API key configured'
        };
      }
    } catch (testError) {
      testResult = {
        success: false,
        message: testError.message || 'Test failed'
      };
    }

    testResult.latency = Date.now() - startTime;

    // Update provider status and increment usage_count on success
    const updateData = {
      status: testResult.success ? 'CONNECTED' : 'ERROR',
      last_tested_at: new Date().toISOString(),
      last_error: testResult.success ? null : testResult.message
    };
    
    if (testResult.success) {
      updateData.usage_count = (provider.usage_count || 0) + 1;
    }
    
    await base44.asServiceRole.entities.AIProvider.update(provider_id, updateData);

    return Response.json({
      success: testResult.success,
      message: testResult.message,
      latency_ms: testResult.latency,
      status: testResult.success ? 'CONNECTED' : 'ERROR'
    });
  } catch (error) {
    console.error('Error in testAIProvider:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function testOpenAI(provider) {
  const apiKey = Deno.env.get('OpenAI_API_Key');
  
  if (!apiKey) {
    return { success: false, message: 'OpenAI API key not configured in environment' };
  }

  try {
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: { 'Authorization': `Bearer ${apiKey}` }
    });

    if (response.ok) {
      return { success: true, message: 'OpenAI connection successful' };
    } else {
      const error = await response.json();
      return { success: false, message: error.error?.message || 'OpenAI API error' };
    }
  } catch (e) {
    return { success: false, message: e.message };
  }
}

async function testAnthropic(provider) {
  const apiKey = Deno.env.get('Anthropic_API_Key');
  
  if (!apiKey) {
    return { success: false, message: 'Anthropic API key not configured in environment' };
  }

  try {
    // Anthropic doesn't have a simple test endpoint, so we'll do a minimal completion
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: provider.model_name || 'claude-3-haiku-20240307',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Hi' }]
      })
    });

    if (response.ok) {
      return { success: true, message: 'Anthropic connection successful' };
    } else {
      const error = await response.json();
      return { success: false, message: error.error?.message || 'Anthropic API error' };
    }
  } catch (e) {
    return { success: false, message: e.message };
  }
}

async function testGoogle(provider) {
  const apiKey = Deno.env.get('Google_Gemini_API_Key');
  
  if (!apiKey) {
    return { success: false, message: 'Google Gemini API key not configured in environment' };
  }

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`);

    if (response.ok) {
      return { success: true, message: 'Google Gemini connection successful' };
    } else {
      const error = await response.json();
      return { success: false, message: error.error?.message || 'Google API error' };
    }
  } catch (e) {
    return { success: false, message: e.message };
  }
}