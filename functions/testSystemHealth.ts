/**
 * Test System Health - Quick health check for system status
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    const checks = [];

    // Check 1: Authentication
    checks.push({
      name: 'Authentication',
      status: user ? 'pass' : 'fail',
      message: user ? `Authenticated as ${user.email}` : 'Not authenticated',
    });

    if (!user) {
      return Response.json({ ok: false, checks });
    }

    // Check 2: Org Resolution
    try {
      const resolveResponse = await base44.functions.invoke('resolveOrgId', { auto_create: true });
      const orgData = resolveResponse.data;
      checks.push({
        name: 'Org Resolution',
        status: orgData.ok ? 'pass' : 'fail',
        message: orgData.ok ? `Org: ${orgData.org_id}` : 'No org',
      });
    } catch (e) {
      checks.push({ name: 'Org Resolution', status: 'fail', message: e.message });
    }

    // Check 3: Database Connectivity
    try {
      await base44.asServiceRole.entities.Lead.filter({});
      checks.push({ name: 'Database', status: 'pass', message: 'Connected' });
    } catch (e) {
      checks.push({ name: 'Database', status: 'fail', message: e.message });
    }

    // Check 4: Encryption Key
    const encKey = Deno.env.get('INTEGRATION_ENCRYPTION_KEY');
    checks.push({
      name: 'Encryption Key',
      status: encKey ? 'pass' : 'warn',
      message: encKey ? 'Configured' : 'Not set (integrations disabled)',
    });

    // Check 5: Email Integration
    const sendgridKey = Deno.env.get('Sendgrid_API_Key');
    checks.push({
      name: 'Email (SendGrid)',
      status: sendgridKey ? 'pass' : 'warn',
      message: sendgridKey ? 'Configured' : 'Not configured',
    });

    const passCount = checks.filter(c => c.status === 'pass').length;
    const failCount = checks.filter(c => c.status === 'fail').length;

    return Response.json({
      ok: failCount === 0,
      status: failCount === 0 ? 'healthy' : 'degraded',
      summary: `${passCount}/${checks.length} checks passed`,
      checks,
    });
  } catch (error) {
    console.error('testSystemHealth error:', error);
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }
});