# Restore Drill Runbook - LoanGenius

## Overview
Step-by-step procedures for executing and verifying database restore drills.

---

## Drill Schedule

| Drill Type | Frequency | Duration | Environment |
|------------|-----------|----------|-------------|
| Full Restore | Weekly (Thursday) | 2 hours | Dev/Staging |
| PITR Restore | Bi-weekly | 1 hour | Dev |
| Cross-Region | Monthly | 4 hours | DR environment |
| Tabletop Exercise | Quarterly | 2 hours | N/A (discussion) |

---

## Pre-Drill Checklist

- [ ] Identify drill coordinator
- [ ] Notify team of drill window
- [ ] Verify target environment is available
- [ ] Confirm backup to restore is identified
- [ ] Document starting state of target environment
- [ ] Have rollback plan if drill affects other systems

---

## Drill 1: Full Restore

### Objective
Verify ability to restore complete database from daily backup.

### Prerequisites
- Access to backup storage
- Target environment credentials
- Smoke test suite ready

### Steps

#### Step 1: Identify Backup
```bash
# List available backups
npm run backup:list -- --type=daily --days=7

# Output:
# backup_daily_2026-01-20T02:00:00Z (verified: ✓)
# backup_daily_2026-01-19T02:00:00Z (verified: ✓)
# ...

# Select backup
BACKUP_ID="backup_daily_2026-01-19T02:00:00Z"
```

#### Step 2: Prepare Target Environment
```bash
# Create isolated restore target
npm run env:create -- --name=restore_drill_$(date +%Y%m%d)

# Verify environment is empty/clean
npm run env:verify -- --name=restore_drill_$(date +%Y%m%d)
```

#### Step 3: Execute Restore
```bash
# Download and decrypt backup
npm run backup:download -- --id=$BACKUP_ID --output=./restore_temp/

# Restore to target environment
npm run restore:execute -- \
  --source=./restore_temp/$BACKUP_ID \
  --target=restore_drill_$(date +%Y%m%d) \
  --verify=true

# Expected output:
# Restoring backup_daily_2026-01-19T02:00:00Z...
# Decrypting... OK
# Decompressing... OK
# Restoring Deal (1,234 records)... OK
# Restoring Lead (5,678 records)... OK
# ...
# Restore complete. Total: 45,678 records restored.
```

#### Step 4: Verify Restore
```bash
# Run integrity checks
npm run restore:verify -- --target=restore_drill_$(date +%Y%m%d)

# Expected checks:
# ✓ Record counts match backup metadata
# ✓ Referential integrity valid
# ✓ No orphaned records
# ✓ Checksum verification passed

# Run smoke tests against restored data
npm run test:smoke -- --env=restore_drill_$(date +%Y%m%d)

# Expected output:
# ✓ Auth flow works
# ✓ Deal CRUD works
# ✓ Lead CRUD works
# ✓ Document access works
# ✓ Pipeline loads correctly
```

#### Step 5: Document Results
```bash
# Generate drill report
npm run drill:report -- \
  --type=full_restore \
  --backup-id=$BACKUP_ID \
  --target=restore_drill_$(date +%Y%m%d) \
  --output=./drill_reports/$(date +%Y%m%d)_full_restore.md
```

#### Step 6: Cleanup
```bash
# Remove drill environment
npm run env:destroy -- --name=restore_drill_$(date +%Y%m%d) --confirm

# Clear local temp files
rm -rf ./restore_temp/
```

---

## Drill 2: Point-in-Time Restore (PITR)

### Objective
Verify ability to restore to a specific timestamp within retention window.

### Steps

#### Step 1: Select Target Timestamp
```bash
# Choose a timestamp within PITR window (last 72 hours)
TARGET_TIMESTAMP="2026-01-19T14:30:00Z"

# Verify timestamp is within window
npm run pitr:check -- --timestamp=$TARGET_TIMESTAMP

# Expected: "Timestamp is within PITR window. Nearest base backup: backup_daily_2026-01-19T02:00:00Z"
```

