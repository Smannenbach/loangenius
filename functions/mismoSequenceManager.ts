/**
 * MISMO Sequence Manager
 * Handles SequenceNumber and xlink:label for repeating containers
 * 
 * Best Practices:
 * - Assign SequenceNumber to all repeating elements (1-based, ascending)
 * - Assign stable xlink:label values for cross-referencing
 * - Export in deterministic order (SequenceNumber ascending)
 * - Import preserves or generates SequenceNumbers
 * 
 * Repeating Containers:
 * - ASSET, OWNED_PROPERTY/REO
 * - PARTY (borrowers, originators)
 * - ADDRESS (current, prior, mailing)
 * - RESIDENCE, EMPLOYER
 * - COLLATERAL, SUBJECT_PROPERTY
 * - FEE, SERVICE
 * - RELATIONSHIP
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Container types that require SequenceNumber and xlink:label
const SEQUENCED_CONTAINERS = {
  // Primary containers
  'PARTY': { labelPrefix: 'Party', roleAttribute: 'PartyRoleType' },
  'ASSET': { labelPrefix: 'Asset', roleAttribute: null },
  'COLLATERAL': { labelPrefix: 'Collateral', roleAttribute: null },
  'LOAN': { labelPrefix: 'Loan', roleAttribute: 'LoanRoleType' },
  
  // Nested containers
  'RESIDENCE': { labelPrefix: 'Residence', roleAttribute: null },
  'EMPLOYER': { labelPrefix: 'Employer', roleAttribute: null },
  'OWNED_PROPERTY': { labelPrefix: 'OwnedProperty', roleAttribute: null },
  'ROLE': { labelPrefix: 'Role', roleAttribute: null },
  'CONTACT_POINT': { labelPrefix: 'ContactPoint', roleAttribute: null },
  
  // Transaction containers
  'SERVICE': { labelPrefix: 'Service', roleAttribute: null },
  'FEE': { labelPrefix: 'Fee', roleAttribute: null },
  'FEE_PAYMENT': { labelPrefix: 'FeePayment', roleAttribute: null },
  
  // Relationship containers
  'RELATIONSHIP': { labelPrefix: 'Relationship', roleAttribute: null },
  
  // Document containers
  'DOCUMENT': { labelPrefix: 'Document', roleAttribute: null },
  'DOCUMENT_SPECIFIC_DATA_SET': { labelPrefix: 'DocDataSet', roleAttribute: null },
  
  // Income/Assets
  'CURRENT_INCOME_ITEM': { labelPrefix: 'IncomeItem', roleAttribute: null },
  'CREDIT_SCORE': { labelPrefix: 'CreditScore', roleAttribute: null },
  
  // Property containers
  'PROPERTY_VALUATION': { labelPrefix: 'Valuation', roleAttribute: null },
  'LEGAL_DESCRIPTION': { labelPrefix: 'LegalDesc', roleAttribute: null },
  
  // Nested address types
  'ADDRESS': { labelPrefix: 'Address', roleAttribute: null },
};

/**
 * Generate a stable xlink:label from container type and sequence
 */
function generateLabel(containerType, sequenceNumber, parentLabel = null) {
  const config = SEQUENCED_CONTAINERS[containerType] || { labelPrefix: containerType };
  const baseLabel = `${config.labelPrefix}_${sequenceNumber}`;
  return parentLabel ? `${parentLabel}_${baseLabel}` : baseLabel;
}

/**
 * Sort items by SequenceNumber for deterministic output
 */
function sortBySequence(items) {
  return [...items].sort((a, b) => {
    const seqA = a.sequence_number ?? a.SequenceNumber ?? Infinity;
    const seqB = b.sequence_number ?? b.SequenceNumber ?? Infinity;
    return seqA - seqB;
  });
}

/**
 * Assign SequenceNumbers to items that don't have them
 * Preserves existing SequenceNumbers, fills gaps
 */
