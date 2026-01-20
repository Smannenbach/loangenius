# Alerting Runbook - LoanGenius

## Overview
Alert definitions, thresholds, investigation steps, and mitigation procedures.

---

## Alert Summary

| Alert | Severity | Threshold | Check First |
|-------|----------|-----------|-------------|
| Error Rate Spike | 🔴 Critical | > 10% for 5min | Error logs |
| P95 Latency Spike | 🟠 High | > 5s for 10min | Slow queries |
| Import Failures | 🟠 High | > 50% failure for 15min | Import logs |
| Export Failures | 🟠 High | > 50% failure for 15min | Export logs |
| Fatal Frontend Error | 🔴 Critical | > 10/min | Error boundary |
| Auth Failures | 🟠 High | > 100/5min | Login attempts |
| Zero Requests | 🔴 Critical | 0 requests for 2min | Service health |

---

## Alert 1: Error Rate Spike

### Definition
```
Condition: (errors / total_requests) > 0.10
Window: 5 minutes rolling
Severity: Critical
```

### What It Means
More than 10% of requests are failing. Users are experiencing errors.

### Investigation Steps
1. **Check error logs**
   ```javascript
   // Query recent errors
   AuditLog.filter({
     action_type: 'LOG_ERROR',
     created_date: { $gte: last15min }
   }).sort('-created_date').limit(50)
   ```

2. **Identify error pattern**
   - All errors same type? → Likely single root cause
   - Errors across many types? → Likely infrastructure issue
   - Errors from one org? → Likely data issue

3. **Check recent deploys**
   - When was last deploy?
   - What changed?

4. **Check external dependencies**
   - Google APIs responding?
   - Lender APIs responding?

### Mitigation Steps
1. **If caused by recent deploy**: Rollback immediately
2. **If external API issue**: Enable fallback/cache mode
3. **If database issue**: Check connection pool, query performance
4. **If unknown**: Enable verbose logging, alert on-call

### Rollback Procedure
```bash
# Identify last good version
git log --oneline -10

# Revert to last good version
git revert HEAD~1

# Or hotfix deploy previous version
npm run deploy:rollback
```

---

## Alert 2: P95 Latency Spike

### Definition
```
Condition: p95(request_duration_ms) > 5000
Window: 10 minutes rolling
Severity: High
```

### What It Means
The slowest 5% of requests are taking more than 5 seconds.

### Investigation Steps
1. **Identify slow endpoints**
   ```javascript
   // Find slowest endpoints
   SELECT route, percentile_cont(0.95) as p95
   FROM request_metrics
   WHERE timestamp > NOW() - INTERVAL '15 minutes'
   GROUP BY route
   ORDER BY p95 DESC
   LIMIT 10
   ```

2. **Check for resource contention**
   - High CPU usage?
   - Memory pressure?
   - Connection pool exhausted?

3. **Check database queries**
   - Large result sets?
   - Missing indexes?
   - Lock contention?

4. **Check external API latency**
   - Google APIs slow?
   - Lender APIs timing out?

### Mitigation Steps
1. **If database query issue**:
   - Add missing indexes
   - Optimize query
   - Add pagination

2. **If external API slow**:
   - Increase timeout
   - Enable caching
   - Use fallback data

3. **If resource exhaustion**:
   - Scale up
   - Shed load (rate limit)

---

## Alert 3: Import Failures Spike

### Definition
```
Condition: (failed_imports / total_imports) > 0.50
Window: 15 minutes rolling
Severity: High
```

### What It Means
More than half of import jobs are failing.

### Investigation Steps
1. **Check import logs**
   ```javascript
   ImportRun.filter({
     status: 'failed',
     created_date: { $gte: last30min }
   })
   ```

2. **Common failure reasons**:
   - Google Sheets auth expired
   - Invalid CSV format
   - Validation errors (bad data)
   - Rate limiting

3. **Check Google Sheets connector**
   - Token valid?
   - Quota exceeded?

### Mitigation Steps
1. **If auth issue**:
   - Re-authorize Google Sheets connector
   - Refresh token

2. **If rate limit**:
   - Implement backoff
   - Queue imports

3. **If data validation**:
   - Check source data quality
   - Relax validation temporarily

---

## Alert 4: Export Failures Spike

### Definition
```
Condition: (failed_exports / total_exports) > 0.50
Window: 15 minutes rolling
Severity: High
```

### What It Means
More than half of export jobs are failing.

