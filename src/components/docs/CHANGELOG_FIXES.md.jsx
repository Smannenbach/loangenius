# LoanGenius Fixes Changelog

## 2026-01-20 — Core Flow Reliability Fixes

### PHASE 1: Org Resolution (Foundation)
- ✅ `useOrgId` hook already uses backend `resolveOrgId` function
- ✅ `Leads.jsx` already uses `useOrgId` and `useOrgScopedQuery`
- ✅ Backend functions use `resolveOrgId` for org resolution (not frontend OrgMembership queries)

### PHASE 2: Lead Import (100% Working)
- ✅ **DELETED** `functions/importLeadsFromSheet.js` (legacy hard-coded spreadsheet ID + `org_id: 'default'`)
- ✅ **FIXED** `functions/leadImport.js`:
  - Now uses `resolveOrgId` backend function for org resolution
  - All writes use `base44.asServiceRole.entities.Lead.create`
  - **CRITICAL**: Always sets `is_deleted: false` on new leads
  - Added robust CSV parser that handles quoted commas
  - Added full Google Sheets support (preview + import)
  - Better error messages for expired Google Sheets tokens
- ✅ **FIXED** `functions/googleSheetsImportLeads.js`:
  - Now sets `is_deleted: false` on all imported leads
- ✅ **FIXED** `LeadImportWizard.jsx`:
  - Handles `needs_reconnect` flag from backend
  - Invalidates ALL Lead query variants after import
- ✅ **VERIFIED** `Leads.jsx` filters by `is_deleted: false` (already correct)

### PHASE 3: MISMO Export/Import Unification
- ✅ **FIXED** `DealDetail.jsx`:
  - MISMO 3.4 button now uses `mismoExportOrchestrator` instead of `generateMISMO34`
  - Includes preflight validation, XSD validation, conformance report
  - Proper handling of export statuses and warnings
- ✅ `MISMOExportPanel.jsx` already uses production `mismoExportOrchestrator`
- ✅ `generateMISMO34.js` is now DEPRECATED (only for backward compat/testing)

### PHASE 4: Security + Logging
- ✅ **CREATED** `functions/_shared/safeLogger.js`:
  - Blocks logging of SSN, DOB, Tax IDs, bank account numbers, credit cards
  - Pattern-based redaction for strings
  - Field-name-based blocking for sensitive fields
  - `safeLog.info()`, `safeLog.warn()`, `safeLog.error()`, `safeLog.debug()`
- ✅ Updated `leadImport.js` to not log full error payloads

---

## Manual QA Checklist

### (a) Create/Resolve Org
- [ ] New user → auto-creates org on first login
- [ ] Existing user → resolves to correct org_id
- [ ] Admin role is assigned correctly

### (b) Import Leads via CSV
1. Go to Leads page
2. Click "Import Leads"
3. Upload a CSV file with columns: First Name, Last Name, Email, Phone
4. Verify column mapping suggestions
5. Click "Import"
6. **Expected**: Leads appear in table immediately after import

### (c) Import Leads via Google Sheets
1. Go to Leads page
2. Click "Import Leads"
3. Select "Google Sheets API" tab
4. Enter spreadsheet ID and sheet name
5. If error: "Please re-authorize in Admin → Integrations"
6. After mapping, click "Import"
7. **Expected**: Leads appear in table immediately

### (d) Confirm Leads Show in Leads Page
- [ ] New leads have `is_deleted: false`
- [ ] Leads page filters by `is_deleted: false` (verified in code)
- [ ] Query invalidation triggers refresh

### (e) Export MISMO via Orchestrator
1. Go to any Deal → MISMO Export tab
2. Click "Export"
3. **Expected**: 
   - Preflight validation runs
   - XSD validation runs
   - Conformance report generated
   - XML downloads with hash
4. Alternative: Quick MISMO button in header uses same pipeline

---

## Files Changed
- `functions/leadImport.js` — Full rewrite
- `functions/googleSheetsImportLeads.js` — Added is_deleted
- `functions/_shared/safeLogger.js` — New file
- `pages/DealDetail.jsx` — Use mismoExportOrchestrator
- `components/leads/LeadImportWizard.jsx` — Better error handling
- `functions/importLeadsFromSheet.js` — DELETED

## Files Already Correct (No Changes Needed)
- `components/useOrgId.jsx` — Already uses resolveOrgId
- `pages/Leads.jsx` — Already uses useOrgId + filters is_deleted
- `functions/resolveOrgId.js` — Already correct
- `components/deal-detail/MISMOExportPanel.jsx` — Already uses orchestrator