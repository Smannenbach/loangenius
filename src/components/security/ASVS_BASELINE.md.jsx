# ASVS Security Baseline - LoanGenius

## Overview
Security controls mapped to OWASP Application Security Verification Standard (ASVS) Level 2.

---

## Target Level: ASVS Level 2

**Why Level 2:**
- Application handles sensitive financial data (PII, loan info)
- Multi-tenant with strict isolation requirements
- Regulatory compliance expectations (GLBA, etc.)
- Not mission-critical infrastructure (Level 3 not required)

---

## Control Mapping

### V1: Architecture, Design and Threat Modeling

| Control | Requirement | Status | Notes |
|---------|-------------|--------|-------|
| V1.1.1 | Secure development lifecycle | ✅ | CI gates, code review |
| V1.1.2 | Threat model documentation | ⚠️ | Partial - needs formal doc |
| V1.2.1 | Authentication architecture | ✅ | SSO + session management |
| V1.4.1 | Access control architecture | ✅ | RBAC implemented |
| V1.5.1 | Input validation architecture | ✅ | Server-side validation |

### V2: Authentication

| Control | Requirement | Status | Notes |
|---------|-------------|--------|-------|
| V2.1.1 | Passwords >= 12 chars | ✅ | Via Google SSO |
| V2.1.2 | Password >= 64 chars allowed | ✅ | Via Google SSO |
| V2.2.1 | Anti-automation controls | ✅ | Rate limiting |
| V2.2.2 | Brute force protection | ✅ | Account lockout |
| V2.5.1 | Credential recovery secure | ✅ | Via Google SSO |
| V2.7.1 | OOB verifier (OTP) | ⚠️ | Partial (phone OTP) |
| V2.8.1 | MFA support | ✅ | Via Google SSO |

### V3: Session Management

| Control | Requirement | Status | Notes |
|---------|-------------|--------|-------|
| V3.1.1 | Session IDs not in URL | ✅ | Cookie-based only |
| V3.2.1 | Session ID regeneration | ✅ | On auth |
| V3.2.2 | Session ID random | ✅ | 256-bit |
| V3.3.1 | Logout terminates session | ✅ | Server-side |
| V3.3.2 | Idle timeout | ✅ | 30 minutes |
| V3.3.3 | Absolute timeout | ✅ | 8 hours |
| V3.4.1 | Secure cookie flags | ✅ | HttpOnly, Secure, SameSite |
| V3.5.1 | Token-based session secure | ✅ | Implemented |

### V4: Access Control

| Control | Requirement | Status | Notes |
|---------|-------------|--------|-------|
| V4.1.1 | Access control at server | ✅ | All backend functions |
| V4.1.2 | Deny by default | ✅ | Explicit allow required |
| V4.1.3 | Least privilege | ✅ | RBAC roles |
| V4.2.1 | Sensitive data access control | ✅ | Role-based |
| V4.2.2 | Directory listing disabled | ✅ | No public listings |
| V4.3.1 | Admin functions protected | ✅ | Admin role required |
| V4.3.2 | Multi-tenant isolation | ✅ | Org_id scoping |

### V5: Validation, Sanitization and Encoding

| Control | Requirement | Status | Notes |
|---------|-------------|--------|-------|
| V5.1.1 | Input validation server-side | ✅ | Schema validation |
| V5.1.2 | Framework auto-escaping | ✅ | React JSX |
| V5.2.1 | HTML sanitization | ✅ | DOMPurify pattern |
| V5.2.2 | Unstructured data sanitized | ✅ | Sanitize functions |
| V5.3.1 | Output encoding | ✅ | JSON + HTML encoding |
| V5.3.3 | Context-aware encoding | ✅ | Per-context functions |
| V5.5.1 | Deserialization safe | ✅ | JSON only |

### V6: Stored Cryptography

| Control | Requirement | Status | Notes |
|---------|-------------|--------|-------|
| V6.1.1 | Regulated data encrypted | ✅ | AES-256 |
| V6.2.1 | Approved algorithms | ✅ | AES-GCM, SHA-256 |
| V6.2.2 | Key management | ✅ | Platform KMS |
| V6.3.1 | Random values secure | ✅ | crypto.getRandomValues |

### V7: Error Handling and Logging

| Control | Requirement | Status | Notes |
|---------|-------------|--------|-------|
| V7.1.1 | No sensitive data in errors | ✅ | Generic errors |
| V7.1.2 | Error handling consistent | ✅ | Standard format |
| V7.2.1 | Security events logged | ✅ | AuditLog entity |
| V7.2.2 | Log integrity | ✅ | Server-side only |
| V7.3.1 | No sensitive data in logs | ✅ | Redaction rules |
| V7.4.1 | Time sync in logs | ✅ | Server timestamp |

