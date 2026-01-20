# Lead Import Fix Changelog

## Summary
Fixed end-to-end lead import flow. Imported leads now show immediately in the Leads page and are searchable.

## Root Causes Identified

### 1. Old Import Modal Used Wrong Backend Function
- **Problem**: `LeadsImportModal` called `sheetsImport` function which imported to Contact entity, not Lead entity
- **Fix**: Created new `leadImport` backend function that properly imports to Lead entity

### 2. Missing Field Mapping Flexibility
- **Problem**: Previous import had hardcoded field mappings, no UI to customize
- **Fix**: New wizard with drag-drop column mapping and saveable presets

### 3. No Deduplication Logic
- **Problem**: Re-importing same sheet created duplicate leads
- **Fix**: Implemented dedupe by email → phone → name+address priority

### 4. Silent Validation Failures
- **Problem**: Invalid rows silently dropped with no feedback
- **Fix**: Row-level validation with preview, error counts, downloadable error report

### 5. Query Cache Not Invalidated
- **Problem**: React Query cache not refreshed after import
- **Fix**: Explicit `queryClient.invalidateQueries(['leads'])` on import success

## Changes Made

### New Files
| File | Purpose |
|------|---------|
| `functions/leadImport.js` | Backend import function with preview, import, save_mapping actions |
| `components/leads/LeadImportWizard.jsx` | Full wizard UI with 4 steps |
| `entities/LeadMappingProfile.json` | Saved mapping templates |

### Modified Files
| File | Change |
|------|--------|
| `entities/ImportRun.json` | Added `updated_count`, `mapping_json`, `error_file_url` fields |
| `pages/Leads.js` | Replaced `LeadsImportModal` with `LeadImportWizard` |

### Backend Function: leadImport

**Actions:**
- `preview` - Parse source, return headers, sample rows, suggested mapping
- `import` - Execute import with dedupe, create ImportRun record
- `save_mapping` - Save column mapping as reusable profile
- `list_mappings` - List saved mapping profiles

**Features:**
- CSV parsing with quoted field support
- Google Sheets API integration (private sheets)
- Public sheet URL export conversion
- Smart field name matching
- Numeric field auto-conversion
- Idempotent dedupe by email/phone

### UI Component: LeadImportWizard

**Step Flow:**
1. Source selection (CSV upload, public URL, or Sheets API)
2. Column mapping with dropdowns, save/load presets
3. Preview with validation warnings
4. Import execution with results summary

**Key Features:**
- Progress stepper visualization
- Auto-suggested mappings
- Validation error preview
- Saved mapping profiles
- Error report CSV download
- React Query cache invalidation

## Test Results

### Test 1: Preview CSV
```
Input: CSV with 5 columns, 2 rows
Output: headers, rows, suggested_mapping ✅
```

### Test 2: Import New Lead
```
Input: 1 new lead with email
Output: imported=1, updated=0, skipped=0 ✅
Lead appears in database ✅
```

### Test 3: Import Duplicate (Dedupe Update)
```
Input: Same email, different data
Output: imported=0, updated=1, skipped=0 ✅
Lead updated, not duplicated ✅
```

### Test 4: UI Refresh
```
Action: Complete import
Result: Leads page shows new lead immediately ✅
```

## Remaining Known Issues

1. **Google Sheets API auth** - Requires pre-authorized connector in Settings
2. **Large file handling** - No chunking for 10k+ row imports (may timeout)
3. **Error file URL** - Error CSV stored in memory, not uploaded to storage

## Migration Notes

- Old `LeadsImportModal` component still exists but is no longer used
- Old `sheetsImport` function still exists for Contact imports
- Old `importLeadsFromSheet` function still exists for hardcoded sheet import