# Data Retention and Disposal Policy - LoanGenius

**Version:** 1.0  
**Effective Date:** 2026-01-20  
**Owner:** Administration  
**Review Frequency:** Annual

---

## Purpose
Define retention periods and secure disposal procedures for all data types.

---

## Scope
All data stored in LoanGenius including:
- Business data (deals, leads, contacts)
- Documents (loan files, IDs, financial docs)
- System data (logs, backups)
- User data (accounts, preferences)

---

## Retention Periods

### Business Data

| Data Type | Retention | Basis |
|-----------|-----------|-------|
| Funded loan files | 7 years from close | TRID, RESPA |
| Denied/withdrawn applications | 3 years | ECOA |
| Lead data (not converted) | 2 years | Business need |
| Contact data | Until deletion request | Business need |
| Borrower data | Per loan file retention | Regulatory |
| Property data | Per loan file retention | Regulatory |
| Communication logs | 7 years | Regulatory |

### Documents

| Document Type | Retention | Basis |
|---------------|-----------|-------|
| Loan documents | 7 years | Regulatory |
| ID documents | 7 years | KYC |
| Financial statements | 7 years | Regulatory |
| Credit reports | 7 years | Regulatory |
| Appraisals | 7 years | Regulatory |
| Disclosures | 7 years | TRID |

### System Data

| Data Type | Retention | Basis |
|-----------|-----------|-------|
| Audit logs | 7 years | Compliance |
| Authentication logs | 2 years | Security |
| Error logs | 1 year | Operations |
| Performance metrics | 90 days (detailed) | Operations |
| Performance metrics | 1 year (aggregated) | Operations |
| Backups | Per backup policy | DR |

### User Data

| Data Type | Retention | Basis |
|-----------|-----------|-------|
| Active user accounts | While active | Business |
| Inactive user accounts | 2 years | Security |
| User preferences | With account | Business |
| Session data | 24 hours | Security |

---

## Retention Start

| Data Type | Retention Starts |
|-----------|------------------|
| Funded loans | Closing date |
| Denied applications | Decision date |
| Leads | Creation date |
| Documents | Upload date |
| Logs | Event timestamp |

---

## Legal Hold

### Process
1. Legal issues hold request
2. Identify affected data
3. Suspend automated deletion
4. Preserve in place
5. Document hold
6. Release when authorized

### Hold Requirements
- Written authorization required
- Scope clearly defined
- Review quarterly
- Release documented

---

## Disposal Procedures

### Soft Delete (Standard)
- Mark record as deleted (`is_deleted: true`)
- Remove from active queries
- Retain for recovery window (30 days)
- Then permanent delete

### Permanent Delete
- Remove all copies
- Remove from backups (where feasible)
- Log deletion event
- Cannot be undone

### Document Disposal
- Delete file from storage
- Remove metadata record
- Clear from CDN cache
- Log deletion

### Secure Deletion Standards
- Standard data: Platform deletion
- Sensitive data: Verify removal from backups
- Physical media: N/A (cloud hosted)

---

## User Deletion Requests

### CCPA/Privacy Requests
1. Verify requester identity
2. Identify all user data
3. Check legal hold status
4. Check regulatory retention requirements
5. Delete permitted data
6. Respond to requester
7. Document request and actions

### What Can Be Deleted
- User preferences
- Non-regulated records
- Marketing data

### What Cannot Be Deleted
- Loan file data (regulatory)
- Audit logs (compliance)
- Data under legal hold

### Response Timeline
- Acknowledge: 10 days
- Complete: 45 days

---

## Archival

### Archive Criteria
- Past active use
- Within retention period
- Not under legal hold

### Archive Process
- Move to archive storage
- Compress if large
- Encrypt at rest
- Document archive location

### Archive Access
- Restore on request
- Admin approval required
- Logged access

---

## Compliance

### Regulatory Requirements
| Regulation | Requirement |
|------------|-------------|
| TRID | 3 years certain records |
| RESPA | 5 years HUD-1 |
| ECOA | 25 months adverse action |
| GLBA | Secure disposal of customer info |
| CCPA | Deletion requests honored |

### Audit Requirements
- Demonstrate retention compliance
- Show disposal procedures followed
- Provide retention schedule

---

## Responsibilities

| Role | Responsibility |
|------|----------------|
| Admin | Policy maintenance, exceptions |
| DevOps | Automated deletion implementation |
| Legal | Legal hold management |
| All users | Follow retention policy |

---

## Exceptions

### Exception Process
1. Request with business justification
2. Risk assessment
3. Legal/compliance review
4. Admin approval
5. Document exception
6. Set review date

---

## Change Log
| Date | Version | Change |
|------|---------|--------|
| 2026-01-20 | 1.0 | Initial policy |