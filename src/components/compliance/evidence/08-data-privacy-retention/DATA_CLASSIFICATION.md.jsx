# Data Classification - LoanGenius

*See also: `components/security/DATA_CLASSIFICATION.md` for full policy*

## Quick Reference

| Level | Label | Examples | Handling |
|-------|-------|----------|----------|
| 4 | Restricted | SSN, bank accounts, tax IDs | Encrypt, mask, never log |
| 3 | Confidential | Names, emails, phones, addresses | Mask in logs, role-based access |
| 2 | Internal | Deal metrics, pipeline data | Authenticated access |
| 1 | Public | Marketing content | No restrictions |

---

## PII Fields by Entity

### Borrower (Restricted + Confidential)
- SSN (Restricted) - Show last 4 only
- Date of birth (Restricted)
- Bank account numbers (Restricted)
- Full name (Confidential)
- Email (Confidential)
- Phone (Confidential)
- Address (Confidential)

### Lead (Confidential)
- Full name
- Email addresses
- Phone numbers
- Property address
- FICO score (range only in logs)

### Document (Restricted)
- Bank statements
- Tax returns
- ID documents
- Credit reports

---

## Access by Role

| Data Type | Admin | LO | Processor | UW | Borrower |
|-----------|-------|-----|-----------|-----|----------|
| SSN (full) | ✅ | ❌ | ❌ | ✅ | Own only |
| SSN (last 4) | ✅ | ✅ | ✅ | ✅ | Own only |
| Bank accounts | ✅ | ✅* | ✅* | ✅ | Own only |
| Contact info | ✅ | ✅* | ✅* | ✅ | Own only |

*Only for assigned deals

---

## Source Document
Full policy: `components/security/DATA_CLASSIFICATION.md