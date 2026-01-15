import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

    const { documentId, fileUrl } = await req.json();
    if (!documentId || !fileUrl) {
      return new Response(JSON.stringify({ error: 'Missing documentId or fileUrl' }), { status: 400 });
    }

    // Get document details
    const doc = await base44.asServiceRole.entities.Document.filter({ id: documentId });
    if (!doc || doc.length === 0) {
      return new Response(JSON.stringify({ error: 'Document not found' }), { status: 404 });
    }
    const document = doc[0];

    // Classify document and extract data
    const classification = await base44.integrations.Core.InvokeLLM({
      prompt: `Analyze this document and classify it.
      
Return JSON ONLY (no markdown):
{
  "type": "BANK_STATEMENT|LEASE_AGREEMENT|PURCHASE_CONTRACT|GOVERNMENT_ID|PASSPORT|ENTITY_DOCS_LLC|ENTITY_DOCS_CORP|TAX_RETURN|W2|PAYSTUB|PROPERTY_INSURANCE|TITLE_COMMITMENT|APPRAISAL|CREDIT_AUTHORIZATION|OTHER",
  "confidence": 0.85,
  "reasoning": "brief explanation"
}`,
      add_context_from_internet: false,
      file_urls: [fileUrl],
      response_json_schema: {
        type: 'object',
        properties: {
          type: { type: 'string' },
          confidence: { type: 'number' },
          reasoning: { type: 'string' },
        },
      },
    });

    // Extract data based on document type
    let extractedData = {};
    if (classification.confidence > 0.7) {
      const extractionPrompt = getExtractionPrompt(classification.type);
      extractedData = await base44.integrations.Core.InvokeLLM({
        prompt: extractionPrompt,
        add_context_from_internet: false,
        file_urls: [fileUrl],
        response_json_schema: {
          type: 'object',
          additionalProperties: true,
        },
      });
    }

    // Detect issues
    const issues = await base44.integrations.Core.InvokeLLM({
      prompt: `Review this ${classification.type} document for issues.
Return JSON array ONLY:
[
  { "type": "incomplete|redacted|outdated|illegible|name_mismatch", "severity": "warning|error", "message": "description" }
]
If no issues, return empty array: []`,
      add_context_from_internet: false,
      file_urls: [fileUrl],
      response_json_schema: {
        type: 'object',
        properties: {
          issues: {
            type: 'array',
            items: { type: 'object' },
          },
        },
      },
    });

    // Update document record
    await base44.asServiceRole.entities.Document.update(documentId, {
      ai_classification: classification.type,
      ai_confidence: classification.confidence,
      ai_extracted_data: extractedData,
      ai_issues: issues.issues || [],
      ai_processed_at: new Date().toISOString(),
    });

    // Auto-match to checklist if confidence high
    if (classification.confidence > 0.85) {
      const reqs = await base44.asServiceRole.entities.DealDocumentRequirement.filter({
        deal_id: document.deal_id,
        document_type: classification.type,
      });
      if (reqs && reqs.length > 0) {
        await base44.asServiceRole.entities.DealDocumentRequirement.update(reqs[0].id, {
          status: 'uploaded',
        });
      }
    }

    return new Response(JSON.stringify({
      classification,
      extractedData,
      issues: issues.issues || [],
      autoMatched: classification.confidence > 0.85,
    }), { status: 200 });

  } catch (error) {
    console.error('Document processing error:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});

function getExtractionPrompt(docType) {
  const prompts = {
    BANK_STATEMENT: `Extract from bank statement:
    - bank_name, account_type, account_last_4
    - statement_start_date, statement_end_date
    - ending_balance, average_balance
    - account_holder_name
    Return JSON only.`,
    
    PURCHASE_CONTRACT: `Extract:
    - buyer_name, seller_name
    - property_address, purchase_price
    - closing_date, contract_date
    Return JSON only.`,
    
    LEASE_AGREEMENT: `Extract:
    - lessor_name, lessee_name
    - property_address, lease_start_date
    - lease_end_date, monthly_rent
    Return JSON only.`,
    
    GOVERNMENT_ID: `Extract:
    - full_name, date_of_birth
    - id_number, issue_date, expiry_date
    Return JSON only.`,
    
    TAX_RETURN: `Extract:
    - taxpayer_name, tax_year
    - adjusted_gross_income, total_tax
    - filing_date
    Return JSON only.`,
  };
  
  return prompts[docType] || `Extract all available structured data from this document. Return JSON only.`;
}