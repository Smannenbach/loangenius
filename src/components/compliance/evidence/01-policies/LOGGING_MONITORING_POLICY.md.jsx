# Logging and Monitoring Policy - LoanGenius

**Version:** 1.0  
**Effective Date:** 2026-01-20  
**Owner:** DevOps  
**Review Frequency:** Annual

---

## Purpose
Establish requirements for logging, monitoring, and alerting to ensure security visibility and operational awareness.

---

## Scope
All LoanGenius systems including:
- Application logs
- Security logs
- Audit logs
- Performance metrics

---

## Logging Requirements

### What Must Be Logged

| Category | Events | Retention |
|----------|--------|-----------|
| Authentication | Login, logout, failed login | 2 years |
| Authorization | Permission denied, role changes | 2 years |
| Data Access | Read/write of sensitive data | 7 years |
| Data Changes | Create, update, delete operations | 7 years |
| Security | Suspicious activity, rate limits | 2 years |
| System | Errors, exceptions, performance | 1 year |

### Required Log Fields
```json
{
  "timestamp": "ISO 8601",
  "level": "info|warn|error|critical",
  "message": "Human-readable description",
  "trace_id": "Correlation ID",
  "org_id": "Organization ID",
  "user_id_hash": "Hashed user identifier",
  "action": "Action performed",
  "entity_type": "Affected entity type",
  "entity_id": "Affected entity ID",
  "outcome": "success|failure|denied",
  "ip_address": "Masked client IP",
  "user_agent": "Client identifier"
}
```

### What Must NOT Be Logged
See: `DATA_CLASSIFICATION.md` for full list

- Passwords or password hashes
- Full SSN, EIN, or tax IDs
- Full bank account or routing numbers
- Credit card numbers
- API keys, tokens, secrets
- Full date of birth
- Unmasked email addresses
- Unmasked phone numbers

---

## Log Protection

### Access Control
| Role | Log Access |
|------|------------|
| Super Admin | Full |
| Admin | Own org |
| DevOps | System logs |
| All others | None |

### Integrity
- Logs written server-side only
- Timestamps from server
- Logs cannot be modified by application users
- Audit trail for log access

### Storage
- Encrypted at rest
- Separate from application data
- Regular backup
- Retention per policy

---

## Monitoring Requirements

### System Monitoring
| Metric | Threshold | Alert |
|--------|-----------|-------|
| Error rate | > 5% | High |
| P95 latency | > 3s | Medium |
| Request rate | > 2x normal | Medium |
| CPU usage | > 80% | Medium |
| Memory usage | > 80% | Medium |

### Security Monitoring
| Event | Threshold | Alert |
|-------|-----------|-------|
| Failed logins | > 5/user/hour | Medium |
| Failed logins | > 50/IP/hour | High |
| Permission denied | > 10/user/hour | Medium |
| Rate limit exceeded | > 100/hour | Medium |
| Suspicious activity | Any | High |

### Business Monitoring
| Metric | Threshold | Alert |
|--------|-----------|-------|
| Import failure rate | > 50% | High |
| Export failure rate | > 50% | High |
| Zero transactions | > 5 min | Critical |

---

## Alert Management

### Alert Channels
| Severity | Channel | Response |
|----------|---------|----------|
| Critical | PagerDuty/Slack | Immediate |
| High | Slack #alerts | 15 min |
| Medium | Slack #alerts | 1 hour |
| Low | Daily digest | Next day |

### Alert Response
1. Acknowledge alert
2. Assess severity
3. Investigate root cause
4. Remediate or escalate
5. Document resolution

### Alert Fatigue Prevention
- Tune thresholds based on data
- Consolidate related alerts
- Review and prune unused alerts
- Regular threshold review

---

## Log Review

### Regular Reviews
| Review | Frequency | Scope |
|--------|-----------|-------|
| Security events | Daily | Failed logins, permission denied |
| Error trends | Weekly | Error patterns, new errors |
| Access patterns | Monthly | Unusual access, privilege use |
| Full audit | Quarterly | All categories |

### Anomaly Detection
- Baseline normal behavior
- Alert on significant deviations
- Investigate anomalies promptly

---

## Retention

| Log Type | Retention | Archive |
|----------|-----------|---------|
| Authentication | 2 years | 7 years |
| Authorization | 2 years | 7 years |
| Data access | 7 years | - |
| Data changes | 7 years | - |
| System logs | 1 year | 3 years |
| Performance | 90 days | 1 year |

### Deletion
- Automated deletion after retention period
- Secure deletion methods
- Deletion logged

---

## Tools

### Logging Infrastructure
- AuditLog entity for audit trail
- Console logs for debugging (dev only)
- Structured JSON format

### Monitoring Dashboard
See: `OBSERVABILITY_DASHBOARD_SPEC.md`

### Alert Configuration
See: `ALERTING_RUNBOOK.md`

---

## Compliance

### Related Standards
- SOC 2 CC7.1, CC7.2
- NIST 800-92 (Log Management)
- CIS Control 8 (Audit Log Management)

---

## Change Log
| Date | Version | Change |
|------|---------|--------|
| 2026-01-20 | 1.0 | Initial policy |