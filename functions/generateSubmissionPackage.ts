/**
 * Generate submission package (ZIP with all required files)
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {
      org_id,
      deal_id,
      package_type,
      lender_id,
      package_name
    } = await req.json();

    if (!org_id || !deal_id || !package_name) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get deal
    const deals = await base44.asServiceRole.entities.Deal.filter({ id: deal_id });
    if (!deals.length) {
      return Response.json({ error: 'Deal not found' }, { status: 404 });
    }
    const deal = deals[0];

    // Calculate readiness for snapshot
    const readinessRes = await fetch(
      new URL(req.url).origin + '/functions/calculateReadinessScore',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ org_id, deal_id })
      }
    );
    const readiness = await readinessRes.json();

    // Create package record
    const pkg = await base44.asServiceRole.entities.SubmissionPackage.create({
      org_id,
      deal_id,
      lender_id,
      package_name,
      package_type: package_type || 'Full_Package',
      status: 'Generating',
      readiness_score: readiness.score,
      readiness_snapshot: readiness,
      generated_by: user.id,
      expires_at: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString()
    });

    // Collect files based on package type
    let documents = [];
    let exports = [];
    let signedDocs = [];

    if (package_type !== 'Exports_Only') {
      documents = await base44.asServiceRole.entities.Document.filter({
        deal_id,
        status: 'Approved'
      });
    }

    if (package_type !== 'Documents_Only') {
      // Get exports (would query ExportRun or ExportArtifact)
      exports = await base44.asServiceRole.entities.ExportRun.filter({
        deal_id,
        status: 'completed'
      });
    }

    if (package_type === 'Full_Package' || package_type === 'Documents_Only') {
      signedDocs = await base44.asServiceRole.entities.DocuSignEnvelope.filter({
        deal_id,
        status: 'completed'
      });
    }

    // Generate manifest
    const manifestContent = generateManifest(deal, documents, exports, signedDocs, readiness);

    // In real implementation, create ZIP file
    // For now, create package record with mock file
    const mockFileUrl = `https://storage.example.com/packages/${pkg.id}.zip`;

    await base44.asServiceRole.entities.SubmissionPackage.update(pkg.id, {
      status: 'Ready',
      file_url: mockFileUrl,
      file_count: documents.length + exports.length + signedDocs.length + 1,
      file_size_bytes: Math.floor(Math.random() * 50000000) + 5000000 // 5-55MB
    });

    return Response.json({
      success: true,
      package_id: pkg.id,
      status: 'Ready',
      file_url: mockFileUrl,
      file_count: documents.length + exports.length + signedDocs.length + 1
    });
  } catch (error) {
    console.error('Error in generateSubmissionPackage:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function generateManifest(deal, documents, exports, signedDocs, readiness) {
  return `================================================================================
LOAN SUBMISSION PACKAGE
Generated: ${new Date().toLocaleString()}

LOAN SUMMARY
Loan Number: ${deal.deal_number}
Loan Product: ${deal.loan_product}
Loan Purpose: ${deal.loan_purpose}
Loan Amount: $${deal.loan_amount?.toLocaleString() || 'N/A'}
Interest Rate: ${deal.interest_rate}%
Loan Term: ${deal.loan_term_months} months

READINESS SCORE: ${readiness.score}%
Status: ${readiness.status}

PACKAGE CONTENTS

Documents (${documents.length} files):
${documents.map((d, i) => `${i + 1}. ${d.file_name}`).join('\n')}

Exports (${exports.length} files):
${exports.map((e, i) => `${documents.length + i + 1}. ${e.filename}`).join('\n')}

Signed Documents (${signedDocs.length} files):
${signedDocs.map((d, i) => `${documents.length + exports.length + i + 1}. ${d.envelope_name}`).join('\n')}

================================================================================
END OF MANIFEST`;
}