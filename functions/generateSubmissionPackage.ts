import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

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

    const {
      deal_id,
      lender_id,
      package_type = 'Full_Package', // Full_Package, Documents_Only, Exports_Only, Custom
      custom_items = []
    } = await req.json();

    if (!deal_id) {
      return Response.json({ error: 'Missing deal_id' }, { status: 400 });
    }

    const deal = await base44.entities.Deal.get(deal_id);
    if (!deal) {
      return Response.json({ error: 'Deal not found' }, { status: 404 });
    }

    // Calculate readiness score
    const documents = await base44.entities.Document.filter({ deal_id });
    const requirements = await base44.entities.DealDocumentRequirement.filter({ deal_id });
    const conditions = await base44.entities.Condition.filter({ deal_id });

    const docsUploaded = documents.length;
    const docsRequired = requirements.length;
    const conditionsMet = conditions.filter(c => ['approved', 'waived'].includes(c.status)).length;
    const conditionsTotal = conditions.length;

    const readinessScore = (docsUploaded + conditionsMet) / (docsRequired + conditionsTotal + 1) * 100;

    // Create readiness snapshot
    const readinessSnapshot = {
      documents_uploaded: docsUploaded,
      documents_required: docsRequired,
      conditions_satisfied: conditionsMet,
      conditions_total: conditionsTotal,
      readiness_score: Math.round(readinessScore),
      snapshot_date: new Date().toISOString()
    };

    // Create SubmissionPackage
    const pkg = await base44.asServiceRole.entities.SubmissionPackage.create({
      org_id: deal.org_id,
      deal_id,
      lender_id: lender_id || 'pending',
      package_name: `${deal.deal_name || 'Deal'} - Submission ${new Date().toLocaleDateString()}`,
      package_type,
      status: 'Generating',
      readiness_score: readinessSnapshot.readiness_score,
      readiness_snapshot: readinessSnapshot,
      file_url: 'https://mock-bucket.s3.amazonaws.com/packages/pkg-pending.zip',
      file_size_bytes: 0,
      file_count: docsUploaded,
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      generated_by: user.email
    });

    // Log activity
    await base44.asServiceRole.entities.ActivityLog.create({
      org_id: deal.org_id,
      deal_id,
      action_type: 'submission_package_generated',
      description: `Submission package generated: ${pkg.package_name}`,
      metadata_json: { package_id: pkg.id, readiness_score: readinessSnapshot.readiness_score }
    });

    return Response.json({
      package_id: pkg.id,
      package_name: pkg.package_name,
      readiness_score: pkg.readiness_score,
      file_count: pkg.file_count,
      status: pkg.status
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});