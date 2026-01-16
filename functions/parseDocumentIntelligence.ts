import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const document_id = body.document_id;
    let file_url = body.file_url;

    // If only document_id provided, get file_url from document
    if (document_id && !file_url) {
      const docCheck = await base44.entities.Document.get(document_id);
      if (docCheck && docCheck.file_key) {
        file_url = docCheck.file_key;
      }
    }

    if (!document_id && !file_url) {
      return Response.json({
        error: 'Missing document_id or file_url'
      }, { status: 400 });
    }

    // Get document
    const doc = await base44.entities.Document.get(document_id);
    if (!doc) {
      return Response.json({ error: 'Document not found' }, { status: 404 });
    }

    // Use InvokeLLM with vision + document intelligence
    const analysisPrompt = `
    Analyze this document and extract the following information:
    
    If it's a Form 1003 (Uniform Residential Loan Application):
    - Borrower name, email, phone
    - Property address
    - Loan amount
    - Loan purpose
    - Employment info (employer, job title, years)
    - Income (gross monthly, annual)
    - Assets (liquid, retirement, real estate)
    - Liabilities (credit cards, auto loans, mortgages)
    
    If it's a Pay Stub:
    - Employee name
    - Employer name
    - Pay period dates
    - Gross income (period and YTD)
    - Deductions
    
    If it's a Tax Return (1040):
    - Taxpayer name, SSN (masked)
    - Filing year
    - Total income
    - Schedule C income (if self-employed)
    - Total tax paid
    
    If it's a Bank Statement:
    - Account holder name
    - Account type
    - Statement period
    - Beginning/ending balance
    - Deposits (sum)
    - Withdrawals (sum)
    
    Return as JSON with:
    - document_type: detected type
    - confidence: 0-100
    - extracted_fields: object with all found fields
    - summary: brief text summary
    `;

    const llmResult = await base44.integrations.Core.InvokeLLM({
      prompt: analysisPrompt,
      file_urls: [file_url],
      response_json_schema: {
        type: 'object',
        properties: {
          document_type: { type: 'string' },
          confidence: { type: 'number' },
          extracted_fields: { type: 'object' },
          summary: { type: 'string' }
        }
      }
    });

    // Create DocumentIntelligence record
    const intelligence = await base44.entities.DocumentIntelligence.create({
      org_id: user.org_id || 'default',
      document_id,
      deal_id: doc.deal_id,
      document_type: llmResult.document_type,
      confidence_score: llmResult.confidence,
      extracted_data_json: llmResult.extracted_fields,
      summary: llmResult.summary,
      status: 'completed',
      processed_at: new Date().toISOString()
    });

    // If form 1003, extract to borrower data
    if (llmResult.document_type === 'Form 1003') {
      const borrower = await base44.entities.Borrower.get(doc.deal_id);
      if (borrower && llmResult.extracted_fields) {
        const updates = {};
        if (llmResult.extracted_fields.borrower_name) updates.full_name = llmResult.extracted_fields.borrower_name;
        if (llmResult.extracted_fields.gross_monthly_income) updates.income = llmResult.extracted_fields.gross_monthly_income;
        if (llmResult.extracted_fields.total_assets) updates.assets_json = { total: llmResult.extracted_fields.total_assets };
        if (Object.keys(updates).length > 0) {
          await base44.entities.Borrower.update(borrower.id, updates);
        }
      }
    }

    // Log activity
    await base44.asServiceRole.entities.ActivityLog.create({
      org_id: doc.org_id || 'default',
      deal_id: doc.deal_id,
      activity_type: 'DOCUMENT_UPLOADED',
      description: `Document analyzed: ${llmResult.document_type} (confidence: ${llmResult.confidence}%)`,
      source: 'system',
      metadata: { document_id, intelligence_id: intelligence.id }
    });

    return Response.json({
      intelligence_id: intelligence.id,
      document_type: llmResult.document_type,
      confidence: llmResult.confidence,
      extracted_fields: llmResult.extracted_fields,
      summary: llmResult.summary
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});