# SOC 2 Control Map - LoanGenius

## Overview
Control mapping aligned to SOC 2 Trust Services Criteria (TSC) for Security, Availability, Confidentiality, and Privacy.

---

## Control Summary

| Category | Total Controls | Implemented | Evidence Ready |
|----------|---------------|-------------|----------------|
| Security | 25 | 23 | 20 |
| Availability | 8 | 7 | 6 |
| Confidentiality | 10 | 9 | 8 |
| Privacy | 7 | 5 | 4 |
| **Total** | **50** | **44** | **38** |

**Coverage: 76% evidence ready**

---

## Security Controls (CC Series)

### CC1 - Control Environment

| ID | Control Statement | Implementation | Evidence | Frequency | Owner |
|----|-------------------|----------------|----------|-----------|-------|
| CC1.1 | Organization demonstrates commitment to integrity and ethical values | Code of conduct, security policies | Policy docs, training records | Annual | Admin |
| CC1.2 | Board/management oversight of security program | Documented security responsibilities | RBAC matrix, role assignments | Quarterly | Admin |
| CC1.3 | Organizational structure supports security | RBAC with defined roles | `components/security/RBAC_MATRIX.md` | Continuous | Admin |
| CC1.4 | Commitment to competence | Security training program | Training logs | Annual | Admin |

### CC2 - Communication and Information

| ID | Control Statement | Implementation | Evidence | Frequency | Owner |
|----|-------------------|----------------|----------|-----------|-------|
| CC2.1 | Security policies communicated | Policy documentation available | Policy files, acknowledgments | Annual | Admin |
| CC2.2 | Security incidents communicated | Incident response plan | IR plan, incident reports | As needed | Admin |
| CC2.3 | External communications managed | Vendor management policy | Vendor register | Quarterly | Admin |

### CC3 - Risk Assessment

| ID | Control Statement | Implementation | Evidence | Frequency | Owner |
|----|-------------------|----------------|----------|-----------|-------|
| CC3.1 | Risk assessment performed | ASVS baseline assessment | `components/security/ASVS_BASELINE.md` | Semi-annual | Admin |
| CC3.2 | Fraud risk considered | Access control, audit logging | RBAC, audit logs | Continuous | Admin |
| CC3.3 | Change risk evaluated | Change management policy | PR reviews, CI gates | Per change | DevOps |

### CC4 - Monitoring Activities

| ID | Control Statement | Implementation | Evidence | Frequency | Owner |
|----|-------------------|----------------|----------|-----------|-------|
| CC4.1 | Ongoing monitoring | Alerting system | `components/observability/ALERTING_RUNBOOK.md` | Continuous | DevOps |
| CC4.2 | Deficiencies communicated | Incident process | Incident reports | As needed | Admin |

### CC5 - Control Activities

| ID | Control Statement | Implementation | Evidence | Frequency | Owner |
|----|-------------------|----------------|----------|-----------|-------|
| CC5.1 | Logical access controls | RBAC + org scoping | `functions/rbacHelper.js` | Continuous | DevOps |
| CC5.2 | Infrastructure protected | TLS, encryption at rest | Config, scan results | Continuous | DevOps |
| CC5.3 | Security software deployed | Dependency scanning | npm audit results | Daily | DevOps |

### CC6 - Logical and Physical Access

| ID | Control Statement | Implementation | Evidence | Frequency | Owner |
|----|-------------------|----------------|----------|-----------|-------|
| CC6.1 | Access provisioning | SSO + RBAC | User records, role assignments | Per change | Admin |
| CC6.2 | Access removal | Deactivation process | Access review records | Quarterly | Admin |
| CC6.3 | Access reviewed periodically | Access review process | Review artifacts | Quarterly | Admin |
| CC6.4 | MFA enforced | Google SSO with MFA | SSO config | Continuous | Admin |
| CC6.5 | Authentication credentials protected | Secure cookie, token handling | `AUTH_SESSION_HARDENING.md` | Continuous | DevOps |
| CC6.6 | System boundaries protected | Rate limiting, input validation | `API_SECURITY_CHECKLIST.md` | Continuous | DevOps |
| CC6.7 | Data transmission encrypted | TLS 1.2+ everywhere | SSL scan results | Quarterly | DevOps |
| CC6.8 | Unauthorized access prevented | Session management | Session timeout logs | Continuous | DevOps |

### CC7 - System Operations

| ID | Control Statement | Implementation | Evidence | Frequency | Owner |
|----|-------------------|----------------|----------|-----------|-------|
| CC7.1 | Security events detected | Logging + alerting | Alert catalog, log samples | Continuous | DevOps |
| CC7.2 | Anomalies investigated | Incident response | IR reports | As needed | DevOps |
| CC7.3 | Security incidents evaluated | IR severity classification | IR plan | As needed | Admin |
| CC7.4 | Incidents responded to | IR procedures | Incident reports | As needed | Admin |
| CC7.5 | Recovery procedures | DR plan, restore drills | `BACKUP_DR_PLAN.md`, drill results | Weekly | DevOps |

