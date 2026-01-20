# BASE44 Lead Import Specification

## Overview
Production-grade Lead Import system supporting CSV file uploads and Google Sheets integration with full wizard flow, column mapping, validation, and deduplication.

## Import Sources

### 1. CSV Upload
- Direct file upload via browser
- Supports standard CSV format with quoted fields
- File parsed client-side before sending to backend

### 2. Public Google Sheets
- Paste URL: `https://docs.google.com/spreadsheets/d/[ID]/edit`
- Sheet must be shared with "Anyone with the link can view"
- Automatically converts to CSV export format

### 3. Private Google Sheets (API)
- Uses Google Sheets OAuth connector
- Requires authorization in Settings → Integrations
- Enter Spreadsheet ID + Sheet Tab name

## Wizard Steps

### Step 1: Source Selection
- Choose import method (CSV or Google Sheets)
- Upload file or enter sheet URL/ID
- Click "Preview Data" to proceed

### Step 2: Column Mapping
- Auto-detect headers from source
- Smart field matching suggests mappings
- Dropdown to map each column → Lead field
- Save mapping as reusable preset (org-scoped)
- Load previously saved mapping profiles

### Step 3: Preview & Validation
- Shows first 25 rows after mapping applied
- Displays validation warnings (missing required fields, invalid email format)
- Stats: Total rows, Valid rows, Potential issues

### Step 4: Import Execution
- Import valid rows to Lead entity
- Skip or error invalid rows
- Completion summary: Created/Updated/Skipped/Failed
- Downloadable error report (CSV) for failed rows

## Field Mappings

### Supported Lead Fields
| Field | Label | Notes |
|-------|-------|-------|
| first_name | First Name | |
| last_name | Last Name | |
| home_email | Email | Primary dedupe key |
| work_email | Work Email | |
| mobile_phone | Phone | Secondary dedupe key |
| home_phone | Home Phone | |
| work_phone | Work Phone | |
| property_street | Property Street | |
| property_city | Property City | |
| property_state | Property State | |
| property_zip | Property ZIP | |
| property_county | Property County | |
| property_type | Property Type | |
| occupancy | Occupancy | |
| estimated_value | Property Value | Numeric, auto-cleaned |
| loan_amount | Loan Amount | Numeric, auto-cleaned |
| loan_type | Loan Type | |
| loan_purpose | Loan Purpose | |
| fico_score | Credit Score | Integer |
| current_rate | Current Rate | Numeric |
| current_balance | Current Balance | Numeric |
| monthly_rental_income | Monthly Rent | Numeric |
| source | Lead Source | |
| notes | Notes | |
| zillow_link | Zillow Link | |

### Auto-Mapping Rules
Headers are matched case-insensitively against patterns:
- "First Name", "firstname", "first" → first_name
- "Email", "e-mail", "email address" → home_email
- "Phone", "mobile", "cell" → mobile_phone
- "Address", "street", "property address" → property_street
- etc.

## Validation Rules

### Required (at least one)
- first_name OR last_name
- OR home_email
- OR mobile_phone

### Format Validation
- Email: Must match `^[^\s@]+@[^\s@]+\.[^\s@]+$`
- Numeric fields: Auto-strip currency symbols, commas

### Row-Level Errors
- Missing required identifier → Skip row
- Invalid email format → Warning (still imports)

## Deduplication

### Dedupe Key Priority
1. **Email** (primary): `home_email` lowercase match
2. **Phone** (secondary): `mobile_phone` digits-only match
3. **Name+Address** (tertiary): first_name + last_name + property_street

### Dedupe Behavior
- If match found in database: **Update** existing record
- If no match: **Create** new record
- Within same import batch: Skip duplicates

## Data Entities

### ImportRun
Tracks each import execution:
```json
{
  "org_id": "string",
  "source_type": "csv | google_sheets",
  "source_ref": "string (URL or filename)",
  "mapping_json": "object",
  "status": "queued | running | completed | failed",
  "total_rows": 0,
  "imported_count": 0,
  "updated_count": 0,
  "skipped_count": 0,
  "error_count": 0,
  "error_sample_json": [],
  "error_file_url": "string",
  "started_at": "datetime",
  "finished_at": "datetime"
}
```

### LeadMappingProfile
Saved mapping presets:
```json
{
  "org_id": "string",
  "name": "string",
  "mapping_json": "object",
  "is_default": false
}
```

## Backend Function: leadImport

### Actions

#### preview
```json
{
  "action": "preview",
  "source_type": "csv | google_sheets",
  "data": "CSV string (for csv)",
  "sheet_url": "URL (for public sheets)",
  "spreadsheet_id": "ID (for private sheets)",
  "sheet_name": "Tab name"
}
```
Returns: headers, rows (first 25), suggested_mapping, validation_errors

#### import
```json
{
  "action": "import",
  "source_type": "csv | google_sheets",
  "data": "CSV string",
  "mapping": {"Column Name": "lead_field"},
  "skip_validation": false
}
```
Returns: import_run_id, imported, updated, skipped, errors, error_details

#### save_mapping
```json
{
  "action": "save_mapping",
  "name": "Profile Name",
  "mapping_json": {}
}
```

#### list_mappings
```json
{
  "action": "list_mappings"
}
```

## Error Handling

### User-Facing Errors
- "Google Sheets not authorized. Please authorize in Settings."
- "Failed to fetch sheet. Make sure it is shared publicly."
- "Must have name, email, or phone" (row-level)
- "Invalid email format" (row-level)

### Error Report Download
- CSV format: Row, Error
- Available when errors > 0
- One-click download from results screen

## Post-Import UI Updates

### Immediate Visibility
- Leads page: `queryClient.invalidateQueries(['leads'])` called
- Counts update in KPI cards
- New leads appear in table/card views
- Search/filter works on imported records

### Pipeline Integration
- Leads show in Pipeline view with correct status
- Lead cards display all mapped data
- Click lead → opens Lead Detail modal