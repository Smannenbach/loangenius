# Alert Catalog - LoanGenius

## Alert Summary

| Category | Active Alerts | Enabled |
|----------|---------------|---------|
| Availability | 5 | 5 |
| Performance | 4 | 4 |
| Security | 6 | 6 |
| Business | 3 | 3 |
| **Total** | **18** | **18** |

---

## Availability Alerts

| Alert Name | Condition | Severity | Channel |
|------------|-----------|----------|---------|
| Service Down | HTTP 5xx > 50% for 2 min | Critical | PagerDuty |
| Health Check Failed | /health returns non-200 | Critical | PagerDuty |
| Database Connection | Connection pool exhausted | High | Slack |
| API Timeout Rate | Timeouts > 10% | High | Slack |
| Background Job Failed | Job error > 3 consecutive | Medium | Slack |

---

## Performance Alerts

| Alert Name | Condition | Severity | Channel |
|------------|-----------|----------|---------|
| Latency Spike | P95 > 3s for 5 min | High | Slack |
| Error Rate Elevated | Errors > 5% | High | Slack |
| Slow Query | Query > 5s | Medium | Slack |
| Memory Usage High | > 80% | Medium | Slack |

---

## Security Alerts

| Alert Name | Condition | Severity | Channel |
|------------|-----------|----------|---------|
| Auth Failure Spike | > 50 failures/hour | High | Slack + Email |
| Account Lockout | Any account locked | Medium | Slack |
| Permission Denied Spike | > 20/user/hour | Medium | Slack |
| Rate Limit Exceeded | > 100/hour | Medium | Slack |
| Suspicious Export | > 100 records exported | Medium | Slack |
| Admin Login | Any admin login | Info | Slack |

---

## Business Alerts

| Alert Name | Condition | Severity | Channel |
|------------|-----------|----------|---------|
| Import Failure | Import error rate > 50% | High | Slack |
| Lead Volume Anomaly | < 10% of normal | Medium | Slack |
| Zero Transactions | No activity > 5 min | Medium | Slack |

---

## Alert Response Procedures

### Critical Alerts
1. Acknowledge within 5 minutes
2. Begin investigation immediately
3. Escalate if not resolved in 15 minutes
4. Post updates every 15 minutes

### High Alerts
1. Acknowledge within 15 minutes
2. Investigate and assess impact
3. Escalate if not resolved in 1 hour

### Medium Alerts
1. Acknowledge within 1 hour
2. Investigate during business hours
3. Resolve within 4 hours

### Info Alerts
1. Review during daily log review
2. No immediate action required

---

## Alert Tuning History

| Date | Alert | Change | Reason |
|------|-------|--------|--------|
| 2026-01-20 | Error Rate | Threshold 5% → 5% | Initial setting |
| 2026-01-20 | Auth Failure | Added IP blocking | Reduce noise |