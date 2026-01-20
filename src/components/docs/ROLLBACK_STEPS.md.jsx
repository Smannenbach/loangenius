# Rollback Steps - Production Deployment Rollback Plan

## When to Rollback

Rollback if:
- **P0 issue** with no quick fix available within 15 minutes
- **Data integrity** issue detected (cross-org data leak, data corruption)
- **Security breach** or vulnerability exploited
- **Error rate** sustains above 10% for 5+ minutes
- **Core journey** completely broken (login, leads, pipeline)

**Decision Authority**: Launch Commander (Steve Mannenbach)

---

## Rollback Options

### Option 1: Revert Deployment (Full Rollback)
**Use when**: New deployment introduced breaking changes  
**Time**: 5-10 minutes  
**Risk**: Low (returns to known-good state)

#### Steps:
1. **Identify Last Known Good Deployment**
   - Check deployment history in Base44 dashboard
   - Confirm last good version number

2. **Execute Revert**
   - Base44 Dashboard → Deployments → [Select previous version] → Deploy
   - OR: Git revert + redeploy if using Git-based deploys

3. **Verify Rollback**
   - Run smoke tests (login, leads list, create lead)
   - Check Sentry for new errors
   - Confirm health endpoint returns 200

4. **Communicate**
   - Post status update: "Reverted to previous version, investigating issue"
   - Document what was rolled back in incident log

### Option 2: Kill-Switch (Feature Flags)
**Use when**: Specific feature causing issues, rest of app healthy  
**Time**: 1-2 minutes  
**Risk**: Very low (surgical disable)

#### Steps:
1. **Identify Problem Feature**
   - Google Sheets import broken? → Disable import wizard entry
   - Integration failing? → Disable specific integration

2. **Set Feature Flag**
   - If using Base44 env vars: Set `VITE_DISABLE_SHEETS_IMPORT=true`
   - If using database flags: Update `FeatureFlag` entity
   - Reload app (may require deploy or cache clear)

3. **Verify Disable**
   - Confirm feature UI is hidden or shows "Temporarily Unavailable"
   - Confirm users cannot access via direct URL

4. **Communicate**
   - In-app banner: "Google Sheets import temporarily unavailable, working on fix"
   - Email to admins: "Known issue with [feature], disabled until resolved"

### Option 3: Hotfix Deployment (Forward Fix)
**Use when**: Bug identified, fix is simple (< 10 lines), high confidence  
**Time**: 10-15 minutes  
**Risk**: Medium (could introduce new issues)

#### Steps:
1. **Implement Fix** (in separate branch/commit)
2. **Test Locally** (verify fix resolves issue, doesn't break other features)
3. **Deploy Hotfix** (tag as hotfix, deploy to production)
4. **Monitor Closely** (watch for new errors, performance degradation)
5. **Rollback if Hotfix Fails** (revert to Option 1 if hotfix makes things worse)

---

## Rollback Verification Checklist

After any rollback, verify:
- [ ] **Health endpoint** returns 200 OK
- [ ] **Login** works (test with real account)
- [ ] **Leads page** loads and displays data
- [ ] **Create Lead** saves successfully
- [ ] **Dashboard KPIs** load without errors
- [ ] **Sentry error rate** drops to < 1%
- [ ] **No new errors** introduced by rollback

---

## Database Rollback (Extreme Measures)

### When to Use
- Database migration broke production
- Data corruption detected
- Schema change caused widespread failures

### Steps
1. **STOP ALL WRITES** (disable app or set read-only mode)
2. **Snapshot Current State** (backup current DB, even if broken)
3. **Restore from Last Backup**
   - Identify last known-good backup (hourly/daily backups)
   - Restore to new instance (do NOT overwrite production DB directly)
4. **Verify Restored Data**
   - Confirm data integrity
   - Confirm recent data (check timestamps)
   - Identify data loss window (time between backup and restore)
5. **Switch App to Restored DB** (update connection string)
6. **Communicate Data Loss** (if any records lost in backup gap)

**WARNING**: Database rollback can cause data loss (any writes after backup timestamp are lost).  
**Mitigation**: Use point-in-time recovery if database supports it (minimizes data loss).

---

## Communication During Rollback

### Internal (War Room)
**Slack/Chat**: Immediate notification
```
@team ROLLBACK IN PROGRESS
Reason: [One-line reason]
Option: [1/2/3]
ETA: [Minutes]
Status updates every 5 min
```

### External (Users)
**In-App Banner**:
```
⚠️ We're experiencing technical difficulties and are working on a fix. 
Your data is safe. We'll update you shortly.
```

**Email (If Prolonged)**:
```
Subject: LoanGenius - Service Interruption [Timestamp]

We are currently addressing a technical issue affecting [feature/service].
Your data is secure and no information has been lost.

Estimated Resolution: [Time]
Status Page: status.loangenius.com

We apologize for the inconvenience.
```

---

## Post-Rollback Actions

1. **Root Cause Analysis** (within 24 hours)
   - What failed and why?
   - How did it get to production?
   - How do we prevent recurrence?

2. **Update Tests** (add regression test for the bug)

3. **Deploy Fix** (when ready, with extra testing)

4. **Post-Mortem Document** (share with team)

---

## Rollback Testing (Dry Run)

**Before Launch**: Practice rollback once in staging environment
- Deploy intentionally broken version
- Execute rollback procedure
- Time how long it takes
- Identify any gaps in runbook

**Acceptance**: Can complete full rollback in < 10 minutes

---

**Document Version**: 1.0  
**Last Updated**: 2026-01-20  
**Next Review**: After first production incident