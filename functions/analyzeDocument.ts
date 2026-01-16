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
      borrower_id,
      document_id,
      file_url,
      file_name,
      expected_type
    } = await req.json();

    if (!file_url) {
      return Response.json({ error: 'file_url is required' }, { status: 400 });
    }

    // Create analysis record
    const analysis = await base44.entities.DocumentAnalysis.create({
      org_id,
      deal_id,
      borrower_id,
      document_id,
      file_url,
      file_name,
      document_type: expected_type || 'other',
      analysis_status: 'analyzing'
    });

    // Analyze document with AI
    const analysisPrompt = `Analyze this loan document and extract key information. The expected document type is: ${expected_type || 'unknown'}.

Provide a detailed analysis including:
1. Document type detection (bank_statement, tax_return, pay_stub, w2, 1099, id_document, insurance, appraisal, lease_agreement, property_deed, entity_docs, other)
2. Key data extracted (dates, amounts, names, account numbers last 4, etc.)
3. Completeness score (0-100) - does document contain all expected information?
4. Compliance score (0-100) - does it meet lending documentation requirements?
5. Quality score (0-100) - is document readable and clear?
6. Any issues found (expired, missing pages, poor quality, inconsistencies)
7. Suggestions for borrower
8. Document date and expiry (if applicable)
9. Brief summary of document contents`;

    let aiResult;
    try {
      aiResult = await base44.integrations.Core.InvokeLLM({
        prompt: analysisPrompt,
        file_urls: [file_url],
        response_json_schema: {
          type: 'object',
          properties: {
            detected_type: { type: 'string' },
            extracted_data: { 
              type: 'object',
              properties: {
                account_holder: { type: 'string' },
                institution: { type: 'string' },
                account_last4: { type: 'string' },
                statement_date: { type: 'string' },
                ending_balance: { type: 'number' },
                period_start: { type: 'string' },
                period_end: { type: 'string' },
                income_amount: { type: 'number' },
                employer: { type: 'string' },
                property_address: { type: 'string' },
                insured_amount: { type: 'number' },
                policy_number: { type: 'string' },
                tax_year: { type: 'string' },
                gross_income: { type: 'number' }
              }
            },
            completeness_score: { type: 'number' },
            compliance_score: { type: 'number' },
            quality_score: { type: 'number' },
            issues_found: { type: 'array', items: { type: 'string' } },
            suggestions: { type: 'array', items: { type: 'string' } },
            document_date: { type: 'string' },
            expiry_date: { type: 'string' },
            is_expired: { type: 'boolean' },
            summary: { type: 'string' }
          }
        }
      });
    } catch (e) {
      console.error('AI analysis failed:', e);
      // Update with failed status
      await base44.entities.DocumentAnalysis.update(analysis.id, {
        analysis_status: 'failed',
        issues_found: ['AI analysis failed - manual review required'],
        completeness_score: 0,
        compliance_score: 0,
        quality_score: 0
      });
      
      return Response.json({
        success: false,
        analysis_id: analysis.id,
        error: 'Document analysis failed',
        message: 'Please have the document manually reviewed'
      });
    }

    // Check if document is expired (older than 90 days for most doc types)
    let isExpired = aiResult.is_expired || false;
    if (aiResult.document_date && !isExpired) {
      const docDate = new Date(aiResult.document_date);
      const daysDiff = (Date.now() - docDate.getTime()) / (1000 * 60 * 60 * 24);
      
      // Different expiry rules for different document types
      const expiryDays = {
        bank_statement: 60,
        pay_stub: 30,
        tax_return: 365,
        w2: 365,
        insurance: 365,
        appraisal: 120,
        id_document: 0 // Check actual expiry
      };
      
      const maxDays = expiryDays[aiResult.detected_type] || 90;
      if (maxDays > 0 && daysDiff > maxDays) {
        isExpired = true;
        if (!aiResult.issues_found) aiResult.issues_found = [];
        aiResult.issues_found.push(`Document is ${Math.floor(daysDiff)} days old - may need updated version`);
      }
    }

    // Update analysis record with results
    await base44.entities.DocumentAnalysis.update(analysis.id, {
      analysis_status: 'complete',
      detected_type: aiResult.detected_type || expected_type || 'other',
      extracted_data: aiResult.extracted_data || {},
      completeness_score: aiResult.completeness_score || 50,
      compliance_score: aiResult.compliance_score || 50,
      quality_score: aiResult.quality_score || 50,
      issues_found: aiResult.issues_found || [],
      suggestions: aiResult.suggestions || [],
      document_date: aiResult.document_date,
      expiry_date: aiResult.expiry_date,
      is_expired: isExpired,
      ai_summary: aiResult.summary || ''
    });

    // Generate instant feedback for borrower
    const overallScore = Math.round(
      (aiResult.completeness_score + aiResult.compliance_score + aiResult.quality_score) / 3
    );

    let feedbackMessage = '';
    let feedbackType = 'success';

    if (overallScore >= 80 && !isExpired && (!aiResult.issues_found || aiResult.issues_found.length === 0)) {
      feedbackMessage = '✓ Document accepted! All requirements met.';
      feedbackType = 'success';
    } else if (overallScore >= 60 || (aiResult.issues_found && aiResult.issues_found.length <= 2)) {
      feedbackMessage = '⚠ Document received with minor issues. Review suggestions below.';
      feedbackType = 'warning';
    } else {
      feedbackMessage = '✗ Document needs attention. Please review issues and resubmit if necessary.';
      feedbackType = 'error';
    }

    return Response.json({
      success: true,
      analysis_id: analysis.id,
      feedback: {
        type: feedbackType,
        message: feedbackMessage,
        overall_score: overallScore,
        is_expired: isExpired
      },
      scores: {
        completeness: aiResult.completeness_score,
        compliance: aiResult.compliance_score,
        quality: aiResult.quality_score
      },
      detected_type: aiResult.detected_type,
      extracted_data: aiResult.extracted_data,
      issues: aiResult.issues_found || [],
      suggestions: aiResult.suggestions || [],
      summary: aiResult.summary
    });

  } catch (error) {
    console.error('Document analysis error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});