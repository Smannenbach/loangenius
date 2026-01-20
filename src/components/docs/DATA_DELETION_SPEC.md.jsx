# Data Deletion Specification (Erasure / Delete Requests)

## Overview
Safe, auditable, org-scoped deletion or anonymization of personal data in response to GDPR erasure requests and CCPA/CPRA deletion requests.

## Deletion vs Anonymization

### When to Delete (Hard Delete)
- Leads (never converted)
- Draft applications (not submitted)
- Test data
- Marketing communications logs (after opt-out period)

### When to Anonymize (Preferred for Compliance Records)
- Completed loan applications
- Funded loans
- Documents required for regulatory compliance (7-year retention)
- Audit logs (redact personal identifiers, keep action records)

**Rationale**: Regulatory requirements mandate 7-year retention of loan files. We cannot hard-delete but we can anonymize.

## Anonymization Rules

### Personal Identifiers to Anonymize
Replace with placeholder values:
- `first_name` → `[REDACTED]`
- `last_name` → `[REDACTED]`
- `email` → `deleted_user_[RANDOM_ID]@redacted.local`
- `phone` → `000-000-0000`
- `SSN` → `000-00-0000`
- `DOB` → `1900-01-01`
- `address_street` → `[REDACTED]`

### Fields to Preserve (for Transaction Integrity)
- Loan amounts, rates, terms (financial data, not personal)
- Property addresses (tied to collateral, not to person)
- Deal numbers, application dates
- Status/stage information

### Audit Exceptions
**Audit logs**: Redact personal info but keep action records
```json
// Before
{
  "user_email": "john.doe@example.com",
  "action": "viewed_document",
  "entity_id": "doc_123"
}

// After
{
  "user_email": "[REDACTED per deletion request PR-20260120-0001]",
  "action": "viewed_document",
  "entity_id": "doc_123"
}
```

## Org Scoping (CRITICAL)

**All deletions MUST be org-scoped** to prevent cross-tenant data loss.

```sql
-- CORRECT: Org-scoped deletion
DELETE FROM leads WHERE email = '[email]' AND org_id = '[org_id]';

-- WRONG: Global deletion (could affect multiple orgs)
DELETE FROM leads WHERE email = '[email]';
```

**Verification Step**: Before deletion, count records in each org:
```sql
SELECT org_id, COUNT(*) 
FROM leads 
WHERE email = '[email]' 
GROUP BY org_id;
```

If multiple orgs found: Only delete from org that submitted the request.

## Deletion Process (Step-by-Step)

### 1. Pre-Deletion Snapshot
Before any deletion:
```json
{
  "privacy_request_id": "PR-...",
  "snapshot_date": "...",
  "entities_affected": {
    "leads": { "count": 2, "ids": ["lead_1", "lead_2"] },
    "borrowers": { "count": 1, "ids": ["borrower_1"] },
    "documents": { "count": 5, "ids": [...] }
  }
}
```
Store snapshot in `fulfillment_artifacts`.

### 2. Determine Deletion Strategy
For each entity:
- Check if hard-delete allowed OR anonymization required
- Check retention requirements (7-year rule for loans)

### 3. Execute Deletion/Anonymization
```javascript
// Soft delete (mark as deleted)
await base44.entities.Lead.update(lead_id, { is_deleted: true });

// Anonymize borrower
await base44.entities.Borrower.update(borrower_id, {
  first_name: '[REDACTED]',
  last_name: '[REDACTED]',
  email: `deleted_user_${crypto.randomUUID()}@redacted.local`,
  phone: '000-000-0000',
  ssn_last_four: '0000',
  date_of_birth: '1900-01-01'
});

// Document deletion (files + metadata)
const doc = await base44.entities.Document.get(doc_id);
// Delete file from storage
await deleteFileFromStorage(doc.file_url);
// Delete metadata
await base44.entities.Document.update(doc_id, { is_deleted: true });
```

### 4. Verify Deletion
Re-query database to confirm:
```sql
SELECT COUNT(*) FROM leads WHERE id IN ([deleted_ids]) AND is_deleted = false;
-- Should return 0
```