#### Step 2: Execute PITR
```bash
# Create PITR restore
npm run pitr:restore -- \
  --timestamp=$TARGET_TIMESTAMP \
  --target=pitr_drill_$(date +%Y%m%d)

# Expected output:
# Using base backup: backup_daily_2026-01-19T02:00:00Z
# Replaying transaction logs from 02:00:00Z to 14:30:00Z...
# Applied 12,345 transactions
# PITR restore complete to 2026-01-19T14:30:00Z
```

#### Step 3: Verify PITR State
```bash
# Check data reflects target timestamp
npm run pitr:verify -- \
  --target=pitr_drill_$(date +%Y%m%d) \
  --expected-timestamp=$TARGET_TIMESTAMP

# Spot check specific records
npm run query -- \
  --env=pitr_drill_$(date +%Y%m%d) \
  --entity=AuditLog \
  --filter="created_date > $TARGET_TIMESTAMP" \
  --expected-count=0
```

---

## Drill 3: Cross-Region Restore

### Objective
Verify ability to restore from offsite backup in DR region.

### Steps

#### Step 1: Verify Offsite Backup
```bash
# Check offsite backup availability
npm run backup:list -- --location=offsite --days=7

# Verify replication status
npm run backup:replication-status

# Expected: "Replication lag: 12 minutes. All daily backups replicated."
```

#### Step 2: Create DR Environment
```bash
# Provision DR environment in secondary region
npm run dr:provision -- --region=us-west-2

# Restore from offsite backup
npm run restore:execute -- \
  --source=offsite \
  --backup-id=backup_daily_2026-01-19T02:00:00Z \
  --target=dr_environment
```

#### Step 3: Validate DR Environment
```bash
# Full smoke test suite
npm run test:smoke -- --env=dr_environment --full

# Performance baseline comparison
npm run test:performance -- --env=dr_environment --compare=production
```

---

## Expected Outcomes

### Successful Drill
- Restore completes within RTO target (4 hours)
- All integrity checks pass
- Smoke tests pass
- Data matches backup timestamp

### Failed Drill
- Document exact failure point
- Identify root cause
- Create remediation ticket
- Schedule re-drill within 1 week

---

## Drill Report Template

```markdown
# Restore Drill Report

**Date:** [YYYY-MM-DD]
**Drill Type:** [Full/PITR/Cross-Region]
**Coordinator:** [Name]

## Summary
- **Status:** [PASS/FAIL]
- **Duration:** [HH:MM]
- **RTO Met:** [Yes/No]

## Backup Details
- **Backup ID:** [ID]
- **Backup Timestamp:** [Timestamp]
- **Backup Size:** [Size]

## Restore Metrics
- **Restore Start:** [Timestamp]
- **Restore End:** [Timestamp]
- **Records Restored:** [Count]
- **Verification Status:** [Pass/Fail]

## Test Results
| Test | Result | Notes |
|------|--------|-------|
| Integrity Check | [Pass/Fail] | |
| Record Count | [Pass/Fail] | |
| Smoke Tests | [Pass/Fail] | |
| Performance | [Pass/Fail] | |

## Issues Found
[List any issues]

## Action Items
- [ ] [Action item 1]
- [ ] [Action item 2]

## Sign-Off
- Drill Coordinator: [Name] [Date]
- Reviewer: [Name] [Date]
```

---

## Troubleshooting

### "Backup not found"
1. Verify backup ID is correct
2. Check backup retention (may be expired)
3. Try offsite backup location

### "Checksum mismatch"
1. Re-download backup
2. Try previous backup version
3. Escalate to platform support

### "Restore timeout"
1. Check network connectivity
2. Try smaller batch size
3. Verify target environment resources

### "Smoke tests fail"
1. Check if migrations needed on restored data
2. Verify environment configuration
3. Compare with production configuration

---

## Change Log
- 2026-01-20: Initial restore drill runbook created