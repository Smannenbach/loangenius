# Google Sheets Lead Import - Testing Checklist

## Prerequisites
1. Google Sheets connector authorized in Admin → Integrations
2. A test spreadsheet with lead data (headers in row 1)

## Test Cases

### 1. Connection Flow
- [ ] Navigate to Leads page
- [ ] Click "Import from Sheets" button
- [ ] Verify connection status shows correctly (connected/disconnected)
- [ ] If disconnected, verify "Reconnect" messaging appears

### 2. Sheet Selection
- [ ] Paste a valid Google Sheets URL
- [ ] Click "Load Spreadsheet"
- [ ] Verify tabs are listed correctly
- [ ] Select a tab and click "Preview Data"

### 3. Column Mapping
- [ ] Verify headers are displayed
- [ ] Verify auto-mapping suggests correct fields
- [ ] Manually adjust mapping if needed
- [ ] Save mapping template with a name
- [ ] Verify saved mapping appears in dropdown on next import

### 4. Preview & Validation
- [ ] Verify sample rows display correctly
- [ ] Verify validation warnings show for problematic rows
- [ ] Verify row count is accurate

### 5. Dedupe Modes
- [ ] Import sheet with dedupeMode="skip"
- [ ] Verify created_count matches expected new leads
- [ ] Re-import same sheet
- [ ] Verify skipped_count > 0, created_count = 0

- [ ] Import sheet with dedupeMode="update"
- [ ] Modify source data in sheet
- [ ] Re-import
- [ ] Verify updated_count > 0

### 6. Import Completion
- [ ] Verify success toast shows correct counts
- [ ] Verify leads appear immediately in Leads list (no refresh needed)
- [ ] Verify ImportRun record created in history
- [ ] If errors, verify "Download Errors" CSV works

### 7. Error Handling
- [ ] Test with expired token → verify "needs reconnect" message
- [ ] Test with invalid spreadsheet ID → verify friendly error
- [ ] Test with missing required columns → verify row-level errors

## Sample Test Data Format
```
First Name,Last Name,Email,Phone,Property Address,City,State,ZIP,Loan Amount,Loan Type
John,Doe,john@example.com,5551234567,123 Main St,Austin,TX,78701,500000,DSCR
Jane,Smith,jane@example.com,5559876543,456 Oak Ave,Dallas,TX,75201,750000,Conventional
```

## Dedupe Rules
- Primary key: email (case-insensitive)
- Secondary key: phone (digits only, normalized)
- If neither email nor phone: no dedupe (always create or error)

## Expected Results
- Import creates/updates leads scoped to current org only
- All imports logged in ImportRun entity
- Leads query invalidated after import (UI refreshes automatically)