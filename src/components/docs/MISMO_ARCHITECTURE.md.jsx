# MISMO Export/Import Architecture

## Overview

LoanGenius implements a production-grade MISMO v3.4 (Build 324) XML export/import system that ensures:
- **Well-formed XML** - Syntactically correct
- **XSD-valid** - Conforms to pinned schema pack
- **Deterministic** - Same input produces byte-identical output
- **Round-trip stable** - Export → Import → Export yields identical XML

---

## Architecture Components

### 1. SchemaPack Manager (`mismoSchemaPackManager.js`)

**Purpose**: Central authority for schema validation

**Schema Packs**:
| Pack ID | Description | Strict Mode |
|---------|-------------|-------------|
| `PACK_A_GENERIC_MISMO_34_B324` | Standard MISMO v3.4 B324 | No |
| `PACK_B_DU_ULAD_STRICT_34_B324` | DU/ULAD Strict mode | Yes |

**Features**:
- Pinned schema versions with content hashes
- LDD Identifier validation
- Enum registry for all MISMO enumerations
- Datatype patterns (Date, Amount, Percent, etc.)

**API**:
```javascript
// Validate XML
await base44.functions.invoke('mismoSchemaPackManager', {
  action: 'validate_xml',
  xml_content: '<MESSAGE>...</MESSAGE>',
  pack_id: 'PACK_A_GENERIC_MISMO_34_B324'
});

// Get enum values
await base44.functions.invoke('mismoSchemaPackManager', {
  action: 'get_enums',
  enum_type: 'LoanPurposeType'
});
```

---

### 2. Deterministic Exporter (`mismoDeterministicExporter.js`)

**Purpose**: Produce byte-identical XML from canonical data

**Features**:
- Stable element ordering (SequenceNumber-based)
- Stable namespace ordering
- Consistent whitespace/formatting
- xlink:label generation for relationships
- Enum mapping (canonical → MISMO)

**Canonical → MISMO Field Mappings**:
| Canonical Field | MISMO XPath |
|-----------------|-------------|
| `loan_amount` | `TERMS_OF_LOAN/BaseLoanAmount` |
| `loan_purpose` | `TERMS_OF_LOAN/LoanPurposeType` |
| `property_street` | `COLLATERAL/SUBJECT_PROPERTY/ADDRESS/AddressLineText` |
| `first_name` | `PARTY/INDIVIDUAL/NAME/FirstName` |
| ... | ... |

---

### 3. LDD Rules Engine (`mismoLDDRulesEngine.js`)

**Purpose**: Validate enums, datatypes, and conditionality BEFORE XML generation

**Validation Categories**:
1. **Enum Enforcement** - Values must match LDD allowed values
2. **Datatype Normalization** - Currency, Percent, Date, Phone, SSN
3. **Conditional Rules** - e.g., Cash-out amount required for Cash-Out Refi

**Preflight Validation**:
```javascript
await base44.functions.invoke('mismoLDDRulesEngine', {
  action: 'preflight_validation',
  canonical_data: { loan_amount: 500000, loan_purpose: 'Purchase', ... },
  pack_id: 'PACK_A_GENERIC_MISMO_34_B324'
});
```

---

### 4. Extension Builder (`mismoExtensionBuilder.js`)

**Purpose**: MEG-0025 compliant extension handling

**LoanGenius Extension Namespace**:
- URI: `https://loangenius.ai/mismo/ext/1.0`
- Prefix: `LG`
- Version: `1.0`

**Extension-Only Fields** (not in core MISMO LDD):
| Canonical Field | LG Element |
|-----------------|------------|
| `dscr` | `LG:DSCRatio` |
| `gross_rental_income` | `LG:GrossRentalIncome` |
| `is_business_purpose_loan` | `LG:IsBusinessPurposeLoan` |
| `entity_ein` | `LG:EntityEIN` |
| ... | ... |

**Extension XML Structure**:
```xml
<EXTENSION>
  <OTHER xmlns:LG="https://loangenius.ai/mismo/ext/1.0">
    <LG:LOAN_GENIUS_EXTENSION>
      <LG:ExtensionVersion>1.0</LG:ExtensionVersion>
      <LG:DSCRatio>1.2500</LG:DSCRatio>
      <LG:IsBusinessPurposeLoan>true</LG:IsBusinessPurposeLoan>
    </LG:LOAN_GENIUS_EXTENSION>
  </OTHER>
</EXTENSION>
```

---

