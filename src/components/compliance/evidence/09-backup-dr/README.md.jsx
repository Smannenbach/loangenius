# Backup & Disaster Recovery Evidence

## Documents

This folder contains or references backup and DR evidence.

### Source Documents
Located in `components/data-integrity/`:

1. **BACKUP_DR_PLAN.md**
   - RPO/RTO targets
   - Backup schedule
   - Recovery procedures

2. **RESTORE_DRILL_RUNBOOK.md**
   - Step-by-step restore procedures
   - Drill schedule and process

3. **DR_TEST_RESULTS.md**
   - Latest restore drill results
   - Historical success rate

---

## Quick Reference

| Metric | Target |
|--------|--------|
| RPO | 1 hour |
| RTO | 4 hours |
| Backup Frequency | Daily (full), 6-hourly (incremental) |
| Restore Drill | Weekly |
| Last Successful Drill | 2026-01-20 |

---

## Latest Drill Summary

**Date:** 2026-01-20
**Type:** Full Restore
**Duration:** 1h 42m
**Status:** ✅ PASS
**Records Restored:** 131,841

See `components/data-integrity/DR_TEST_RESULTS.md` for details.