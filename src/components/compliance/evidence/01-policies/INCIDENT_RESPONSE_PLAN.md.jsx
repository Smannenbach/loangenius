# Incident Response Plan - LoanGenius

**Version:** 1.0  
**Effective Date:** 2026-01-20  
**Owner:** Administration  
**Review Frequency:** Annual  
**Framework:** NIST SP 800-61 Rev. 2

---

## Purpose
Establish procedures for detecting, responding to, and recovering from security incidents.

---

## Scope
All security incidents affecting LoanGenius systems, data, or users.

---

## Incident Classification

### Severity Levels
| Level | Description | Examples | Response Time |
|-------|-------------|----------|---------------|
| Critical (P1) | System down, data breach | Production outage, PII exposure | 15 minutes |
| High (P2) | Significant impact | Auth failure, data corruption | 1 hour |
| Medium (P3) | Limited impact | Feature broken, performance degraded | 4 hours |
| Low (P4) | Minimal impact | Minor bug, cosmetic issue | Next business day |

### Incident Types
- Security breach (unauthorized access)
- Data breach (PII exposure)
- Service outage (availability)
- Data integrity (corruption/loss)
- Malware/ransomware
- Denial of service
- Insider threat

---

## Phase 1: Preparation

### Team Roles
| Role | Responsibility |
|------|----------------|
| Incident Commander | Overall coordination, decisions |
| Technical Lead | Technical investigation, remediation |
| Communications Lead | Internal/external communications |
| Scribe | Documentation, timeline |

### Contact List
- Primary On-Call: #oncall-alerts (Slack)
- Secondary Escalation: Team Lead
- Management Escalation: Engineering Manager
- Legal/Compliance: As needed

### Tools and Resources
- Monitoring: Observability dashboards
- Logging: AuditLog entity
- Communication: Slack #incidents
- Documentation: Incident tickets

### Preparation Activities
- [ ] Incident response training (annual)
- [ ] Tabletop exercises (quarterly)
- [ ] Contact list updated (quarterly)
- [ ] Tools access verified (quarterly)

---

## Phase 2: Detection and Analysis

### Detection Sources
| Source | Monitored By | Alert Channel |
|--------|--------------|---------------|
| Error rate spike | Automated monitoring | Slack #alerts |
| Auth failures | AuditLog | Slack #alerts |
| Latency spike | Automated monitoring | Slack #alerts |
| User report | Support channel | Manual triage |
| Security scan | CI/CD | PR/Email |

### Initial Triage
1. **Acknowledge** - Confirm alert received
2. **Assess** - Determine severity and scope
3. **Classify** - Assign incident type and severity
4. **Assign** - Designate incident commander
5. **Communicate** - Notify stakeholders

### Triage Questions
- What systems are affected?
- Is data compromised?
- How many users impacted?
- Is the issue ongoing?
- What is the business impact?

### Analysis Activities
- Review logs for indicators
- Identify affected systems/data
- Determine root cause (if possible)
- Document timeline of events
- Preserve evidence

### Evidence Preservation
- Screenshot relevant logs
- Export audit log entries
- Document system state
- Secure affected accounts
- Do not modify evidence

---

## Phase 3: Containment, Eradication, Recovery

### Containment Strategies
| Incident Type | Containment Action |
|---------------|-------------------|
| Unauthorized access | Disable compromised accounts, rotate credentials |
| Data breach | Isolate affected systems, block access |
| Malware | Isolate affected systems, block network |
| DDoS | Enable rate limiting, block IPs |
| Service outage | Rollback, failover |

### Short-term Containment
- Stop the immediate threat
- Prevent further damage
- Preserve evidence

### Long-term Containment
- Remove threat completely
- Patch vulnerabilities
- Strengthen controls

### Eradication
- Remove malicious code/accounts
- Close vulnerability
- Verify removal complete

### Recovery
- Restore from backup if needed
- Verify system integrity
- Monitor for recurrence
- Gradual return to normal

### Recovery Verification
- [ ] Systems functional
- [ ] Data integrity verified
- [ ] Security controls restored
- [ ] Monitoring in place
- [ ] No indicators of compromise

---

## Phase 4: Post-Incident Activity

### Post-Incident Review
- Schedule within 48-72 hours
- Include all responders
- Blameless approach

### Post-Mortem Template
```markdown
## Incident: [Title]
**Date:** [Date]
**Severity:** [P1/P2/P3/P4]
**Duration:** [Start - End]
**Commander:** [Name]

### Summary
[Brief description]

### Impact
- Users affected: [Count]
- Data affected: [Description]
- Business impact: [Description]

### Timeline
- [Time]: Event
- [Time]: Detection
- [Time]: Response
- [Time]: Resolution

### Root Cause
[Technical explanation]

### What Went Well
- [Item]

### What Could Improve
- [Item]

### Action Items
- [ ] [Action] - Owner - Due date
```

### Lessons Learned
- Update runbooks
- Improve detection
- Strengthen controls
- Training needs

### Reporting Requirements
| Incident Type | Report To | Timeline |
|---------------|-----------|----------|
| Data breach (PII) | Legal, affected users | 72 hours |
| Security breach | Management | 24 hours |
| Service outage | Customers (if SLA) | During incident |

---

## Communication Templates

### Internal Notification
```
INCIDENT ALERT - [Severity]
Type: [Incident type]
Status: [Investigating/Mitigating/Resolved]
Impact: [Description]
Lead: [Name]
Channel: #incidents
```

### External Notification (if needed)
```
We are aware of an issue affecting [description].
Our team is actively working to resolve this.
We will provide updates as available.
```

---

## Escalation Matrix

| Severity | 0-15 min | 15-60 min | 1-4 hours | 4+ hours |
|----------|----------|-----------|-----------|----------|
| Critical | On-call | Lead + Manager | Executive | Executive |
| High | On-call | Lead | Manager | Executive |
| Medium | On-call | Lead | - | Manager |
| Low | Assigned | - | - | - |

---

## Compliance

### Related Standards
- NIST SP 800-61 Rev. 2
- SOC 2 CC7.3-CC7.5
- GLBA Safeguards Rule

### Regulatory Reporting
- Data breach notification per state laws
- GLBA notification requirements
- Document all notifications

---

## Change Log
| Date | Version | Change |
|------|---------|--------|
| 2026-01-20 | 1.0 | Initial plan |