### V8: Data Protection

| Control | Requirement | Status | Notes |
|---------|-------------|--------|-------|
| V8.1.1 | PII data classification | ✅ | DATA_CLASSIFICATION.md |
| V8.2.1 | Sensitive data not cached | ✅ | no-store headers |
| V8.3.1 | Sensitive data in memory cleared | ⚠️ | Partial |
| V8.3.4 | PII masking in UI | ✅ | SSN, accounts masked |

### V9: Communications

| Control | Requirement | Status | Notes |
|---------|-------------|--------|-------|
| V9.1.1 | TLS everywhere | ✅ | Enforced |
| V9.1.2 | TLS 1.2+ only | ✅ | Configured |
| V9.2.1 | Strong cipher suites | ✅ | Configured |

### V10: Malicious Code

| Control | Requirement | Status | Notes |
|---------|-------------|--------|-------|
| V10.1.1 | Code integrity verified | ✅ | npm integrity |
| V10.2.1 | No unnecessary code | ⚠️ | Ongoing cleanup |
| V10.3.1 | Dependencies monitored | ✅ | npm audit in CI |

### V11: Business Logic

| Control | Requirement | Status | Notes |
|---------|-------------|--------|-------|
| V11.1.1 | Business logic server-side | ✅ | All in backend |
| V11.1.2 | Process flow enforced | ✅ | State machine |

### V12: Files and Resources

| Control | Requirement | Status | Notes |
|---------|-------------|--------|-------|
| V12.1.1 | File upload size limits | ✅ | 25MB max |
| V12.1.2 | File type validation | ✅ | Whitelist + magic bytes |
| V12.3.1 | File metadata validated | ✅ | Sanitized |
| V12.4.1 | Files not directly accessible | ✅ | Signed URLs |
| V12.5.1 | File download authorized | ✅ | Per-request check |

### V13: API and Web Service

| Control | Requirement | Status | Notes |
|---------|-------------|--------|-------|
| V13.1.1 | Same access control as UI | ✅ | RBAC |
| V13.1.3 | API versioning | ⚠️ | Implicit |
| V13.2.1 | RESTful security | ✅ | Implemented |
| V13.2.3 | API rate limiting | ✅ | Per-endpoint |

### V14: Configuration

| Control | Requirement | Status | Notes |
|---------|-------------|--------|-------|
| V14.1.1 | Consistent build process | ✅ | CI/CD |
| V14.2.1 | Disable debug in prod | ✅ | Env-based |
| V14.3.1 | Security headers | ✅ | All set |
| V14.4.1 | Dependencies up to date | ⚠️ | Ongoing |

---

## Compliance Summary

| Section | Total | Compliant | Partial | Gap |
|---------|-------|-----------|---------|-----|
| V1 Architecture | 5 | 4 | 1 | 0 |
| V2 Authentication | 7 | 6 | 1 | 0 |
| V3 Session | 8 | 8 | 0 | 0 |
| V4 Access Control | 7 | 7 | 0 | 0 |
| V5 Validation | 7 | 7 | 0 | 0 |
| V6 Cryptography | 4 | 4 | 0 | 0 |
| V7 Logging | 5 | 5 | 0 | 0 |
| V8 Data Protection | 4 | 3 | 1 | 0 |
| V9 Communications | 3 | 3 | 0 | 0 |
| V10 Malicious Code | 3 | 2 | 1 | 0 |
| V12 Files | 5 | 5 | 0 | 0 |
| V13 API | 4 | 3 | 1 | 0 |
| V14 Configuration | 4 | 3 | 1 | 0 |
| **Total** | **66** | **60** | **6** | **0** |

**Overall Compliance: 91% (Level 2)**

---

## Gap Remediation Plan

| Gap | Priority | Effort | Target Date |
|-----|----------|--------|-------------|
| Formal threat model | Medium | 1 week | Q2 2026 |
| OTP for all users | Low | 2 weeks | Q2 2026 |
| Memory clearing | Low | 1 week | Q2 2026 |
| Code cleanup | Low | Ongoing | - |
| API versioning | Low | 1 week | Q2 2026 |
| Dependency updates | Medium | Ongoing | - |

---

## Verification Schedule

| Activity | Frequency |
|----------|-----------|
| Automated security tests | Every build |
| Dependency scan | Daily |
| Manual security review | Quarterly |
| Penetration test | Annual |
| ASVS self-assessment | Semi-annual |

---

## Change Log
- 2026-01-20: Initial ASVS baseline assessment