### 5. Generate Deletion Certificate
```json
{
  "certificate_id": "DC-20260120-0001",
  "privacy_request_id": "PR-20260120-0001",
  "completed_date": "2026-01-20T14:30:00Z",
  "requester_email": "j***n@example.com",
  "jurisdiction": "GDPR",
  "deletion_summary": {
    "leads_deleted": 2,
    "borrowers_anonymized": 1,
    "documents_deleted": 5,
    "communications_deleted": 12,
    "audit_logs_redacted": 45
  },
  "retention_exceptions": {
    "entities_retained": ["Deal #LG-202503-0042"],
    "reason": "7-year regulatory retention requirement (TRID)",
    "anonymization_applied": true
  },
  "verified_by": "admin@loangenius.com",
  "irreversible": true
}
```

Save as PDF + JSON, upload to private storage.

### 6. Post-Deletion Verification (24 Hours Later)
- Re-run query to ensure data still deleted (no restore/backup issues)
- Confirm signed URLs to deleted documents return 404
- Log verification result

## Exceptions to Deletion (Legal Basis)

We may refuse deletion if:
1. **Legal obligation**: 7-year retention for loan files (TRID, HMDA)
2. **Legal claims**: Data needed for defense of legal claims
3. **Compliance**: Regulatory reporting requirements (HMDA LAR)
4. **Public interest**: Anti-money laundering (AML) records

**Process if exception applies**:
- Status → `completed` (but with partial fulfillment)
- Document exception in `deletion_certificate`
- Explain to requester in completion email
- Apply anonymization to maximum extent possible

## Deletion Certificate Template (PDF)

```
CERTIFICATE OF DATA DELETION

Request ID: [REQUEST_ID]
Completion Date: [DATE]
Jurisdiction: [GDPR/CPRA]

This certifies that LoanGenius has processed a data deletion request
for the individual identified by email: [MASKED_EMAIL]

DATA DELETED:
- Leads: 2 records
- Borrowers: 1 record (anonymized)
- Documents: 5 files + metadata
- Communications: 12 messages
- Audit Logs: 45 entries (personal info redacted)

RETENTION EXCEPTIONS:
- Deal #LG-202503-0042: Retained per 7-year TRID requirement
  (personal identifiers anonymized)

This deletion is irreversible. The above data has been permanently 
removed from LoanGenius systems and cannot be recovered.

Verified by: [ADMIN_NAME]
Signature: [DIGITAL_SIGNATURE]
Date: [DATE]
```

## Testing Requirements

### Deletion Tests
1. **Org scoping**: Cannot delete across orgs
   - Create lead in Org A and Org B with same email
   - Delete from Org A
   - Verify lead still exists in Org B

2. **Referential integrity**: Deleting borrower doesn't break deal
   - Create deal with borrower
   - Anonymize borrower
   - Verify deal still functional (shows [REDACTED] for borrower name)

3. **File deletion**: Document files actually deleted
   - Upload document for borrower
   - Delete borrower (including docs)
   - Verify file URL returns 404

4. **Audit preservation**: Audit logs preserve actions but redact identity
   - Generate audit logs for user actions
   - Anonymize user
   - Verify audit logs show `[REDACTED]` but still show action types

5. **Irreversibility**: Deleted data stays deleted
   - Delete lead
   - Refresh page, re-query database
   - Verify lead still deleted (not restored by cache/backup)

### Anonymization Tests
1. Search by original email returns no results
2. Search by anonymized email returns anonymized record
3. Linked entities (deals) still reference anonymized borrower by ID
4. No personal info visible in any UI screens

## GDPR / CPRA Compliance Notes

### GDPR Article 17 (Right to Erasure)
Must erase "without undue delay" when:
- Data no longer necessary
- Consent withdrawn
- Data unlawfully processed
- Legal obligation requires erasure

**Exceptions** (Article 17(3)):
- Compliance with legal obligation
- Establishment, exercise, or defense of legal claims
- Archiving purposes in the public interest

### CPRA § 7020(a) (Right to Delete)
Must delete consumer personal information upon verified request, subject to exceptions.

**Our approach**: Delete when legally allowed, anonymize when retention required, document all exceptions transparently.

---
**Document Version**: 1.0  
**Last Updated**: 2026-01-20  
**Compliance**: GDPR Art. 17, CCPA § 1798.105, CPRA § 7020