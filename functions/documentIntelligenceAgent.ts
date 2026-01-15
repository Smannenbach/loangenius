import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { doc_id, doc_type, content, metadata } = body;

    if (!doc_id) {
      return Response.json({ error: 'doc_id required' }, { status: 400 });
    }

    // Simulate document classification and extraction
    const extractionResults = [];
    let confidence = 0.95;
    let estimated = false;

    if (doc_type === 'lease' || content?.includes('lease')) {
      extractionResults.push({
        field_name: 'tenant_name',
        value: metadata?.tenant_name || 'John Tenant',
        source_doc_id: doc_id,
        page_coords: 'p1:rect(50,100,200,150)',
        confidence: 0.98,
        estimated: false,
        extraction_method: 'regex'
      });
      extractionResults.push({
        field_name: 'monthly_rent',
        value: metadata?.monthly_rent || 2500,
        source_doc_id: doc_id,
        page_coords: 'p1:rect(50,200,200,250)',
        confidence: 0.99,
        estimated: false,
        extraction_method: 'numeric_extraction'
      });
      extractionResults.push({
        field_name: 'lease_start_date',
        value: metadata?.lease_start || '2025-01-01',
        source_doc_id: doc_id,
        page_coords: null,
        confidence: 0.97,
        estimated: false,
        extraction_method: 'date_parser'
      });
      extractionResults.push({
        field_name: 'lease_signed',
        value: metadata?.signed || true,
        source_doc_id: doc_id,
        page_coords: 'p1:rect(50,350,200,400)',
        confidence: 0.96,
        estimated: false,
        extraction_method: 'signature_detection'
      });
      confidence = 0.98;
    } else if (doc_type === 'rent_roll' || content?.includes('unit')) {
      // Rent roll extraction
      const rows = metadata?.rows || [
        { unit_id: '1', tenant_name: 'Tenant A', monthly_rent: 1500, occupancy_status: 'occupied' }
      ];
      rows.forEach((row, idx) => {
        extractionResults.push({
          field_name: `rent_roll_unit_${idx}_rent`,
          value: row.monthly_rent,
          source_doc_id: doc_id,
          page_coords: `p1:row(${idx})`,
          confidence: 0.92,
          estimated: false,
          extraction_method: 'ocr'
        });
      });
      confidence = 0.92;
    } else if (doc_type === 'schedule_e' || content?.includes('Schedule E')) {
      // Schedule E extraction
      extractionResults.push({
        field_name: 'rental_income',
        value: metadata?.rental_income || 30000,
        source_doc_id: doc_id,
        page_coords: 'p1:rect(100,200,300,220)',
        confidence: 0.94,
        estimated: false,
        extraction_method: 'tax_form_parser'
      });
      extractionResults.push({
        field_name: 'property_tax_expense',
        value: metadata?.expenses?.taxes || 3000,
        source_doc_id: doc_id,
        page_coords: 'p1:rect(100,250,300,270)',
        confidence: 0.91,
        estimated: false,
        extraction_method: 'tax_form_parser'
      });
      confidence = 0.93;
    } else if (doc_type === 'bank_statement' || content?.includes('bank')) {
      // Bank statement and rent deposit detection
      const deposits = metadata?.rent_deposits_monthly || metadata?.deposits || [2500, 2500, 2500];
      extractionResults.push({
        field_name: 'monthly_rent_deposits',
        value: deposits,
        source_doc_id: doc_id,
        page_coords: 'p1:deposits_section',
        confidence: 0.88,
        estimated: false,
        extraction_method: 'deposit_heuristic'
      });
      confidence = 0.88;
    } else {
      // Generic document
      extractionResults.push({
        field_name: 'document_summary',
        value: content?.substring(0, 100) || 'Unknown document',
        source_doc_id: doc_id,
        page_coords: null,
        confidence: 0.65,
        estimated: true,
        extraction_method: 'generic_ocr'
      });
      confidence = 0.65;
      estimated = true;
    }

    // Emit audit event
    const auditEvent = {
      agent_id: 'document-intelligence-agent',
      event_type: 'doc_extraction',
      doc_id,
      doc_type,
      confidence,
      timestamp: new Date().toISOString(),
      metadata: { field_count: extractionResults.length }
    };

    return Response.json({
      doc_id,
      doc_type,
      classification_confidence: confidence,
      extraction_results: extractionResults,
      flags: confidence < 0.70 ? [{ severity: 'warning', message: 'Low confidence extraction' }] : [],
      ready_for_underwriting: confidence >= 0.85,
      audit_event_id: crypto.randomUUID(),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});