### 5. Import Mapper (`mismoImportMapper.js`)

**Purpose**: Parse MISMO XML to canonical model

**Features**:
- XPath-based field extraction
- Enum reverse mapping (MISMO → canonical)
- Datatype normalization
- **Unmapped node retention** (no silent data loss)
- Extension field extraction

**Unmapped Node Handling**:
```javascript
{
  mapped_fields: { loan_amount: 500000, ... },
  unmapped_nodes: [
    { xpath: '//CUSTOM_ELEMENT', reason: 'No mapping defined' }
  ],
  unmapped_count: 5
}
```

---

### 6. Conformance Report Generator (`mismoConformanceReport.js`)

**Purpose**: Detailed validation reports for export/import

**Report Categories**:
1. XML well-formedness
2. XSD schema violations
3. Enum violations
4. Datatype violations
5. Missing required fields
6. Conditionality violations
7. Mapping gaps

**PII Safety**:
- Never includes raw SSN/DOB/Tax ID
- Automatic redaction in logs/reports

---

### 7. Golden Test Harness (`mismoGoldenTestHarness.js`)

**Purpose**: Automated round-trip testing

**Test Coverage** (30+ cases):
- Loan purposes: Purchase, Rate&Term, Cash-Out, Delayed Financing
- Vesting: Individual, Entity (Corp, GP, LLC, Trust)
- Applicants: 0, 1, 2
- Assets: 0, 1, 5
- REO: 0, 2, 6, 9
- Declarations: Bankruptcy, Undisclosed Money
- Demographics: Individual only

**Test Artifacts**:
```
canonical_before.json  → Input data
exported.xml           → Generated MISMO XML
validation_report.json → XSD validation result
canonical_after.json   → Re-imported data
diff.json              → Differences (should be empty)
```

---

## How to Add Mappings

### Adding a Core Field Mapping

1. **Edit `mismoDeterministicExporter.js`**:
```javascript
const FIELD_MAPPINGS = {
  // ... existing mappings
  new_field: { xpath: 'CONTAINER/NEW_ELEMENT', format: 'string' }
};
```

2. **Edit `mismoImportMapper.js`**:
```javascript
const XPATH_MAPPINGS = {
  // ... existing mappings
  'CONTAINER/NEW_ELEMENT': { field: 'new_field', type: 'string' }
};
```

3. **Run golden tests** to verify round-trip stability

### Adding an Extension Field

1. **Edit `mismoExtensionBuilder.js`**:
```javascript
const EXTENSION_ONLY_FIELDS = {
  // ... existing fields
  new_dscr_field: { 
    lg_name: 'NewDSCRField', 
    type: 'decimal', 
    description: 'Description here' 
  }
};
```

2. **Edit `mismoImportMapper.js`**:
```javascript
const EXTENSION_MAPPINGS = {
  // ... existing mappings
  'NewDSCRField': { field: 'new_dscr_field', type: 'decimal' }
};
```

---

## Security Controls

| Control | Implementation |
|---------|----------------|
| SSN/DOB/Tax ID encryption | At-rest encryption in database |
| Raw XML encryption | Import runs store encrypted XML |
| RBAC | Admin-only for import/export |
| Audit trail | All operations logged with pack hash |
| PII redaction | Automatic in logs/reports |

---

## Validation Workflow

### Export Flow
```
Canonical Data
    ↓
[Preflight Validation] → FAIL? → Show errors
    ↓ PASS
[LDD Rules Engine] → FAIL? → Show enum/datatype errors
    ↓ PASS
[Extension Builder] → Extract extension fields
    ↓
[Deterministic Exporter] → Generate XML
    ↓
[Schema Validator] → FAIL? → Block export
    ↓ PASS
[Conformance Report] → Generate report
    ↓
[Audit Log] → Record export event
    ↓
Download XML
```

### Import Flow
```
XML File
    ↓
[Schema Validator] → FAIL? → Quarantine (raw-only mode)
    ↓ PASS
[Import Mapper] → Extract fields + retain unmapped
    ↓
[Conformance Report] → Generate report
    ↓
[Write to Canonical] → Create/update deal
    ↓
[Audit Log] → Record import event
```

---

## CI Regression Gate

Add to CI pipeline:
```yaml
- name: MISMO Round-Trip Regression
  run: |
    npm run test:mismo-roundtrip
```

**Gate Conditions**:
- Any XSD FAIL → Block deployment
- Any diff in mapped fields → Block deployment
- Any enum/datatype violation → Block deployment