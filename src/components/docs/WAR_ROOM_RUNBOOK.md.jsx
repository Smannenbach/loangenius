# War Room Runbook - Production Incident Response

## Purpose
Defined procedures for responding to production incidents during and after launch.

---

## War Room Roles

### Launch Commander (Steve Mannenbach)
- Overall go/no-go decision authority
- Declares incidents
- Approves rollback decisions
- Final escalation point

### Technical Lead (AI Assistant / Engineering)
- Monitors Sentry errors
- Investigates root causes
- Implements fixes
- Executes rollback if needed

### Support Lead
- Monitors support@loangenius.com
- Triages incoming issues
- Communicates with affected users
- Documents user-reported issues

### Observability Lead
- Watches health dashboards
- Alerts team to anomalies
- Tracks error rates, latency, throughput
- Provides data for go/no-go decisions

---

## Decision Thresholds

### 🟢 GREEN - Continue Operating
- Error rate < 1%
- API p95 latency < 500ms
- No user-reported P0 issues
- All core journeys functional

### 🟡 YELLOW - Elevated Monitoring
- Error rate 1-5%
- API p95 latency 500ms-1s
- Minor feature degradation
- 1-2 user-reported issues (P1/P2)

**Actions**:
- Increase monitoring frequency
- Investigate errors actively
- Prepare rollback plan
- Post status update

### 🔴 RED - Incident Declared
- Error rate > 5%
- API p95 latency > 1s
- Core journey broken (login, leads, pipeline)
- 3+ user-reported P0 issues
- Data integrity issue detected

**Actions**:
- Declare incident immediately
- Notify all stakeholders
- Execute rollback if no quick fix available
- Post-incident review within 24 hours

---

## Incident Template

```markdown
## Incident [ID] - [One-Line Summary]

**Status**: Investigating | Mitigating | Resolved  
**Severity**: P0 | P1 | P2  
**Started**: [Timestamp]  
**Resolved**: [Timestamp] (if resolved)

### Impact
- Users affected: [count or "all"]
- Features impacted: [list]
- Data integrity: [affected | not affected]

### Timeline
- [Time]: Issue first detected
- [Time]: Incident declared
- [Time]: Mitigation started
- [Time]: Issue resolved

### Root Cause
[Technical explanation]

### Mitigation
[What was done to fix/contain]

### Follow-Up Actions
- [ ] Deploy permanent fix
- [ ] Update monitoring to catch earlier
- [ ] Document in Known Issues
- [ ] Post-incident review scheduled
```

---

## Escalation Tree

### Tier 1: Self-Service (User)
- Check Status page (status.loangenius.com)
- Review Knowledge Base
- Check email for system notifications

### Tier 2: Support Email
- Contact: support@loangenius.com
- Response SLA: 4 hours (business hours)
- Triaged by: Support Lead

### Tier 3: Engineering Investigation
- Escalated for: P0/P1 issues, data issues, security issues
- Response SLA: 1 hour for P0, 4 hours for P1
- Handled by: Technical Lead

### Tier 4: Launch Commander
- Escalated for: Multi-user outages, data loss, security breaches, rollback decisions
- Response: Immediate

---

## Communication Templates

### Status Update (Hourly During Incident)
```
Subject: LoanGenius Production Status - [Timestamp]

Status: 🟢 GREEN | 🟡 YELLOW | 🔴 RED

Current Issues:
- [Issue 1]
- [Issue 2]

Actions In Progress:
- [Action 1]
- [Action 2]

Next Update: [Time]
```

### All-Clear Notice
```
Subject: LoanGenius Production - Issue Resolved

The production issue affecting [feature/users] has been resolved.

Issue: [Description]
Duration: [Start] to [End]
Resolution: [What was done]

All systems are now operating normally. We apologize for the disruption.

- LoanGenius Team
```

---

## Post-Incident Review (Within 24 Hours)

### Review Agenda
1. **Timeline Review**: What happened when?
2. **Root Cause Analysis**: Why did it happen?
3. **Detection**: How long until we noticed? Could we detect faster?
4. **Response**: What went well? What went poorly?
5. **Prevention**: How do we prevent recurrence?
6. **Action Items**: Assign owners and due dates

### Deliverables
- Incident post-mortem document
- Updated monitoring/alerting rules
- Code fixes deployed
- Documentation updates

---

**Document Version**: 1.0  
**Last Updated**: 2026-01-20  
**Owner**: Launch Commander