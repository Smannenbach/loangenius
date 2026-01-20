# Data Export Specification (Access / "Know" Requests)

## Overview
Specification for exporting all personal data for GDPR access requests and CCPA/CPRA "right to know" requests.

## Export Scope (Data Map)

### Entities Included

#### 1. Lead Entity
**Fields exported**:
- All contact fields (name, email, phone)
- All property fields (address, value, type)
- All loan inquiry fields (amount, type, purpose)
- Status, source, platform tracking
- TCPA consent records
- Created/updated timestamps

**Exclusions**: `org_id` (internal), `is_deleted` (internal)

#### 2. Borrower Entity
**Fields exported**:
- Personal info (name, email, phone, SSN - masked)
- Address information
- Financial info (FICO, income - if on file)
- Citizenship status

**Exclusions**: Internal IDs  
**Redactions**: SSN shown as `***-**-1234`

#### 3. Deal Entity
**Fields exported**:
- Deal number, loan product, purpose
- Loan amounts, rates, terms
- Property information (via DealProperty join)
- Application channel, dates
- Current stage/status

**Exclusions**: Internal processing notes (if marked confidential)

#### 4. Document Entity
**Fields exported**:
- Document name, type, category
- Upload date, status
- **Document file URL** (signed URL, 30-day expiry)

**Exclusions**: Documents uploaded by other users (not the requester)

#### 5. Communications Log
**Fields exported**:
- Channel (email, SMS, portal)
- Direction (inbound/outbound)
- Subject, body (if requester is sender/recipient)
- Timestamps

**Exclusions**: Communications where requester not a party  
**Redactions**: Other parties' contact info masked

#### 6. Task Entity
**Fields exported**:
- Title, description
- Status, priority
- Due dates
- Only tasks assigned to requester OR related to their deals

#### 7. Audit Log (Redacted)
**Fields exported**:
- Actions taken on requester's data
- Timestamps, action types
- WHO accessed their data (user email)

**Exclusions**: System-level logs unrelated to requester  
**Redactions**: Other users' personal info

### Entities Excluded
- Internal system entities (OrgSettings, Roles, etc.)
- Other users' data
- Aggregated analytics (not personal data)
- AI provider configs, integration configs

## Export Format

### Primary Format: JSON
```json
{
  "export_metadata": {
    "request_id": "PR-20260120-0001",
    "requester_email": "john@example.com",
    "export_date": "2026-01-20T10:00:00Z",
    "jurisdiction": "GDPR",
    "data_controller": "LoanGenius Inc.",
    "contact_email": "privacy@loangenius.com"
  },
  "data_categories": {
    "leads": [...],
    "borrowers": [...],
    "deals": [...],
    "documents": [...],
    "communications": [...],
    "tasks": [...],
    "audit_logs": [...]
  },
  "processing_information": {
    "purposes": [
      "Loan origination and servicing",
      "Regulatory compliance",
      "Communication with borrower"
    ],
    "legal_basis": "Contract performance, Legal obligation, Legitimate interest",
    "retention_period": "7 years from loan closure (regulatory requirement)",
    "recipients": [
      "Loan processors",
      "Underwriters",
      "Third-party lenders (with consent)",
      "Service providers (cloud hosting, email)"
    ],
    "international_transfers": "None" or "List countries"
  }
}
```

### Optional Format: CSV Summary
Simplified tabular export with one row per record type:
```csv
Category,Record Count,Date Range,Sample Data
Leads,3,2024-01-01 to 2025-12-31,Lead #1: DSCR loan inquiry...
Borrowers,1,2025-03-15,Application for loan #LG-202503-0042
Documents,12,2025-03-20 to 2025-12-01,Bank statements, Tax returns, etc.
...
```

## GDPR Access Request Requirements (Article 15)

Export must include:
1. **Confirmation** that we process their personal data
2. **Purposes** of processing
3. **Categories** of personal data
4. **Recipients** or categories of recipients
5. **Retention period** (or criteria to determine period)
6. **Right to rectification, erasure, restriction**
7. **Right to lodge a complaint** with supervisory authority
8. **Source** of data (if not collected from data subject)
9. **Existence of automated decision-making** (if applicable)

We include all of this in the `processing_information` section.

## Generation Process

### Step 1: Query All Relevant Data
```sql
-- Find all records matching requester email/phone
SELECT * FROM leads WHERE home_email = [email] OR mobile_phone = [phone];
SELECT * FROM borrowers WHERE email = [email];
-- Join to deals, documents, etc.
```

### Step 2: Apply Redactions
- SSN: Show only last 4
- Other users' emails: Mask as `u***r@example.com`
- Confidential notes: Exclude entirely

### Step 3: Generate JSON
- Use deterministic ordering (sort by created_date)
- Pretty-print for readability
- Include metadata section

### Step 4: Package & Encrypt
- Compress JSON to `.zip`
- Encrypt zip file with AES-256
- Password: Auto-generated, sent separately via email

### Step 5: Upload & Generate Signed URL
- Upload to private storage (not public)
- Generate signed URL (30-day expiry)
- Store URL in `export_file_url`

### Step 6: Send to Requester
- Email with download link + password
- Instructions for decryption
- Expiry notice (30 days)

## Reproducibility

Export must be **deterministic**:
- Same input → same output (excluding timestamps in metadata)
- Sort all arrays by `created_date` ascending
- Use consistent field ordering
- Include schema version in metadata

This allows verification: re-run export and compare outputs.

## Testing Checklist

- [ ] Export includes all entity types
- [ ] Redactions applied correctly (SSN, other users)
- [ ] Only requester's data included (org-scoped + requester filter)
- [ ] Documents accessible via signed URLs
- [ ] JSON valid and well-formatted
- [ ] CSV summary matches JSON record counts
- [ ] Processing information complete (GDPR Art. 15)
- [ ] Encryption works, password valid
- [ ] Signed URL expires after 30 days
- [ ] Re-running export produces identical output (deterministic)

---
**Document Version**: 1.0  
**Last Updated**: 2026-01-20  
**Compliance**: GDPR Art. 15, CCPA § 1798.110, CPRA § 7020