function assignSequenceNumbers(items, startFrom = 1) {
  const result = [];
  const usedNumbers = new Set();
  
  // First pass: collect existing sequence numbers
  for (const item of items) {
    const existingSeq = item.sequence_number ?? item.SequenceNumber;
    if (existingSeq !== undefined && existingSeq !== null) {
      usedNumbers.add(existingSeq);
    }
  }
  
  // Second pass: assign numbers
  let nextSeq = startFrom;
  for (const item of items) {
    const existingSeq = item.sequence_number ?? item.SequenceNumber;
    if (existingSeq !== undefined && existingSeq !== null) {
      result.push({ ...item, sequence_number: existingSeq });
    } else {
      // Find next available sequence number
      while (usedNumbers.has(nextSeq)) {
        nextSeq++;
      }
      usedNumbers.add(nextSeq);
      result.push({ ...item, sequence_number: nextSeq });
      nextSeq++;
    }
  }
  
  return sortBySequence(result);
}

/**
 * Extract SequenceNumber and xlink:label from XML element
 */
function extractSequenceInfo(elementMatch) {
  const seqMatch = elementMatch.match(/SequenceNumber="(\d+)"/);
  const labelMatch = elementMatch.match(/xlink:label="([^"]+)"/);
  
  return {
    sequenceNumber: seqMatch ? parseInt(seqMatch[1], 10) : null,
    xlinkLabel: labelMatch ? labelMatch[1] : null,
  };
}

/**
 * Parse repeating containers from XML and preserve ordering
 */
function parseRepeatingContainers(xmlContent) {
  const containers = {};
  
  for (const [containerType, config] of Object.entries(SEQUENCED_CONTAINERS)) {
    const pattern = new RegExp(`<${containerType}([^>]*)>`, 'g');
    const matches = [];
    let match;
    let docOrder = 1;
    
    while ((match = pattern.exec(xmlContent)) !== null) {
      const attrs = match[1];
      const seqInfo = extractSequenceInfo(attrs);
      
      matches.push({
        containerType,
        documentOrder: docOrder++,
        sequenceNumber: seqInfo.sequenceNumber,
        xlinkLabel: seqInfo.xlinkLabel,
        position: match.index,
      });
    }
    
    if (matches.length > 0) {
      containers[containerType] = matches;
    }
  }
  
  return containers;
}

/**
 * Generate SequenceNumbers for imported data based on document order
 */
function generateImportSequencing(containers) {
  const result = {};
  
  for (const [containerType, items] of Object.entries(containers)) {
    result[containerType] = items.map((item, idx) => ({
      ...item,
      // Use existing SequenceNumber if present, otherwise use document order
      sequence_number: item.sequenceNumber ?? (idx + 1),
      // Generate xlink:label if not present
      xlink_label: item.xlinkLabel ?? generateLabel(containerType, item.sequenceNumber ?? (idx + 1)),
    }));
  }
  
  return result;
}

/**
 * Build sequenced XML attributes string
 */
function buildSequenceAttributes(containerType, sequenceNumber, parentLabel = null, additionalAttrs = {}) {
  const label = generateLabel(containerType, sequenceNumber, parentLabel);
  let attrs = `SequenceNumber="${sequenceNumber}" xlink:label="${label}"`;
  
  // Add role attribute if applicable
  const config = SEQUENCED_CONTAINERS[containerType];
  if (config?.roleAttribute && additionalAttrs[config.roleAttribute]) {
    attrs += ` ${config.roleAttribute}="${additionalAttrs[config.roleAttribute]}"`;
  }
  
  // Add any other attributes
  for (const [key, value] of Object.entries(additionalAttrs)) {
    if (key !== config?.roleAttribute && value !== undefined && value !== null) {
      attrs += ` ${key}="${value}"`;
    }
  }
  
  return attrs;
}

/**
 * Prepare borrowers for export with deterministic ordering
 */
