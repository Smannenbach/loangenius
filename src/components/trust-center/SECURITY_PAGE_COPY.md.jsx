# Security Overview - LoanGenius

**Last Updated:** January 20, 2026  
**Version:** 1.0

---

## Our Commitment

LoanGenius is committed to protecting your data with enterprise-grade security controls. We align our security practices with industry standards including SOC 2 Trust Services Criteria and OWASP guidelines.

> **Note:** We follow SOC 2 security principles but do not currently hold a SOC 2 Type II certification. We are building toward formal certification.

---

## Authentication & Access Control

### How We Protect Access
- **Single Sign-On (SSO):** Google SSO integration with support for multi-factor authentication
- **Role-Based Access Control (RBAC):** Users are assigned specific roles (Admin, Loan Officer, Processor, etc.) with minimum necessary permissions
- **Organization Isolation:** Each organization's data is completely isolated from others
- **Session Security:** 30-minute idle timeout, 8-hour absolute timeout, secure cookie handling

### What This Means for You
Your team members can only access the data they need for their role. We don't use shared accounts, and every action is tied to an individual user.

---

## Encryption

### Data in Transit
- **TLS 1.2+** for all connections
- No mixed content allowed
- Modern cipher suites only

### Data at Rest
- **AES-256** encryption for sensitive data
- Encryption keys managed by platform key management service
- Key rotation every 90 days

### What We Encrypt
- Social Security Numbers
- Bank account information
- Tax identification numbers
- Uploaded documents
- All borrower PII

---

## Monitoring & Logging

### What We Monitor
- Authentication events (login, logout, failures)
- Authorization decisions (access granted/denied)
- Data access and modifications
- System performance and errors
- Security anomalies

### Alert Response
We maintain 24/7 automated monitoring with alerts for:
- Unusual login patterns
- Elevated error rates
- Performance degradation
- Security anomalies

### Log Protection
- Logs are stored securely and cannot be modified
- Sensitive data is never logged (passwords, SSNs, etc.)
- Logs retained per compliance requirements

---

## Vulnerability Management

### Continuous Scanning
- Dependencies scanned on every build
- Known vulnerabilities tracked with remediation SLAs
- License compliance verified

### Remediation SLAs
| Severity | Timeline |
|----------|----------|
| Critical | 24 hours |
| High | 7 days |
| Medium | 30 days |
| Low | 90 days |

### Responsible Disclosure
Found a security issue? Contact us at security@loangenius.io. We appreciate responsible disclosure.

---

## Backup & Disaster Recovery

### Backup Strategy
- **Daily full backups** with 30-day retention
- **6-hour incremental backups** for minimal data loss
- Encrypted backup storage
- Geographically separated backup location

### Recovery Targets
| Metric | Target |
|--------|--------|
| Recovery Point Objective (RPO) | 1 hour |
| Recovery Time Objective (RTO) | 4 hours |

### Testing
We conduct **weekly restore drills** to verify our ability to recover data. Our last successful drill was completed on January 20, 2026.

---

## Incident Response

### Our Process
We follow a structured incident response process based on NIST guidelines:

1. **Detection:** Automated monitoring and alerting
2. **Triage:** Severity assessment and team assignment
3. **Containment:** Limit impact and preserve evidence
4. **Eradication:** Remove the threat
5. **Recovery:** Restore normal operations
6. **Review:** Post-incident analysis and improvements

### Customer Notification
For incidents affecting your data:
- **Critical incidents:** Notification within 24 hours
- **High incidents:** Notification within 72 hours
- We provide clear information about what happened and what we're doing

### Contact
- Security issues: security@loangenius.io
- General support: support@loangenius.io

---

## Compliance Alignment

### Frameworks We Align To
- **SOC 2 Trust Services Criteria** (Security, Availability, Confidentiality)
- **OWASP Application Security Verification Standard (ASVS)** Level 2
- **NIST** guidelines for incident response and PII protection
- **GLBA** Safeguards Rule requirements

### Regulatory Considerations
LoanGenius supports compliance with mortgage industry regulations including:
- TRID/TILA-RESPA
- ECOA
- FCRA
- State privacy laws

---

## Questions?

For security-related inquiries:
- **Email:** security@loangenius.io
- **Request Security Documentation:** Available through our Trust Center

We're happy to discuss our security practices with prospective and current customers.