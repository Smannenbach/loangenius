# LoanGenius Release Checklist

## Pre-Deploy

### 1. Environment Variables
- [ ] Verify `INTEGRATION_ENCRYPTION_KEY` is set (32-byte key)
- [ ] Verify SSO credentials (`sso_client_id`, `sso_client_secret`, etc.)
- [ ] Verify at least one AI provider key is configured
- [ ] Confirm NO secrets have `VITE_` prefix

### 2. Build Verification
- [ ] Run production build successfully
- [ ] No TypeScript/lint errors
- [ ] No console errors in browser

### 3. Smoke Tests (Pre-deploy in staging)
- [ ] Navigate to Smoke Tests page
- [ ] Run tests - all should PASS or SKIP (no FAIL)
- [ ] Verify test lead cleanup (no orphan records)

---

## Deploy

### Base44 Platform
1. Push code changes (auto-deploys on Base44)
2. Verify deployment status in dashboard
3. Wait for build completion (~2-3 minutes)

### Manual Deploy (if applicable)
1. `npm run build` - Create production bundle
2. Deploy to hosting platform
3. Verify environment variables are set in hosting dashboard

---

## Post-Deploy

### 1. Immediate Verification (< 5 minutes)
- [ ] App loads without errors
- [ ] Can log in successfully
- [ ] Dashboard renders with data

### 2. Smoke Tests
- [ ] Navigate to Admin → Smoke Tests
- [ ] Click "Run Smoke Tests"
- [ ] Verify all tests pass:
  - Authentication Check: PASS
  - Organization Resolver: PASS
  - Leads Read Access: PASS
  - Leads Write/Delete: PASS
  - Encryption Key: PASS

### 3. Core Flow Testing
- [ ] **Leads CRUD:**
  - Create a new lead → appears in list
  - Edit the lead → changes persist
  - Delete the lead → removed from list
  
- [ ] **Import (if Google Sheets connected):**
  - Open import wizard
  - Select a sheet with test data
  - Complete import → leads appear

- [ ] **Integrations:**
  - Navigate to Admin → Integrations
  - Test an existing connection
  - Verify "healthy" status

### 4. Navigation Check
- [ ] Click every sidebar item
- [ ] No blank pages or console errors
- [ ] Unknown routes show NotFound page

---

## Rollback Plan

### When to Rollback
- Critical functionality broken (auth, leads CRUD, imports)
- Data corruption detected
- Security vulnerability discovered

### How to Rollback

#### Base44 Platform
1. Go to Dashboard → Deployments
2. Find last known good deployment
3. Click "Redeploy" on that version
4. Wait for rollback to complete (~2-3 minutes)

#### Git-based Rollback
```bash
# Identify last good commit
git log --oneline -10

# Revert to specific commit
git revert <commit-hash>
git push origin main
```

### Data Considerations

**Safe to keep after rollback:**
- User accounts
- Organizations
- Leads and Deals (unless corrupted)
- Documents

**May need review:**
- Integration configs (if schema changed)
- AI Provider configs (if schema changed)
- Recently imported data (if import logic changed)

### Post-Rollback Verification
- [ ] Run Smoke Tests
- [ ] Verify critical flows work
- [ ] Document what caused the rollback
- [ ] Plan fix before re-deploying

---

## Emergency Contacts

- Platform Issues: Base44 Support
- Application Issues: Development Team
- Security Issues: Security Team (immediate escalation)

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-01-20 | Initial release checklist |

---

*This checklist should be followed for every production deployment.*