function prepareBorrowersForExport(borrowers) {
  // Sort: primary first, then by sequence_number, then by creation order
  const sorted = [...borrowers].sort((a, b) => {
    // Primary borrower always first
    const aIsPrimary = a.role === 'primary' || a.role === 'Primary' || a.is_primary;
    const bIsPrimary = b.role === 'primary' || b.role === 'Primary' || b.is_primary;
    if (aIsPrimary && !bIsPrimary) return -1;
    if (!aIsPrimary && bIsPrimary) return 1;
    
    // Then by existing sequence_number
    const seqA = a.sequence_number ?? a.mismo_sequence ?? Infinity;
    const seqB = b.sequence_number ?? b.mismo_sequence ?? Infinity;
    if (seqA !== seqB) return seqA - seqB;
    
    // Finally by created_date for stability
    const dateA = a.created_date ? new Date(a.created_date).getTime() : 0;
    const dateB = b.created_date ? new Date(b.created_date).getTime() : 0;
    return dateA - dateB;
  });
  
  // Assign final sequence numbers
  return sorted.map((b, idx) => ({
    ...b,
    sequence_number: idx + 1,
    xlink_label: generateLabel('PARTY', idx + 1),
    role_label: generateLabel('ROLE', 1, generateLabel('PARTY', idx + 1)),
  }));
}

/**
 * Prepare properties for export with deterministic ordering
 */
function preparePropertiesForExport(properties) {
  // Sort by sequence_number, then by address for stability
  const sorted = [...properties].sort((a, b) => {
    const seqA = a.sequence_number ?? a.mismo_sequence ?? Infinity;
    const seqB = b.sequence_number ?? b.mismo_sequence ?? Infinity;
    if (seqA !== seqB) return seqA - seqB;
    
    // Then by address for stability
    const addrA = `${a.address_street || ''} ${a.address_city || ''}`.toLowerCase();
    const addrB = `${b.address_street || ''} ${b.address_city || ''}`.toLowerCase();
    return addrA.localeCompare(addrB);
  });
  
  return sorted.map((p, idx) => ({
    ...p,
    sequence_number: idx + 1,
    xlink_label: generateLabel('COLLATERAL', idx + 1),
  }));
}

/**
 * Prepare assets for export with deterministic ordering
 */
function prepareAssetsForExport(assets) {
  // Sort by sequence_number, then by account type, then by balance (desc)
  const sorted = [...assets].sort((a, b) => {
    const seqA = a.sequence_number ?? Infinity;
    const seqB = b.sequence_number ?? Infinity;
    if (seqA !== seqB) return seqA - seqB;
    
    // Then by account type for grouping
    const typeA = a.account_type || '';
    const typeB = b.account_type || '';
    if (typeA !== typeB) return typeA.localeCompare(typeB);
    
    // Then by balance descending
    const balA = a.account_balance ?? 0;
    const balB = b.account_balance ?? 0;
    return balB - balA;
  });
  
  return sorted.map((a, idx) => ({
    ...a,
    sequence_number: idx + 1,
    xlink_label: generateLabel('ASSET', idx + 1),
  }));
}

/**
 * Prepare fees/services for export with deterministic ordering
 */
function prepareFeesForExport(fees) {
  // Group by TRID category, then sort within each group
  const tridOrder = [
    'OriginationCharges',
    'ServicesYouCannotShopFor',
    'ServicesYouCanShopFor',
    'TaxesAndOtherGovernmentFees',
    'Prepaids',
    'InitialEscrowPaymentAtClosing',
    'OtherCosts',
  ];
  
  const sorted = [...fees].sort((a, b) => {
    const catA = a.trid_category || 'OtherCosts';
    const catB = b.trid_category || 'OtherCosts';
    const orderA = tridOrder.indexOf(catA);
    const orderB = tridOrder.indexOf(catB);
    
    if (orderA !== orderB) {
      return (orderA === -1 ? 999 : orderA) - (orderB === -1 ? 999 : orderB);
    }
    
    // Within same category, sort by fee name
    return (a.fee_name || '').localeCompare(b.fee_name || '');
  });
  
  return sorted.map((f, idx) => ({
    ...f,
    sequence_number: idx + 1,
    xlink_label: generateLabel('SERVICE', idx + 1),
  }));
}

/**
 * Prepare residences for export (current first, then prior)
 */
