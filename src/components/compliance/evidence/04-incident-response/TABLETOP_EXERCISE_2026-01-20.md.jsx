# Tabletop Exercise Report

## Exercise Information
| Field | Value |
|-------|-------|
| Date | 2026-01-20 |
| Duration | 1 hour |
| Facilitator | Security Team |
| Participants | Admin, DevOps, Support |

---

## Scenario: Data Breach via Compromised Credentials

### Scenario Description
An attacker obtained valid credentials for a loan officer account through phishing. The attacker accessed the system and downloaded borrower PII from 50 loan files before detection.

### Injects
1. T+0: Alert fires for unusual data export activity
2. T+15: Help desk receives call from affected LO
3. T+30: Scope identified as 50 loan files
4. T+45: Media inquiry received

---

## Team Responses

### Detection Phase
**Question:** How would we detect this?
- Unusual export volume alert
- Off-hours access pattern
- User reports suspicious activity

**Gaps Identified:**
- Export volume thresholds need tuning
- Need better off-hours alerting

### Containment Phase
**Question:** What's our first action?
- Disable compromised account immediately
- Revoke all active sessions
- Preserve logs for investigation

**Gaps Identified:**
- Need faster account disable capability
- Session revocation process documented

### Communication Phase
**Question:** Who do we notify and when?
- Internal: Leadership within 1 hour
- Legal: Within 2 hours
- Affected customers: Per legal guidance (72 hours max)
- Regulators: Per state breach laws

**Gaps Identified:**
- Customer notification template needed
- State breach law quick reference needed

### Recovery Phase
**Question:** How do we recover?
- Reset credentials for affected user
- Review access for all similar roles
- Implement additional monitoring
- Conduct security awareness training

---

## Findings Summary

### What Worked Well
- Team understood escalation path
- Containment steps were clear
- Communication channels defined

### Improvement Areas
| Gap | Action | Owner | Due |
|-----|--------|-------|-----|
| Export alerting thresholds | Tune based on baseline | DevOps | 2026-02-01 |
| Breach notification template | Create template | Legal | 2026-02-01 |
| State breach law reference | Create quick reference | Compliance | 2026-02-15 |
| Off-hours alerting | Add time-based rules | DevOps | 2026-02-01 |

---

## Lessons Learned
1. Early detection is critical - invest in anomaly alerting
2. Have pre-written communication templates
3. Know your regulatory notification requirements
4. Regular drills improve response time

---

## Next Exercise
- **Date:** Q2 2026
- **Scenario:** Ransomware / System Unavailability