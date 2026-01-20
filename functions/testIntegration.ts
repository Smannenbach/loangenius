/**
 * Test Integration Connection
 * Performs a real connectivity test for configured integrations
 * Updates status to healthy/unhealthy/needs_reconnect
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { decryptJson } from './_shared/crypto.js';
import { resolveOrgId, isOrgAdmin } from './_shared/org.js';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Resolve org and check admin
    const { orgId, membership } = await resolveOrgId(base44, user);
    
    if (!isOrgAdmin(membership)) {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { integration_key } = await req.json();

    if (!integration_key) {
      return Response.json({ error: 'Missing integration_key' }, { status: 400 });
    }

    // Load integration config
    const configs = await base44.asServiceRole.entities.IntegrationConfig.filter({
      org_id: orgId,
      integration_name: integration_key
    });

    if (configs.length === 0) {
      return Response.json({ error: 'Integration not configured' }, { status: 404 });
    }

    const config = configs[0];
    const now = new Date().toISOString();

    // Check if we have encrypted credentials
    if (!config.iv_b64 || !config.ciphertext_b64) {
      await updateConfigStatus(base44, config.id, {
        status: 'needs_reconnect',
        last_tested_at: now,
        last_error: 'No credentials stored'
      });
      return Response.json({
        ok: false,
        status: 'needs_reconnect',
        message: 'Integration needs to be reconnected - no credentials found',
        last_tested_at: now
      });
    }

    // Decrypt credentials
    let credentials;
    try {
      credentials = await decryptJson({
        iv_b64: config.iv_b64,
        ciphertext_b64: config.ciphertext_b64
      });
    } catch (decryptError) {
      await updateConfigStatus(base44, config.id, {
        status: 'needs_reconnect',
        last_tested_at: now,
        last_error: 'Failed to decrypt credentials'
      });
      return Response.json({
        ok: false,
        status: 'needs_reconnect',
        message: 'Credentials corrupted - please reconnect',
        last_tested_at: now
      });
    }

    // Perform integration-specific test
    const testResult = await performIntegrationTest(integration_key, credentials);

    // Update config with test results
    await updateConfigStatus(base44, config.id, {
      status: testResult.status,
      last_tested_at: now,
      last_error: testResult.error || null
    });

    return Response.json({
      ok: testResult.ok,
      status: testResult.status,
      message: testResult.message,
      last_tested_at: now
    });
  } catch (error) {
    console.error('Error in testIntegration:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function updateConfigStatus(base44, configId, data) {
  await base44.asServiceRole.entities.IntegrationConfig.update(configId, {
    ...data,
    updated_at: new Date().toISOString()
  });
}

async function performIntegrationTest(integrationKey, credentials) {
  const key = integrationKey.toLowerCase().replace(/_/g, '');
  
  try {
    // Google Sheets test
    if (key === 'googlesheets') {
      return await testGoogleAPI(credentials, 'sheets');
    }
    
    // Google Drive test
    if (key === 'googledrive') {
      return await testGoogleAPI(credentials, 'drive');
    }
    
    // Google Docs test
    if (key === 'googledocs') {
      return await testGoogleAPI(credentials, 'docs');
    }
    
    // Gmail test
    if (key === 'gmail') {
      return await testGoogleAPI(credentials, 'gmail');
    }
    
    // Claude/Anthropic test
    if (key === 'claude' || key === 'anthropic') {
      return await testAnthropicAPI(credentials);
    }
    
    // SendGrid test
    if (key === 'sendgrid') {
      return await testSendGridAPI(credentials);
    }
    
    // Twilio test
    if (key === 'twilio') {
      return await testTwilioAPI(credentials);
    }
    
    // Generic API key test - just verify non-empty
    if (credentials.api_key) {
      return {
        ok: true,
        status: 'healthy',
        message: 'API key configured'
      };
    }
    
    // OAuth token present
    if (credentials.oauth_token || credentials.access_token) {
      return {
        ok: true,
        status: 'healthy',
        message: 'OAuth token configured'
      };
    }
    
    return {
      ok: false,
      status: 'unhealthy',
      message: 'No valid credentials found',
      error: 'No valid credentials found'
    };
  } catch (error) {
    // Check for auth errors indicating need to reconnect
    if (error.status === 401 || error.status === 403) {
      return {
        ok: false,
        status: 'needs_reconnect',
        message: 'Authentication failed - please reconnect',
        error: error.message
      };
    }
    
    return {
      ok: false,
      status: 'unhealthy',
      message: error.message,
      error: error.message
    };
  }
}

async function testGoogleAPI(credentials, service) {
  const token = credentials.oauth_token || credentials.access_token;
  
  if (!token) {
    return {
      ok: false,
      status: 'needs_reconnect',
      message: 'No OAuth token found',
      error: 'No OAuth token found'
    };
  }

  // Use userinfo endpoint as a lightweight test
  const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { 'Authorization': `Bearer ${token}` }
  });

  if (response.status === 401 || response.status === 403) {
    const error = new Error('Token expired or revoked');
    error.status = response.status;
    throw error;
  }

  if (!response.ok) {
    return {
      ok: false,
      status: 'unhealthy',
      message: `Google API error: ${response.status}`,
      error: `HTTP ${response.status}`
    };
  }

  const data = await response.json();
  return {
    ok: true,
    status: 'healthy',
    message: `Connected as ${data.email || 'Google account'}`
  };
}

async function testAnthropicAPI(credentials) {
  const apiKey = credentials.api_key;
  
  if (!apiKey) {
    return {
      ok: false,
      status: 'needs_reconnect',
      message: 'No API key found',
      error: 'No API key found'
    };
  }

  // Use a minimal completion request
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'claude-3-haiku-20240307',
      max_tokens: 5,
      messages: [{ role: 'user', content: 'Hi' }]
    })
  });

  if (response.status === 401) {
    const error = new Error('Invalid API key');
    error.status = 401;
    throw error;
  }

  if (response.ok) {
    return {
      ok: true,
      status: 'healthy',
      message: 'Anthropic API connected'
    };
  }

  const errorData = await response.json().catch(() => ({}));
  return {
    ok: false,
    status: 'unhealthy',
    message: errorData.error?.message || `API error: ${response.status}`,
    error: errorData.error?.message
  };
}

async function testSendGridAPI(credentials) {
  const apiKey = credentials.api_key;
  
  if (!apiKey) {
    return {
      ok: false,
      status: 'needs_reconnect',
      message: 'No API key found',
      error: 'No API key found'
    };
  }

  const response = await fetch('https://api.sendgrid.com/v3/user/profile', {
    headers: { 'Authorization': `Bearer ${apiKey}` }
  });

  if (response.status === 401 || response.status === 403) {
    const error = new Error('Invalid API key');
    error.status = response.status;
    throw error;
  }

  if (response.ok) {
    return {
      ok: true,
      status: 'healthy',
      message: 'SendGrid API connected'
    };
  }

  return {
    ok: false,
    status: 'unhealthy',
    message: `SendGrid API error: ${response.status}`,
    error: `HTTP ${response.status}`
  };
}

async function testTwilioAPI(credentials) {
  const accountSid = credentials.account_sid || Deno.env.get('TWILIO_ACCOUNT_SID');
  const authToken = credentials.auth_token || credentials.api_key || Deno.env.get('TWILIO_AUTH_TOKEN');

  if (!accountSid || !authToken) {
    return {
      ok: false,
      status: 'needs_reconnect',
      message: 'Missing Twilio credentials',
      error: 'Missing account_sid or auth_token'
    };
  }

  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}.json`, {
    headers: {
      'Authorization': 'Basic ' + btoa(`${accountSid}:${authToken}`)
    }
  });

  if (response.status === 401) {
    const error = new Error('Invalid Twilio credentials');
    error.status = 401;
    throw error;
  }

  if (response.ok) {
    return {
      ok: true,
      status: 'healthy',
      message: 'Twilio API connected'
    };
  }

  return {
    ok: false,
    status: 'unhealthy',
    message: `Twilio API error: ${response.status}`,
    error: `HTTP ${response.status}`
  };
}