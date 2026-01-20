/**
 * Test System Health
 * Simple health check endpoint for monitoring
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ 
        status: 'error', 
        message: 'Not authenticated' 
      }, { status: 401 });
    }

    // Check encryption key
    const encryptionKey = Deno.env.get('INTEGRATION_ENCRYPTION_KEY');
    const encryptionConfigured = !!encryptionKey && encryptionKey.length >= 16;

    // Basic health response
    return Response.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      checks: {
        authentication: 'ok',
        encryption_key: encryptionConfigured ? 'configured' : 'missing',
        user: user.email,
      }
    });
  } catch (error) {
    return Response.json({ 
      status: 'error', 
      message: error.message 
    }, { status: 500 });
  }
});