### CC8 - Change Management

| ID | Control Statement | Implementation | Evidence | Frequency | Owner |
|----|-------------------|----------------|----------|-----------|-------|
| CC8.1 | Changes authorized | PR review required | PR approvals | Per change | DevOps |
| CC8.2 | Changes tested | CI gates | Test results | Per change | DevOps |
| CC8.3 | Changes documented | Commit history, changelogs | Git history | Per change | DevOps |

### CC9 - Risk Mitigation

| ID | Control Statement | Implementation | Evidence | Frequency | Owner |
|----|-------------------|----------------|----------|-----------|-------|
| CC9.1 | Vendor risk managed | Vendor management policy | Vendor register | Quarterly | Admin |
| CC9.2 | Business disruption risk managed | DR plan | Restore drill results | Weekly | DevOps |

---

## Availability Controls (A Series)

| ID | Control Statement | Implementation | Evidence | Frequency | Owner |
|----|-------------------|----------------|----------|-----------|-------|
| A1.1 | System capacity monitored | Performance dashboards | `OBSERVABILITY_DASHBOARD_SPEC.md` | Continuous | DevOps |
| A1.2 | Backup procedures | Automated backups | `BACKUP_DR_PLAN.md` | Daily | DevOps |
| A1.3 | Recovery testing | Restore drills | `DR_TEST_RESULTS.md` | Weekly | DevOps |
| A1.4 | Incident response for availability | IR plan | IR reports | As needed | DevOps |
| A1.5 | DR plan maintained | DR documentation | DR plan, runbooks | Quarterly | DevOps |
| A1.6 | DR tested | DR drills | Drill reports | Monthly | DevOps |
| A1.7 | Alternative processing | Platform redundancy | Platform SLA | Continuous | DevOps |
| A1.8 | System availability monitored | Uptime monitoring | Alert history | Continuous | DevOps |

---

## Confidentiality Controls (C Series)

| ID | Control Statement | Implementation | Evidence | Frequency | Owner |
|----|-------------------|----------------|----------|-----------|-------|
| C1.1 | Confidential data identified | Data classification | `DATA_CLASSIFICATION.md` | Annual | Admin |
| C1.2 | Confidential data protected | Encryption, access control | Encryption config | Continuous | DevOps |
| C1.3 | Confidential data disclosed appropriately | RBAC, audit logging | Access logs | Continuous | Admin |
| C1.4 | Confidential data disposed securely | Retention policy | Deletion logs | Per policy | Admin |
| C1.5 | PII masked in logs | Redaction rules | `LOGGING_STANDARD.md` | Continuous | DevOps |
| C1.6 | PII masked in UI | Field masking | UI code | Continuous | DevOps |
| C1.7 | Encryption at rest | AES-256 | `ENCRYPTION_AND_SECRETS.md` | Continuous | DevOps |
| C1.8 | Encryption in transit | TLS 1.2+ | SSL scan | Quarterly | DevOps |
| C1.9 | Key management | Platform KMS | Key rotation logs | 90 days | DevOps |
| C1.10 | Secret management | No secrets in code | Code scans | Per commit | DevOps |

---

## Privacy Controls (P Series)

| ID | Control Statement | Implementation | Evidence | Frequency | Owner |
|----|-------------------|----------------|----------|-----------|-------|
| P1.1 | Privacy notice provided | TCPA consent | Consent records | Per collection | Legal |
| P1.2 | Consent obtained | TCPA checkbox | Lead records | Per collection | Legal |
| P1.3 | Data collection limited | Purpose limitation | Schema design | Continuous | DevOps |
| P1.4 | Data use limited | Purpose limitation | Access controls | Continuous | Admin |
| P1.5 | Data retention limited | Retention policy | Deletion logs | Per policy | Admin |
| P1.6 | Access requests handled | Process defined | Request logs | As needed | Admin |
| P1.7 | Data quality maintained | Validation | Error logs | Continuous | DevOps |

---

## Evidence Collection Schedule

| Frequency | Evidence Types |
|-----------|----------------|
| Continuous | Audit logs, access logs, alert logs |
| Daily | Dependency scans, backup logs |
| Weekly | Restore drill results |
| Monthly | DR drill reports |
| Quarterly | Access reviews, vendor reviews |
| Semi-annual | ASVS assessment, policy reviews |
| Annual | Training records, policy acknowledgments |

---

## Change Log
- 2026-01-20: Initial SOC 2 control map created