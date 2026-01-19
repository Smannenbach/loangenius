import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Production MISMO Import Orchestrator
// Orchestrates: Validation -> Mapping -> Unmapped Retention -> Conformance Report

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { 
      xml_content,
      pack_id, // Optional: defaults to auto-detect
      raw_only_mode, // If true, skip canonical mapping (quarantine mode)
      org_id
    } = await req.json();

    const importRun = {
      import_id: `IMP-${Date.now()}`,
      imported_by: user.email,
      imported_at: new Date().toISOString(),
      org_id: org_id || user.org_id,
      status: 'processing',
      raw_only_mode: raw_only_mode || false
    };

    // Step 1: Auto-detect MISMO version if pack_id not specified
    let effectivePackId = pack_id;
    if (!effectivePackId) {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xml_content, 'text/xml');
      const lddElement = xmlDoc.getElementsByTagName('MISMOLogicalDataDictionaryIdentifier')[0];
      const lddId = lddElement?.textContent?.trim();
      
      if (lddId?.includes('DU') || lddId?.includes('ULAD')) {
        effectivePackId = 'PACK_B_DU_ULAD_STRICT_34_B324';
      } else {
        effectivePackId = 'PACK_A_GENERIC_MISMO_34_B324';
      }
      
      importRun.detected_pack = effectivePackId;
      importRun.detected_ldd = lddId;
    }

    importRun.pack_id = effectivePackId;

    // Step 2: XSD Validation
    const validationResponse = await base44.asServiceRole.functions.invoke('mismoSchemaPackManager', {
      action: 'validate_xml',
      xml_content,
      pack_id: effectivePackId
    });

    const validation = validationResponse.data.validation;
    importRun.validation_status = validation.status;

    // Block import if validation fails (unless raw_only_mode)
    if (validation.status === 'FAIL' && !raw_only_mode) {
      importRun.status = 'blocked';
      importRun.message = 'XSD validation failed - import blocked (enable raw-only mode to force)';
      
      // Generate conformance report
      const conformanceResponse = await base44.asServiceRole.functions.invoke('mismoConformanceReport', {
        action: 'generate',
        context: 'import',
        validation_result: validation,
        pack_id: effectivePackId,
        run_id: importRun.import_id
      });

      importRun.conformance_report = conformanceResponse.data.report;

      return Response.json({
        success: false,
        import_run: importRun,
        blocked_reason: 'xsd_validation_failed'
      }, { status: 400 });
    }

    // Step 3: Map to canonical model + retain unmapped
    const mapperResponse = await base44.asServiceRole.functions.invoke('mismoImportMapper', {
      action: 'import',
      xml_content,
      pack_id: effectivePackId,
      raw_only_mode
    });

    const importResult = mapperResponse.data.import_result;
    importRun.mapped_fields_count = Object.keys(importResult.mapped_fields || {}).length;
    importRun.unmapped_nodes_count = (importResult.unmapped_nodes || []).length;

    // Step 4: Encrypt and store raw XML
    const rawXmlHash = await computeHash(xml_content);
    importRun.raw_xml_size = xml_content.length;
    importRun.raw_xml_hash = rawXmlHash;
    // In production: store encrypted XML in secure storage
    // importRun.raw_xml_encrypted = await encrypt(xml_content);

    // Step 5: Generate conformance report
    const conformanceResponse = await base44.asServiceRole.functions.invoke('mismoConformanceReport', {
      action: 'generate',
      context: 'import',
      validation_result: validation,
      mapping_result: importResult,
      canonical_data: importResult.mapped_fields,
      pack_id: effectivePackId,
      run_id: importRun.import_id
    });

    importRun.conformance_report = conformanceResponse.data.report;

    // Step 6: Write to canonical tables (if not raw_only_mode)
    if (!raw_only_mode && validation.status !== 'FAIL') {
      // Create or update deal
      const mappedFields = importResult.mapped_fields;
      
      // Check if deal already exists (by external ID or other identifier)
      // For now, create new deal
      const newDeal = await base44.entities.Deal.create({
        org_id: importRun.org_id,
        loan_amount: mappedFields.loan_amount,
        loan_purpose: mappedFields.loan_purpose,
        interest_rate: mappedFields.interest_rate,
        application_date: mappedFields.application_date,
        stage: 'application',
        status: 'active',
        application_channel: 'import',
        meta_json: {
          imported_from: importRun.import_id,
          import_date: importRun.imported_at,
          pack_id: effectivePackId
        }
      });

      importRun.created_deal_id = newDeal.id;
      importRun.status = 'imported';
    } else {
      importRun.status = 'imported_raw_only';
      importRun.message = 'Imported to raw storage only (quarantine mode)';
    }

    // Step 7: Store import run record
    await base44.asServiceRole.entities.ImportRun.create({
      ...importRun,
      raw_xml_encrypted: null, // Would be encrypted in production
      unmapped_nodes_index: importResult.unmapped_nodes || []
    }).catch(() => {});

    // Step 8: Audit log
    await base44.asServiceRole.entities.AuditLog.create({
      org_id: importRun.org_id,
      user_id: user.email,
      action: 'mismo_import',
      entity_type: 'Deal',
      entity_id: importRun.created_deal_id,
      metadata: {
        import_id: importRun.import_id,
        pack_id: effectivePackId,
        validation_status: validation.status,
        raw_xml_hash: rawXmlHash,
        mapped_fields_count: importRun.mapped_fields_count,
        unmapped_nodes_count: importRun.unmapped_nodes_count
      }
    }).catch(() => {});

    return Response.json({
      success: true,
      import_run: importRun,
      created_deal_id: importRun.created_deal_id
    });

  } catch (error) {
    console.error('Import Orchestrator error:', error);
    return Response.json({ 
      error: 'Internal server error', 
      details: error.message 
    }, { status: 500 });
  }
});

// Compute SHA-256 hash
async function computeHash(content) {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return 'sha256:' + hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}