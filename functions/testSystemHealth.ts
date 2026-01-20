/**
 * Test System Health - Simple health check endpoint
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const checks = {};

    // Check auth
    try {
      const user = await base44.auth.me();
      checks.auth = { status: 'healthy', user_email: user?.email };
    } catch (e) {
      checks.auth = { status: 'error', error: e.message };
    }

    // Check database connectivity
    try {
      const orgs = await base44.asServiceRole.entities.Organization.filter({});
      checks.database = { status: 'healthy', org_count: orgs.length };
    } catch (e) {
      checks.database = { status: 'error', error: e.message };
    }

    // Check encryption key
    const encKey = Deno.env.get('INTEGRATION_ENCRYPTION_KEY');
    checks.encryption_key = encKey ? 'configured' : 'missing';

    // Overall status
    const allHealthy = checks.auth?.status === 'healthy' && 
                       checks.database?.status === 'healthy' && 
                       checks.encryption_key === 'configured';

    return Response.json({
      status: allHealthy ? 'healthy' : 'degraded',
      checks,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return Response.json({
      status: 'error',
      error: error.message,
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
});