# Backup & Disaster Recovery Plan - LoanGenius

## Overview
Comprehensive backup and disaster recovery strategy for LoanGenius production data.

---

## RPO/RTO Targets

| Metric | Target | Justification |
|--------|--------|---------------|
| **RPO (Recovery Point Objective)** | 1 hour | Maximum acceptable data loss. Critical for loan data integrity. |
| **RTO (Recovery Time Objective)** | 4 hours | Maximum acceptable downtime. Business can operate offline briefly. |
| **MTTR (Mean Time to Recovery)** | 2 hours | Target average recovery time with practiced procedures. |

### Assumptions
- Base44 platform provides underlying infrastructure redundancy
- Entity data is the primary recovery target
- File attachments (documents) are stored separately with their own backup
- User authentication is managed by Base44/SSO provider

---

## Backup Strategy

### Backup Types

| Type | Frequency | Retention | Purpose |
|------|-----------|-----------|---------|
| **Full Snapshot** | Daily at 02:00 UTC | 30 days | Complete data recovery |
| **Incremental** | Every 6 hours | 7 days | Reduce RPO window |
| **Transaction Log** | Continuous | 72 hours | Point-in-time recovery |
| **Weekly Archive** | Sunday 03:00 UTC | 12 weeks | Long-term retention |
| **Monthly Archive** | 1st of month | 12 months | Compliance retention |

### Backup Schedule (UTC)

```
Daily:
02:00 - Full snapshot backup
08:00 - Incremental backup
14:00 - Incremental backup
20:00 - Incremental backup

Weekly:
Sunday 03:00 - Weekly archive (compressed)

Monthly:
1st 04:00 - Monthly archive (compressed + encrypted)
```

---

## Entities Backed Up

### Critical (Tier 1) - RPO: 1 hour
- Deal
- Lead
- Borrower
- Document
- DocumentAnalysis
- Condition
- LenderSubmission

### Important (Tier 2) - RPO: 4 hours
- Contact
- Task
- CommunicationsLog
- AuditLog
- ImportRun
- Property

### Standard (Tier 3) - RPO: 24 hours
- EmailSequence
- SequenceEnrollment
- LeadMappingProfile
- FieldMappingProfile
- OrgSettings
- PortalBranding

---

## Backup Implementation

### Automated Backup Function
```javascript
// functions/scheduledBackup.js
async function performBackup(type) {
  const timestamp = new Date().toISOString();
  const backupId = `backup_${type}_${timestamp}`;
  
  const entities = getEntitiesForTier(type);
  const backupData = {};
  
  for (const entity of entities) {
    backupData[entity] = await base44.asServiceRole.entities[entity].list();
  }
  
  // Compress and encrypt
  const compressed = await compress(JSON.stringify(backupData));
  const encrypted = await encrypt(compressed, BACKUP_KEY);
  
  // Store backup
  await storeBackup(backupId, encrypted, {
    type,
    timestamp,
    entityCount: Object.keys(backupData).length,
    recordCount: Object.values(backupData).reduce((sum, arr) => sum + arr.length, 0),
    checksum: await calculateChecksum(encrypted)
  });
  
  // Log backup event
  await logAuditEvent('BACKUP_COMPLETED', { backupId, type });
  
  return backupId;
}
```

### Backup Verification
```javascript
async function verifyBackup(backupId) {
  const backup = await retrieveBackup(backupId);
  const metadata = await getBackupMetadata(backupId);
  
  // Verify checksum
  const currentChecksum = await calculateChecksum(backup);
  if (currentChecksum !== metadata.checksum) {
    throw new Error('Backup integrity check failed');
  }
  
  // Verify decryption
  const decrypted = await decrypt(backup, BACKUP_KEY);
  const decompressed = await decompress(decrypted);
  const data = JSON.parse(decompressed);
  
  // Verify record counts
  const actualCount = Object.values(data).reduce((sum, arr) => sum + arr.length, 0);
  if (actualCount !== metadata.recordCount) {
    throw new Error('Record count mismatch');
  }
  
  return { verified: true, backupId, timestamp: metadata.timestamp };
}
```

---

## Point-in-Time Recovery (PITR)

### Capability
- Recovery window: Up to 72 hours back
- Granularity: 1 minute increments within window
- Method: Transaction log replay

### PITR Process
1. Identify target timestamp
2. Find nearest full backup before target
3. Restore full backup to isolated environment
4. Replay transaction logs up to target timestamp
5. Verify data integrity
6. Swap or migrate recovered data

### PITR Command
```bash
# Restore to specific point in time
npm run restore:pitr -- --timestamp="2026-01-19T14:30:00Z" --target=recovery_db

# Verify restored data
npm run verify:restore -- --target=recovery_db
```

---

## Backup Storage

### Primary Storage
- Location: Base44 secure storage (same region as production)
- Encryption: AES-256 at rest
- Access: Service account only

### Secondary Storage (Offsite)
- Location: Cloud storage (different region)
- Replication: Async, within 15 minutes of primary
- Encryption: AES-256 + customer-managed keys

### Retention Policy
```
Daily backups: 30 days
Weekly backups: 12 weeks (84 days)
Monthly backups: 12 months
Annual backups: 7 years (compliance)
```

---

## Access Controls

### Who Can Access Backups
| Role | Access Level |
|------|--------------|
| Super Admin | Full (restore, verify, delete) |
| Admin | Read (verify only) |
| DevOps | Full (automated processes) |
| All Others | None |

### Backup Access Audit
All backup access is logged:
- Who accessed
- What backup
- Action taken (read, restore, verify, delete)
- Timestamp
- IP address

---

## Encryption

### At Rest
- Algorithm: AES-256-GCM
- Key Management: Base44 KMS
- Key Rotation: Every 90 days

### In Transit
- Protocol: TLS 1.3
- Certificate: Managed by platform

### Key Recovery
- Master key stored in separate secure vault
- Requires 2 of 3 key holders for recovery
- Annual key recovery drill

---

## Backup Monitoring

### Automated Alerts
| Condition | Severity | Action |
|-----------|----------|--------|
| Backup job failed | Critical | Page on-call |
| Backup delayed > 30 min | Warning | Alert Slack |
| Backup size anomaly (>50% change) | Warning | Alert Slack |
| Verification failed | Critical | Page on-call |
| Storage usage > 80% | Warning | Alert team |

### Dashboard Metrics
- Last successful backup timestamp
- Backup size trend
- Verification status
- Storage utilization
- Recovery test results

---

## Disaster Scenarios

### Scenario 1: Accidental Data Deletion
- RPO Impact: < 1 hour data loss
- Recovery: Restore from latest verified backup
- Time: ~30 minutes

### Scenario 2: Data Corruption
- RPO Impact: Depends on detection time
- Recovery: PITR to before corruption
- Time: 1-2 hours

### Scenario 3: Complete Infrastructure Failure
- RPO Impact: < 1 hour
- Recovery: Restore to new infrastructure from offsite backup
- Time: 2-4 hours

### Scenario 4: Ransomware/Security Breach
- RPO Impact: Depends on detection
- Recovery: Clean restore from pre-breach backup
- Time: 4-8 hours (includes security verification)

---

## Change Log
- 2026-01-20: Initial backup DR plan created