import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * System Health Check - Test all critical functions
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const results = {
      timestamp: new Date().toISOString(),
      tests: [],
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        warnings: 0,
      },
    };

    // Test 1: Database connectivity
    try {
      const deals = await base44.asServiceRole.entities.Deal.list();
      results.tests.push({
        name: 'Database Connectivity',
        status: 'pass',
        message: `Connected - ${deals.length} deals found`,
      });
      results.summary.passed++;
    } catch (error) {
      results.tests.push({
        name: 'Database Connectivity',
        status: 'fail',
        message: error.message,
      });
      results.summary.failed++;
    }
    results.summary.total++;

    // Test 2: MISMO export profiles
    try {
      const profiles = await base44.asServiceRole.entities.FieldMappingProfile.list();
      if (profiles.length === 0) {
        results.tests.push({
          name: 'MISMO Export Profiles',
          status: 'warning',
          message: 'No export profiles configured',
        });
        results.summary.warnings++;
      } else {
        results.tests.push({
          name: 'MISMO Export Profiles',
          status: 'pass',
          message: `${profiles.length} profile(s) available`,
        });
        results.summary.passed++;
      }
    } catch (error) {
      results.tests.push({
        name: 'MISMO Export Profiles',
        status: 'fail',
        message: error.message,
      });
      results.summary.failed++;
    }
    results.summary.total++;

    // Test 3: Borrower creation
    try {
      const testBorrower = await base44.asServiceRole.entities.Borrower.create({
        org_id: 'test',
        first_name: 'Test',
        last_name: 'Borrower',
      });
      await base44.asServiceRole.entities.Borrower.delete(testBorrower.id);
      results.tests.push({
        name: 'Borrower CRUD',
        status: 'pass',
        message: 'Create/delete successful',
      });
      results.summary.passed++;
    } catch (error) {
      results.tests.push({
        name: 'Borrower CRUD',
        status: 'fail',
        message: error.message,
      });
      results.summary.failed++;
    }
    results.summary.total++;

    // Test 4: Google Maps API
    try {
      const mapsKey = Deno.env.get('Goolge_Maps_Platform_API_Key');
      if (!mapsKey) {
        results.tests.push({
          name: 'Google Maps API',
          status: 'warning',
          message: 'API key not configured',
        });
        results.summary.warnings++;
      } else {
        results.tests.push({
          name: 'Google Maps API',
          status: 'pass',
          message: 'API key configured',
        });
        results.summary.passed++;
      }
    } catch (error) {
      results.tests.push({
        name: 'Google Maps API',
        status: 'fail',
        message: error.message,
      });
      results.summary.failed++;
    }
    results.summary.total++;

    // Test 5: Twilio SMS
    try {
      const twilioSid = Deno.env.get('TWILIO_ACCOUNT_SID');
      const twilioToken = Deno.env.get('TWILIO_AUTH_TOKEN');
      if (!twilioSid || !twilioToken) {
        results.tests.push({
          name: 'Twilio SMS',
          status: 'warning',
          message: 'Credentials not configured',
        });
        results.summary.warnings++;
      } else {
        results.tests.push({
          name: 'Twilio SMS',
          status: 'pass',
          message: 'Credentials configured',
        });
        results.summary.passed++;
      }
    } catch (error) {
      results.tests.push({
        name: 'Twilio SMS',
        status: 'fail',
        message: error.message,
      });
      results.summary.failed++;
    }
    results.summary.total++;

    return Response.json(results);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});