function prepareResidencesForExport(borrower) {
  const residences = [];
  
  // Current residence
  if (borrower.current_address_street) {
    residences.push({
      type: 'Current',
      sequence_number: 1,
      xlink_label: generateLabel('RESIDENCE', 1),
      street: borrower.current_address_street,
      unit: borrower.current_address_unit,
      city: borrower.current_address_city,
      state: borrower.current_address_state,
      zip: borrower.current_address_zip,
      housing_status: borrower.housing_status,
      duration_months: (borrower.time_at_address_years || 0) * 12 + (borrower.time_at_address_months || 0),
    });
  }
  
  // Prior residence
  if (borrower.former_address_street && !borrower.former_address_na) {
    residences.push({
      type: 'Prior',
      sequence_number: 2,
      xlink_label: generateLabel('RESIDENCE', 2),
      street: borrower.former_address_street,
      city: borrower.former_address_city,
      state: borrower.former_address_state,
      zip: borrower.former_address_zip,
    });
  }
  
  // Mailing address (if different)
  if (!borrower.mailing_same_as_current && borrower.mailing_address_street) {
    residences.push({
      type: 'Mailing',
      sequence_number: 3,
      xlink_label: generateLabel('ADDRESS', 3),
      street: borrower.mailing_address_street,
      city: borrower.mailing_address_city,
      state: borrower.mailing_address_state,
      zip: borrower.mailing_address_zip,
    });
  }
  
  return residences;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { action, data, xml_content } = body;

    switch (action) {
      case 'prepare_borrowers':
        return Response.json({
          success: true,
          borrowers: prepareBorrowersForExport(data.borrowers || []),
        });

      case 'prepare_properties':
        return Response.json({
          success: true,
          properties: preparePropertiesForExport(data.properties || []),
        });

      case 'prepare_assets':
        return Response.json({
          success: true,
          assets: prepareAssetsForExport(data.assets || []),
        });

      case 'prepare_fees':
        return Response.json({
          success: true,
          fees: prepareFeesForExport(data.fees || []),
        });

      case 'prepare_residences':
        return Response.json({
          success: true,
          residences: prepareResidencesForExport(data.borrower || {}),
        });

      case 'parse_import':
        // Parse XML and extract sequencing info
        const containers = parseRepeatingContainers(xml_content || '');
        const sequenced = generateImportSequencing(containers);
        return Response.json({
          success: true,
          containers: sequenced,
          container_counts: Object.fromEntries(
            Object.entries(sequenced).map(([k, v]) => [k, v.length])
          ),
        });

      case 'assign_sequences':
        // Assign sequence numbers to items
        const assigned = assignSequenceNumbers(data.items || [], data.start_from || 1);
        return Response.json({
          success: true,
          items: assigned,
        });

      case 'generate_label':
        // Generate a single xlink:label
        return Response.json({
          success: true,
          label: generateLabel(data.container_type, data.sequence_number, data.parent_label),
        });

      case 'build_attributes':
        // Build full attribute string
        return Response.json({
          success: true,
          attributes: buildSequenceAttributes(
            data.container_type,
            data.sequence_number,
            data.parent_label,
            data.additional_attrs || {}
          ),
        });

      case 'prepare_all':
        // Prepare all data for export
        const preparedBorrowers = prepareBorrowersForExport(data.borrowers || []);
        const preparedProperties = preparePropertiesForExport(data.properties || []);
        const preparedFees = prepareFeesForExport(data.fees || []);
        
        // Also prepare nested data
        const borrowersWithResidences = preparedBorrowers.map(b => ({
          ...b,
          residences: prepareResidencesForExport(b),
          assets: prepareAssetsForExport(b.assets || []),
        }));
        
        return Response.json({
          success: true,
          borrowers: borrowersWithResidences,
          properties: preparedProperties,
          fees: preparedFees,
          summary: {
            borrower_count: preparedBorrowers.length,
            property_count: preparedProperties.length,
            fee_count: preparedFees.length,
          },
        });

      default:
        return Response.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Sequence manager error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});