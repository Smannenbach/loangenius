# Change Management Policy - LoanGenius

**Version:** 1.0  
**Effective Date:** 2026-01-20  
**Owner:** DevOps  
**Review Frequency:** Annual

---

## Purpose
Ensure all changes to LoanGenius are authorized, tested, and documented to maintain system integrity and availability.

---

## Scope
All changes to:
- Application code
- Database schemas
- Infrastructure configuration
- Security settings
- Integrations

---

## Change Categories

| Category | Risk | Examples | Approval |
|----------|------|----------|----------|
| Standard | Low | Bug fixes, minor UI changes | 1 reviewer |
| Normal | Medium | New features, schema changes | 2 reviewers |
| Emergency | High | Critical security fix, outage | Verbal + post-hoc |
| Major | High | Architecture changes, migrations | 2 reviewers + lead |

---

## Standard Change Process

### 1. Request
- Create PR with description
- Link to ticket/issue
- Describe change and impact

### 2. Review
- Code review by qualified reviewer
- Security impact assessment
- Performance impact assessment

### 3. Approve
- Reviewer approval required
- CI gates must pass
- No unresolved comments

### 4. Test
- Unit tests pass
- Integration tests pass
- E2E smoke tests pass
- Performance budgets met

### 5. Deploy
- Deploy to staging first
- Verify in staging
- Deploy to production
- Monitor for issues

### 6. Document
- Commit message describes change
- Changelog updated if significant
- Documentation updated if needed

---

## CI Gates (Required to Pass)

| Gate | Purpose | Blocking |
|------|---------|----------|
| Typecheck | Type errors | Yes |
| Lint | Code quality | Yes |
| Unit Tests | Logic correctness | Yes |
| E2E Smoke | Critical paths work | Yes |
| Lighthouse | Performance budgets | Yes |
| Security Audit | Known vulnerabilities | Warn |

---

## Approval Requirements

| Change Type | Reviewers | Additional |
|-------------|-----------|------------|
| Code (standard) | 1 developer | CI passes |
| Code (sensitive) | 2 developers | Security review |
| Schema change | 2 developers | Migration plan |
| Security config | 2 developers + lead | Risk assessment |
| Infrastructure | 2 developers + lead | Rollback plan |

---

## Emergency Change Process

### When to Use
- Critical security vulnerability
- Production outage
- Data corruption

### Process
1. Verbal approval from lead/manager
2. Implement minimal fix
3. Deploy with monitoring
4. Document within 24 hours
5. Full review within 48 hours
6. Post-mortem if warranted

### Documentation Required
- Incident description
- Fix description
- Approver name
- Timeline
- Post-deployment verification

---

## Database Change Requirements

### Schema Changes
See: `MIGRATION_POLICY.md`

- Must be backwards compatible during rollout
- Rollback plan required
- Tested in staging with production-like data
- Multi-step for destructive changes

### Data Migrations
- Batch processing for large datasets
- Progress tracking
- Ability to pause/resume
- Validation before and after

---

## Rollback Expectations

### Rollback Triggers
- Error rate > 5% after deploy
- P95 latency > 2x baseline
- Critical functionality broken
- Data integrity issues

### Rollback Procedure
See: `MIGRATION_ROLLBACK_PLAYBOOK.md`

- Code: Git revert or deploy previous tag
- Schema: Revert entity file or restore from backup
- Data: Restore from backup

### Rollback SLA
- Decision within 15 minutes of issue detection
- Execution within 30 minutes of decision

---

## Testing Requirements

### Before Merge
- Unit tests for changed code
- Integration tests for APIs
- E2E tests for user flows

### Before Production
- Staging deployment successful
- Manual verification if needed
- Performance check

---

## Documentation

### Required Documentation
- PR description with context
- Commit messages (meaningful)
- Changelog for user-facing changes
- API documentation for new endpoints

### Optional Documentation
- Architecture decision records
- Runbook updates
- Training materials

---

## Monitoring Post-Deploy

### Required Monitoring
- Error rate for 1 hour
- Latency for 1 hour
- Key functionality spot checks

### Escalation
- If metrics degrade, escalate to lead
- Decision to rollback or fix forward

---

## Compliance

### Related Controls
- SOC 2 CC8.1-CC8.3
- OWASP change management
- CIS Control 2 (Software Inventory)

---

## Change Log
| Date | Version | Change |
|------|---------|--------|
| 2026-01-20 | 1.0 | Initial policy |