### Investigation Steps
1. **Check export logs**
   ```javascript
   AuditLog.filter({
     action_type: { $in: ['EXPORT_MISMO', 'EXPORT_PDF', 'EXPORT_CSV'] },
     outcome: 'failure',
     created_date: { $gte: last30min }
   })
   ```

2. **Common failure reasons**:
   - PDF generation timeout
   - MISMO validation errors
   - File storage issues

### Mitigation Steps
1. **If timeout**:
   - Increase timeout
   - Optimize export logic
   - Add progress tracking

2. **If validation**:
   - Check data completeness
   - Review validation rules

---

## Alert 5: Fatal Frontend Error Spike

### Definition
```
Condition: fatal_frontend_errors > 10 per minute
Window: 1 minute rolling
Severity: Critical
```

### What It Means
Users are seeing blank screens or completely broken UI.

### Investigation Steps
1. **Check error boundary logs**
   ```javascript
   AuditLog.filter({
     action_type: 'FRONTEND_FATAL',
     created_date: { $gte: last5min }
   })
   ```

2. **Common causes**:
   - JavaScript bundle failed to load
   - Uncaught exception in render
   - Missing data causing null reference
   - Third-party script failure

3. **Check browser console for patterns**

### Mitigation Steps
1. **If bundle issue**: Rollback immediately
2. **If data issue**: Fix null checks, add fallbacks
3. **If third-party**: Remove/disable third-party script
4. **Notify affected users** if widespread

---

## Alert 6: Auth Failures Spike

### Definition
```
Condition: login_failures > 100
Window: 5 minutes rolling
Severity: High
```

### What It Means
Unusual number of failed login attempts. Could be:
- Credential stuffing attack
- Auth service issue
- Legitimate users locked out

### Investigation Steps
1. **Check auth logs**
   ```javascript
   AuditLog.filter({
     action_type: 'AUTH_LOGIN_FAILED',
     created_date: { $gte: last15min }
   })
   ```

2. **Pattern analysis**:
   - Same IP? → Potential attack
   - Same user? → Account issue
   - Many users? → Auth service issue

3. **Check auth provider status**

### Mitigation Steps
1. **If attack**:
   - Enable rate limiting on login
   - Block suspicious IPs
   - Enable CAPTCHA

2. **If service issue**:
   - Check SSO provider status
   - Switch to backup auth if available

---

## Alert 7: Zero Requests

### Definition
```
Condition: request_count = 0
Window: 2 minutes rolling
Severity: Critical
```

### What It Means
No traffic at all. Service might be completely down.

### Investigation Steps
1. **Check service health**
   - Can you load the app?
   - DNS resolving?
   - SSL certificate valid?

2. **Check infrastructure**
   - Deployment running?
   - Network connectivity?

3. **Check load balancer/CDN**
   - Routing correctly?
   - Health checks passing?

### Mitigation Steps
1. **If deployment issue**: Restart/redeploy
2. **If DNS issue**: Check DNS provider
3. **If SSL issue**: Renew/fix certificate
4. **If infrastructure**: Contact Base44 support

---

## Escalation Matrix

| Severity | Response Time | Who to Contact |
|----------|---------------|----------------|
| 🔴 Critical | Immediate | On-call engineer + Team lead |
| 🟠 High | 15 minutes | On-call engineer |
| 🟡 Medium | 1 hour | Next available engineer |
| 🟢 Low | Next business day | Ticket queue |

---

## On-Call Contact

### Primary
- Slack: #loangenius-alerts
- Email: oncall@loangenius.com

### Escalation
1. Primary on-call (5 min)
2. Secondary on-call (10 min)
3. Team lead (15 min)
4. Engineering manager (30 min)

---

## Post-Incident

### Required Actions
1. Acknowledge alert in system
2. Document actions taken
3. Create incident ticket if unresolved > 30min
4. Post-mortem for any Critical alert
5. Update runbook if new mitigation discovered

### Post-Mortem Template
```markdown
## Incident: [Title]
Date: [Date]
Duration: [Start - End]
Severity: [Critical/High/Medium]

### Summary
[What happened]

### Impact
[Who was affected, how many users]

### Timeline
- [Time]: Alert fired
- [Time]: Investigation started
- [Time]: Root cause identified
- [Time]: Mitigation applied
- [Time]: Resolved

### Root Cause
[Technical explanation]

### Mitigation
[What we did to fix it]

### Prevention
[What we'll do to prevent recurrence]

### Action Items
- [ ] [Task 1]
- [ ] [Task 2]
```

---

## Change Log
- 2026-01-20: Initial alerting runbook created