import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import crypto from 'node:crypto';

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const testResults = {
      timestamp: new Date().toISOString(),
      tests_run: 0,
      tests_passed: 0,
      tests_failed: 0,
      details: []
    };

    // TEST 1: Application Start
    try {
      const appStartRes = await base44.functions.invoke('applicationStart', {
        primary_borrower_email: 'test-borrower@example.com',
        loan_product: 'DSCR',
        loan_purpose: 'Purchase'
      });

      if (appStartRes.data?.application_id) {
        testResults.tests_passed++;
        testResults.details.push({
          name: 'Application Start',
          status: 'PASS',
          message: 'Application created successfully'
        });
      } else {
        throw new Error('No application ID returned');
      }
    } catch (err) {
      testResults.tests_failed++;
      testResults.details.push({
        name: 'Application Start',
        status: 'FAIL',
        error: err.message
      });
    }
    testResults.tests_run++;

    // TEST 2: Application Resume
    try {
      const appId = 'test-app-' + crypto.randomBytes(8).toString('hex');
      const resumeRes = await base44.functions.invoke('applicationResume', {
        application_id: appId
      });

      if (resumeRes.data?.application_id) {
        testResults.tests_passed++;
        testResults.details.push({
          name: 'Application Resume',
          status: 'PASS',
          message: 'Application resumed successfully'
        });
      }
    } catch (err) {
      testResults.tests_failed++;
      testResults.details.push({
        name: 'Application Resume',
        status: 'FAIL',
        error: err.message
      });
    }
    testResults.tests_run++;

    // TEST 3: Document Upload Presign
    try {
      const presignRes = await base44.functions.invoke('documentPresignUpload', {
        requirement_id: 'test-req-123',
        file_name: 'test-document.pdf',
        mime_type: 'application/pdf',
        size_bytes: 1024000
      });

      if (presignRes.data?.upload_url && presignRes.data?.file_key) {
        testResults.tests_passed++;
        testResults.details.push({
          name: 'Document Presign Upload',
          status: 'PASS',
          message: 'Upload URL generated successfully'
        });
      }
    } catch (err) {
      testResults.tests_failed++;
      testResults.details.push({
        name: 'Document Presign Upload',
        status: 'FAIL',
        error: err.message
      });
    }
    testResults.tests_run++;

    // TEST 4: Portal Session Exchange
    try {
      // Create a test magic link first
      const magicLink = await base44.asServiceRole.entities.PortalMagicLink.create({
        org_id: user.org_id || 'default',
        deal_id: 'test-deal-123',
        borrower_email: 'test-borrower@example.com',
        token_hash: crypto.createHash('sha256').update('test-token-12345').digest('hex'),
        expires_at: new Date(Date.now() + 1 * 60 * 60 * 1000).toISOString()
      });

      const sessionRes = await base44.functions.invoke('portalSessionExchange', {
        token: 'test-token-12345'
      });

      if (sessionRes.data?.session_ok && sessionRes.data?.session_token) {
        testResults.tests_passed++;
        testResults.details.push({
          name: 'Portal Session Exchange',
          status: 'PASS',
          message: 'Session token created successfully'
        });
      }
    } catch (err) {
      testResults.tests_failed++;
      testResults.details.push({
        name: 'Portal Session Exchange',
        status: 'FAIL',
        error: err.message
      });
    }
    testResults.tests_run++;

    // TEST 5: Consent Recording
    try {
      const consentRes = await base44.functions.invoke('recordConsent', {
        contact_email: 'test-borrower@example.com',
        consent_type: 'email',
        status: 'opt_in',
        source: 'application'
      });

      if (consentRes.data?.consent_id) {
        testResults.tests_passed++;
        testResults.details.push({
          name: 'Consent Recording',
          status: 'PASS',
          message: 'Consent record created successfully'
        });
      }
    } catch (err) {
      testResults.tests_failed++;
      testResults.details.push({
        name: 'Consent Recording',
        status: 'FAIL',
        error: err.message
      });
    }
    testResults.tests_run++;

    // TEST 6: SMS STOP Handling
    try {
      const smsRes = await base44.functions.invoke('handleSMSStop', {
        phone_number: '+12125551234',
        message_body: 'STOP',
        from_number: '+18885551234',
        message_id: 'test-msg-456',
        timestamp: new Date().toISOString()
      });

      if (smsRes.data?.processed === true) {
        testResults.tests_passed++;
        testResults.details.push({
          name: 'SMS STOP Handling',
          status: 'PASS',
          message: 'STOP message processed successfully'
        });
      }
    } catch (err) {
      testResults.tests_failed++;
      testResults.details.push({
        name: 'SMS STOP Handling',
        status: 'FAIL',
        error: err.message
      });
    }
    testResults.tests_run++;

    // TEST 7: Portal Requirements Fetch
    try {
      const reqRes = await base44.functions.invoke('portalRequirements', {
        deal_id: 'test-deal-123'
      });

      if (reqRes.data?.requirements_by_category !== undefined) {
        testResults.tests_passed++;
        testResults.details.push({
          name: 'Portal Requirements Fetch',
          status: 'PASS',
          message: 'Requirements retrieved successfully'
        });
      }
    } catch (err) {
      testResults.tests_failed++;
      testResults.details.push({
        name: 'Portal Requirements Fetch',
        status: 'FAIL',
        error: err.message
      });
    }
    testResults.tests_run++;

    // TEST 8: Request Documents
    try {
      const docReqRes = await base44.functions.invoke('requestDocuments', {
        deal_id: 'test-deal-123',
        requirement_ids: ['test-req-1', 'test-req-2'],
        due_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        notify: true
      });

      if (docReqRes.data?.updated_count >= 0) {
        testResults.tests_passed++;
        testResults.details.push({
          name: 'Request Documents',
          status: 'PASS',
          message: 'Document request created successfully'
        });
      }
    } catch (err) {
      testResults.tests_failed++;
      testResults.details.push({
        name: 'Request Documents',
        status: 'FAIL',
        error: err.message
      });
    }
    testResults.tests_run++;

    return Response.json({
      success: testResults.tests_failed === 0,
      ...testResults
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});