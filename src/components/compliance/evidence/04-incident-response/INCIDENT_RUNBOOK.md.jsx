# Incident Response Runbook - LoanGenius

## Quick Reference

### Severity Classification
| Level | Impact | Response Time | Examples |
|-------|--------|---------------|----------|
| P1 Critical | System down, data breach | 15 min | Outage, PII exposed |
| P2 High | Major feature broken | 1 hour | Auth failure |
| P3 Medium | Feature degraded | 4 hours | Slow performance |
| P4 Low | Minor issue | Next day | Cosmetic bug |

### Escalation Contacts
| Role | Channel | When |
|------|---------|------|
| On-Call | #oncall-alerts | Always first |
| Team Lead | Direct message | P1/P2 after 15 min |
| Management | Phone | P1 after 30 min |

---

## Triage Steps

### Step 1: Acknowledge (2 min)
```
1. Acknowledge alert in monitoring system
2. Join #incidents channel
3. Post: "Investigating [alert name]"
```

### Step 2: Assess (5 min)
```
1. What is broken?
2. Who is affected?
3. Is data at risk?
4. Assign severity level
```

### Step 3: Communicate (5 min)
```
1. Post severity + summary to #incidents
2. If P1/P2: Notify escalation chain
3. Assign Incident Commander
```

---

## Response by Incident Type

### Authentication Failure
1. Check SSO provider status
2. Review auth logs for errors
3. Verify session management
4. If compromise suspected: disable affected accounts

### Data Breach
1. STOP: Contain immediately
2. Identify scope of exposure
3. Preserve evidence
4. Notify legal/compliance
5. Prepare customer notification

### Service Outage
1. Check platform status
2. Review recent deployments
3. Consider rollback
4. Implement fix or failover

### Performance Degradation
1. Check system metrics
2. Identify bottleneck
3. Scale or optimize
4. Monitor recovery

---

## Communication Templates

### Internal Update
```
INCIDENT UPDATE - [Severity]
Status: [Investigating/Mitigating/Resolved]
Impact: [Description]
Next update: [Time]
Lead: [Name]
```

### Customer Notification (if needed)
```
We are experiencing [issue description].
Impact: [What customers see]
Status: Our team is actively working on resolution.
Updates: [Where to find updates]
```

---

## Post-Incident

### Within 24 hours
- [ ] All-clear communicated
- [ ] Incident ticket closed
- [ ] Timeline documented

### Within 48 hours
- [ ] Post-mortem scheduled
- [ ] Root cause identified
- [ ] Action items assigned

### Within 1 week
- [ ] Post-mortem completed
- [ ] Action items in progress
- [ ] Lessons learned shared