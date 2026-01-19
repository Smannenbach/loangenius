import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Production MISMO Export Orchestrator
// Orchestrates: Preflight -> Extension Build -> Export -> Validation -> Report

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { 
      deal_id, 
      export_mode, // 'GENERIC_MISMO_34' or 'DU_ULAD_STRICT'
      skip_preflight 
    } = await req.json();

    const packId = export_mode === 'DU_ULAD_STRICT' 
      ? 'PACK_B_DU_ULAD_STRICT_34_B324'
      : 'PACK_A_GENERIC_MISMO_34_B324';

    const exportRun = {
      export_id: `EXP-${Date.now()}`,
      deal_id,
      export_mode,
      pack_id: packId,
      exported_by: user.email,
      exported_at: new Date().toISOString(),
      status: 'processing'
    };

    // Step 1: Fetch deal and related data
    const deal = await base44.entities.Deal.get(deal_id);
    if (!deal) {
      return Response.json({ error: 'Deal not found' }, { status: 404 });
    }

    // Fetch related entities
    const [dealBorrowers, dealProperties, borrowerAssets, reoProperties] = await Promise.all([
      base44.entities.DealBorrower.filter({ deal_id }).catch(() => []),
      base44.entities.DealProperty.filter({ deal_id }).catch(() => []),
      base44.entities.BorrowerAsset.filter({ deal_id }).catch(() => []),
      base44.entities.REOProperty.filter({ deal_id }).catch(() => [])
    ]);

    // Build canonical data
    const canonicalData = {
      ...deal,
      borrowers: dealBorrowers,
      properties: dealProperties,
      assets: borrowerAssets,
      reo_properties: reoProperties
    };

    // Step 2: Preflight validation (unless skipped)
    if (!skip_preflight) {
      const preflightResponse = await base44.asServiceRole.functions.invoke('mismoPreflightValidator', {
        action: 'validate',
        canonical_data: canonicalData,
        pack_id: packId
      });

      const preflight = preflightResponse.data;
      exportRun.preflight_report = preflight.report;

      if (preflight.status === 'FAIL') {
        exportRun.status = 'blocked';
        exportRun.message = 'Preflight validation failed';
        return Response.json({
          success: false,
          export_run: exportRun,
          blocked_reason: 'preflight_failed'
        }, { status: 400 });
      }
    }

    // Step 3: Extract extension fields (LG namespace)
    const extensionResponse = await base44.asServiceRole.functions.invoke('mismoExtensionBuilder', {
      action: 'extract_extension_fields',
      canonical_data: canonicalData
    });

    const extensionFields = extensionResponse.data.extension_fields;
    const coreFields = extensionResponse.data.core_fields;

    // Step 4: Generate MISMO XML
    const exportResponse = await base44.asServiceRole.functions.invoke('generateMISMO34', {
      deal_id,
      pack_id: packId,
      extension_fields: extensionFields,
      core_fields: coreFields
    });

    const mismoXml = exportResponse.data.xml_content;
    exportRun.byte_size = mismoXml.length;
    exportRun.filename = exportResponse.data.filename;

    // Step 5: Build extension block
    const extensionBlockResponse = await base44.asServiceRole.functions.invoke('mismoExtensionBuilder', {
      action: 'build_extension_block',
      canonical_data: canonicalData
    });

    exportRun.extension_fields_count = extensionBlockResponse.data.fields_included;

    // Step 6: XSD Validation
    const validationResponse = await base44.asServiceRole.functions.invoke('mismoSchemaPackManager', {
      action: 'validate_xml',
      xml_content: mismoXml,
      pack_id: packId
    });

    const validation = validationResponse.data.validation;
    exportRun.validation_status = validation.status;

    // Block download if XSD validation fails
    if (validation.status === 'FAIL') {
      exportRun.status = 'failed';
      exportRun.message = 'XSD validation failed - export blocked';
      
      // Generate conformance report
      const conformanceResponse = await base44.asServiceRole.functions.invoke('mismoConformanceReport', {
        action: 'generate',
        context: 'export',
        validation_result: validation,
        canonical_data: canonicalData,
        pack_id: packId,
        run_id: exportRun.export_id
      });

      exportRun.conformance_report = conformanceResponse.data.report;

      return Response.json({
        success: false,
        export_run: exportRun,
        blocked_reason: 'xsd_validation_failed'
      }, { status: 400 });
    }

    // Step 7: Compute deterministic hash
    const hashResponse = await base44.asServiceRole.functions.invoke('mismoDeterministicExporter', {
      action: 'compute_hash',
      xml_content: mismoXml
    });

    exportRun.content_hash = hashResponse.data.hash;

    // Step 8: Generate conformance report
    const conformanceResponse = await base44.asServiceRole.functions.invoke('mismoConformanceReport', {
      action: 'generate',
      context: 'export',
      validation_result: validation,
      canonical_data: canonicalData,
      pack_id: packId,
      run_id: exportRun.export_id
    });

    exportRun.conformance_report = conformanceResponse.data.report;
    exportRun.status = validation.status === 'PASS' ? 'completed' : 'completed_with_warnings';

    // Step 9: Audit log
    await base44.asServiceRole.entities.AuditLog.create({
      org_id: deal.org_id,
      user_id: user.email,
      action: 'mismo_export',
      entity_type: 'Deal',
      entity_id: deal_id,
      metadata: {
        export_id: exportRun.export_id,
        export_mode,
        pack_id: packId,
        validation_status: validation.status,
        content_hash: exportRun.content_hash
      }
    }).catch(() => {});

    return Response.json({
      success: true,
      export_run: exportRun,
      xml_content: mismoXml,
      filename: exportRun.filename
    });

  } catch (error) {
    console.error('Export Orchestrator error:', error);
    return Response.json({ 
      error: 'Internal server error', 
      details: error.message 
    }, { status: 500 });
  }
});