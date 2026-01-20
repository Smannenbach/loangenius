# Data Classification Policy - LoanGenius

## Overview
Classification and handling rules for all data in LoanGenius, with special focus on PII and sensitive financial data.

---

## Data Classification Levels

| Level | Label | Description | Examples |
|-------|-------|-------------|----------|
| **1** | Public | Non-sensitive, can be shared freely | Marketing content, public rates |
| **2** | Internal | Business data, internal use | Deal counts, pipeline metrics |
| **3** | Confidential | Sensitive business data | Loan terms, pricing, lender info |
| **4** | Restricted | PII + Financial data | SSN, bank accounts, income docs |

---

## PII Inventory

### Category 1: Direct Identifiers (Restricted)
| Field | Entity | Classification | Handling |
|-------|--------|----------------|----------|
| SSN / Tax ID | Borrower | **Restricted** | Encrypt, mask in UI, never log |
| EIN | Entity | **Restricted** | Encrypt, mask in UI, never log |
| Date of Birth | Borrower | **Restricted** | Encrypt, mask year in logs |
| Driver's License # | Document | **Restricted** | Encrypt, never log |
| Passport # | Document | **Restricted** | Encrypt, never log |

### Category 2: Contact Information (Confidential)
| Field | Entity | Classification | Handling |
|-------|--------|----------------|----------|
| Full Name | Borrower, Lead, Contact | Confidential | Hash in logs |
| Email Address | All | Confidential | Mask in logs (j***@domain.com) |
| Phone Number | All | Confidential | Mask in logs (***-***-1234) |
| Physical Address | Property, Borrower | Confidential | Mask street in logs |

### Category 3: Financial Data (Restricted)
| Field | Entity | Classification | Handling |
|-------|--------|----------------|----------|
| Bank Account # | BorrowerAsset | **Restricted** | Encrypt, show last 4 only |
| Routing Number | BorrowerAsset | **Restricted** | Encrypt, never display full |
| Credit Score | Borrower, Lead | Confidential | Log as range only |
| Income | Borrower | Confidential | Log as range only |
| Net Worth | Borrower | Confidential | Log as range only |
| Loan Balance | Deal | Confidential | Standard handling |

### Category 4: Documents (Restricted)
| Document Type | Classification | Handling |
|---------------|----------------|----------|
| Bank Statements | **Restricted** | Encrypted storage, audit access |
| Tax Returns | **Restricted** | Encrypted storage, audit access |
| Pay Stubs | **Restricted** | Encrypted storage, audit access |
| W-2 / 1099 | **Restricted** | Encrypted storage, audit access |
| ID Documents | **Restricted** | Encrypted storage, audit access |
| Credit Reports | **Restricted** | Encrypted storage, audit access |

---

## Handling Rules by Classification

### Restricted Data
```
Storage:      Encrypted at rest (AES-256)
Transit:      TLS 1.3 required
Logging:      NEVER log, or fully redacted
Display:      Masked (show last 4 digits max)
Access:       Role-based, audit logged
Retention:    Per compliance requirements (7 years for loan files)
Deletion:     Secure deletion with audit trail
```

### Confidential Data
```
Storage:      Standard encrypted storage
Transit:      TLS required
Logging:      Masked/hashed only
Display:      Can display to authorized users
Access:       Role-based
Retention:    Business need + compliance
Deletion:     Standard deletion
```

### Internal Data
```
Storage:      Standard storage
Transit:      TLS required
Logging:      Can log with care
Display:      Internal users only
Access:       Authenticated users
Retention:    Business need
Deletion:     Standard deletion
```

---

## Redaction Rules

### Never Log (Full Redaction)
```javascript
const NEVER_LOG = [
  'ssn', 'social_security_number', 'tax_id',
  'ein', 'employer_id',
  'bank_account_number', 'account_number',
  'routing_number',
  'credit_card_number', 'card_number', 'cvv', 'cvc',
  'password', 'password_hash', 'secret',
  'api_key', 'access_token', 'refresh_token',
  'private_key', 'secret_key'
];
```

### Mask (Partial Redaction)
```javascript
const MASK_RULES = {
  email: (v) => v.replace(/(.{2}).*@/, '$1***@'),
  phone: (v) => v.replace(/\d(?=\d{4})/g, '*'),
  name: (v) => v.split(' ').map(n => n[0] + '***').join(' '),
  address: (v) => v.replace(/^\d+\s+\w+/, '*** ***'),
  dob: (v) => v.replace(/^\d{4}/, '****'),
  ssn_last4: (v) => '***-**-' + v.slice(-4),
  account_last4: (v) => '****' + v.slice(-4)
};
```

### Log as Range Only
```javascript
const RANGE_FIELDS = {
  credit_score: (v) => {
    if (v >= 750) return '750+';
    if (v >= 700) return '700-749';
    if (v >= 650) return '650-699';
    return '<650';
  },
  income: (v) => {
    if (v >= 500000) return '$500K+';
    if (v >= 250000) return '$250K-500K';
    if (v >= 100000) return '$100K-250K';
    return '<$100K';
  }
};
```

---

## Access Control by Data Class

| Data Class | Admin | LO | Processor | UW | Borrower |
|------------|-------|-----|-----------|-----|----------|
| Restricted | ✅ | ✅* | ✅* | ✅ | Own only |
| Confidential | ✅ | ✅* | ✅* | ✅ | Own only |
| Internal | ✅ | ✅ | ✅ | ✅ | ❌ |
| Public | ✅ | ✅ | ✅ | ✅ | ✅ |

*Only for assigned deals/leads

---

## Data Flow Controls

### Data at Rest
- All Restricted data encrypted with AES-256
- Encryption keys managed by platform KMS
- Key rotation every 90 days

### Data in Transit
- TLS 1.3 for all connections
- No mixed content allowed
- Certificate pinning where applicable

### Data in Use
- Memory encryption where supported
- Secure enclaves for sensitive processing
- No sensitive data in browser localStorage

### Data Display
- SSN: Show only when explicitly requested, masked by default
- Bank accounts: Always show last 4 only
- Documents: Watermark with user ID on view

---

## Audit Requirements

### Events to Audit
- View of Restricted data
- Export of any PII
- Modification of sensitive fields
- Document downloads
- Bulk data access

### Audit Log Contents
```javascript
{
  timestamp: ISO8601,
  actor_id: user_id_hash,
  action: 'VIEW_SSN' | 'DOWNLOAD_DOC' | etc,
  data_class: 'restricted' | 'confidential',
  entity_type: 'Borrower',
  entity_id: 'id',
  fields_accessed: ['ssn', 'dob'],  // Which fields
  justification: string,  // Optional business reason
  outcome: 'success' | 'denied'
}
```

---

## Retention & Disposal

| Data Type | Retention Period | Disposal Method |
|-----------|------------------|-----------------|
| Funded Loan Files | 7 years | Secure deletion + audit |
| Denied Applications | 3 years | Secure deletion |
| Lead Data (not converted) | 2 years | Standard deletion |
| Audit Logs | 7 years | Archive then delete |
| Session Data | 24 hours | Auto-expire |

---

## Compliance Mappings

| Regulation | Relevant Data | Our Controls |
|------------|---------------|--------------|
| GLBA | All borrower financial | Encryption, access control, audit |
| CCPA | CA resident PII | Access request handling, deletion |
| FCRA | Credit data | Purpose limitation, disposal |
| ECOA | Application data | Fair lending, non-discrimination |
| TRID | Loan disclosures | Retention, accuracy |

---

## Change Log
- 2026-01-20: Initial data classification policy