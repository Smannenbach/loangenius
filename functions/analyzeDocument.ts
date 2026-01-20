/**
 * Analyze Document with AI
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { document_id, document_url, analysis_type = 'general' } = body;

    if (!document_url) {
      return Response.json({ error: 'Missing document_url' }, { status: 400 });
    }

    // Define prompts by analysis type
    const prompts = {
      general: 'Analyze this document and extract key information. Identify the document type and summarize main points.',
      bank_statement: 'Extract account holder name, account number (last 4 digits), statement period, ending balance, and notable transactions.',
      tax_return: 'Extract taxpayer name, filing status, total income, AGI, and tax year.',
      lease: 'Extract property address, tenant name, monthly rent, lease start/end dates.',
      paystub: 'Extract employer, employee name, gross pay, net pay, pay period, YTD earnings.',
    };

    const prompt = prompts[analysis_type] || prompts.general;

    // Call AI with document
    const response = await base44.integrations.Core.InvokeLLM({
      prompt: prompt,
      file_urls: [document_url],
      response_json_schema: {
        type: 'object',
        properties: {
          document_type: { type: 'string' },
          extracted_data: { type: 'object' },
          summary: { type: 'string' },
          confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
        },
      },
    });

    // Store analysis if document_id provided
    if (document_id) {
      await base44.entities.DocumentAnalysis.create({
        document_id: document_id,
        analysis_type: analysis_type,
        extracted_data: response.extracted_data,
        summary: response.summary,
        confidence: response.confidence,
      });
    }

    return Response.json({
      success: true,
      analysis: response,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});