/**
 * Smart Document Review - AI-powered document analysis
 * Flags potential issues or missing information before submission
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { deal_id, document_id, document_url, document_type } = await req.json();

    if (!deal_id) {
      return Response.json({ error: 'Missing deal_id' }, { status: 400 });
    }

    // Fetch deal and related data
    const deals = await base44.entities.Deal.filter({ id: deal_id });
    const deal = deals[0];
    if (!deal) {
      return Response.json({ error: 'Deal not found' }, { status: 404 });
    }

    const issues = [];

    // If document URL provided, analyze with AI
    if (document_url) {
      const aiAnalysis = await base44.integrations.Core.InvokeLLM({
        prompt: `Analyze this ${document_type || 'loan'} document for a DSCR/investment property loan.

Check for:
1. Missing required fields or signatures
2. Expired dates (documents, appraisals, credit reports)
3. Data inconsistencies
4. Compliance issues
5. Quality/readability issues

Provide specific issues found with severity level.`,
        file_urls: [document_url],
        response_json_schema: {
          type: 'object',
          properties: {
            document_type_detected: { type: 'string' },
            issues: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  issue_type: { 
                    type: 'string',
                    enum: ['missing_field', 'inconsistent_data', 'expired_document', 'signature_missing', 'calculation_error', 'compliance_issue', 'quality_issue', 'other']
                  },
                  severity: { type: 'string', enum: ['critical', 'warning', 'info'] },
                  field_name: { type: 'string' },
                  description: { type: 'string' },
                  suggested_action: { type: 'string' },
                },
              },
            },
            extracted_data: { type: 'object' },
            overall_status: { type: 'string', enum: ['pass', 'needs_review', 'fail'] },
            confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
          },
        },
      });

      // Save issues to database
      for (const issue of aiAnalysis.issues || []) {
        const savedIssue = await base44.entities.DocumentReviewIssue.create({
          org_id: deal.org_id,
          deal_id: deal_id,
          document_id: document_id,
          issue_type: issue.issue_type,
          severity: issue.severity,
          field_name: issue.field_name,
          description: issue.description,
          suggested_action: issue.suggested_action,
          status: 'open',
        });
        issues.push(savedIssue);
      }

      return Response.json({
        success: true,
        document_type: aiAnalysis.document_type_detected,
        issues: aiAnalysis.issues || [],
        extracted_data: aiAnalysis.extracted_data,
        overall_status: aiAnalysis.overall_status,
        confidence: aiAnalysis.confidence,
        saved_issues: issues,
      });
    }

    // If no document, perform deal-level review
    const [borrowers, properties, documents] = await Promise.all([
      base44.entities.Borrower.filter({ deal_id }).catch(() => []),
      base44.entities.Property.filter({ deal_id }).catch(() => []),
      base44.entities.Document.filter({ deal_id }).catch(() => []),
    ]);

    const dealIssues = [];

    // Check for required data
    if (!borrowers.length) {
      dealIssues.push({
        issue_type: 'missing_field',
        severity: 'critical',
        field_name: 'borrower',
        description: 'No borrower information found',
        suggested_action: 'Add borrower details to the deal',
      });
    }

    if (!properties.length) {
      dealIssues.push({
        issue_type: 'missing_field',
        severity: 'critical',
        field_name: 'property',
        description: 'No property information found',
        suggested_action: 'Add subject property details',
      });
    }

    if (!deal.loan_amount) {
      dealIssues.push({
        issue_type: 'missing_field',
        severity: 'critical',
        field_name: 'loan_amount',
        description: 'Loan amount not specified',
        suggested_action: 'Enter the requested loan amount',
      });
    }

    if (!deal.interest_rate) {
      dealIssues.push({
        issue_type: 'missing_field',
        severity: 'warning',
        field_name: 'interest_rate',
        description: 'Interest rate not locked',
        suggested_action: 'Lock interest rate before submission',
      });
    }

    // Check DSCR for investment properties
    if (deal.loan_product?.includes('DSCR') && (!deal.dscr || deal.dscr < 0.75)) {
      dealIssues.push({
        issue_type: 'compliance_issue',
        severity: deal.dscr ? 'warning' : 'critical',
        field_name: 'dscr',
        description: deal.dscr 
          ? `DSCR of ${deal.dscr} is below typical minimum requirements`
          : 'DSCR not calculated',
        suggested_action: 'Review rental income and expenses',
      });
    }

    // Check LTV
    if (deal.ltv && deal.ltv > 80) {
      dealIssues.push({
        issue_type: 'warning',
        severity: 'warning',
        field_name: 'ltv',
        description: `LTV of ${deal.ltv}% exceeds 80% threshold`,
        suggested_action: 'May require additional documentation or PMI',
      });
    }

    // Check required documents
    const requiredDocTypes = ['appraisal', 'title', 'insurance'];
    const existingDocTypes = documents.map(d => d.document_type?.toLowerCase());
    
    for (const docType of requiredDocTypes) {
      if (!existingDocTypes.some(t => t?.includes(docType))) {
        dealIssues.push({
          issue_type: 'missing_field',
          severity: 'warning',
          field_name: docType,
          description: `${docType.charAt(0).toUpperCase() + docType.slice(1)} document not found`,
          suggested_action: `Upload ${docType} document`,
        });
      }
    }

    // Save deal-level issues
    for (const issue of dealIssues) {
      await base44.entities.DocumentReviewIssue.create({
        org_id: deal.org_id,
        deal_id: deal_id,
        ...issue,
        status: 'open',
      });
    }

    return Response.json({
      success: true,
      issues: dealIssues,
      overall_status: dealIssues.some(i => i.severity === 'critical') ? 'fail' 
        : dealIssues.some(i => i.severity === 'warning') ? 'needs_review' 
        : 'pass',
      summary: {
        total_issues: dealIssues.length,
        critical: dealIssues.filter(i => i.severity === 'critical').length,
        warnings: dealIssues.filter(i => i.severity === 'warning').length,
        info: dealIssues.filter(i => i.severity === 'info').length,
      },
    });

  } catch (error) {
    console.error('Document review error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});