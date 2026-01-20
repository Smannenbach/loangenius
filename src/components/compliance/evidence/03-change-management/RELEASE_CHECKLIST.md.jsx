# Release Checklist - LoanGenius

## Pre-Release Checklist

### Code Quality
- [ ] All code reviewed and approved
- [ ] No unresolved review comments
- [ ] Code follows style guidelines
- [ ] No TODO/FIXME for critical issues

### Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] E2E smoke tests pass
- [ ] Manual testing completed (if needed)
- [ ] Performance baseline met

### Security
- [ ] npm audit shows no high/critical issues
- [ ] No secrets in code
- [ ] Security review (if security-sensitive)
- [ ] License compliance verified

### Documentation
- [ ] Changelog updated
- [ ] API docs updated (if API changed)
- [ ] User docs updated (if UI changed)

### Deployment
- [ ] Staging deployment successful
- [ ] Staging verification passed
- [ ] Rollback plan documented
- [ ] Team notified of deployment window

---

## Release Approval

| Approver | Role | Date | Signature |
|----------|------|------|-----------|
| | Developer | | |
| | Reviewer | | |

---

## Post-Release Checklist

- [ ] Production deployment successful
- [ ] Smoke tests pass in production
- [ ] Monitoring shows no anomalies
- [ ] No error rate increase
- [ ] Customer-facing changes verified