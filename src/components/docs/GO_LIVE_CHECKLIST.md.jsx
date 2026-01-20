# Go-Live Checklist - LoanGenius Production Launch

## Pre-Launch Verification (Must Complete Before Cutover)

### ✅ Environment & Infrastructure
- [ ] Production database provisioned and backed up
- [ ] SSL certificate installed and HTTPS enforced
- [ ] Domain DNS configured (loangenius.com → production server)
- [ ] Load balancer configured (if multi-instance)
- [ ] CDN configured for static assets (optional)

### ✅ Secrets & Configuration
- [ ] `INTEGRATION_ENCRYPTION_KEY` set in Base44 secrets
- [ ] `Sendgrid_API_Key` configured (for email)
- [ ] `TWILIO_ACCOUNT_SID` and `TWILIO_AUTH_TOKEN` configured (for SMS)
- [ ] `OpenAI_API_Key` configured (for AI features)
- [ ] `Google_Maps_Platform_API_Key` configured (for geocoding)
- [ ] SSO provider configured (Google OAuth)
- [ ] App connectors authorized (Google Sheets, Docs, Drive, Calendar)
- [ ] Feature flags set: `VITE_ENABLE_INTERNAL_PAGES=false` for production

### ✅ Preflight Checks (All Must Pass)
- [ ] Run `/admin/preflight` - all P0 checks green
- [ ] Run `e2eTestRunner` function - all tests pass
- [ ] Run `testSystemHealth` function - status = healthy
- [ ] Org resolution working (new user gets auto-org)
- [ ] IDOR prevention active (update/delete checks org ownership)

### ✅ Core User Journeys (Smoke Test)
- [ ] **Login**: User can authenticate via Google SSO
- [ ] **Dashboard**: Loads without errors, shows KPIs
- [ ] **Leads**: List loads, can create new lead, lead saves successfully
- [ ] **Pipeline**: Deals display by stage, drag-and-drop works
- [ ] **Google Sheets Import**: Connection status accurate, import works or shows clear "not connected" message
- [ ] **Document Upload**: Can upload document (or feature clearly disabled)
- [ ] **Borrower Portal**: Magic link generates, portal loads for borrower
- [ ] **Admin Pages**: Only accessible by admin role, non-admins see Access Denied

### ✅ Security & Compliance
- [ ] All PII fields encrypted at rest (SSN, DOB, bank accounts)
- [ ] Audit logging active (all PII access logged)
- [ ] Session timeout configured (30 minutes)
- [ ] Password policy enforced (if applicable)
- [ ] No secrets in client-side code (VITE_* only for non-secret config)
- [ ] CORS configured (only allow production domains)

### ✅ Performance & Reliability
- [ ] API response time < 200ms (p95)
- [ ] Page load time < 2 seconds (p95)
- [ ] Database queries < 100ms (p95)
- [ ] Error monitoring enabled (Sentry configured)
- [ ] Uptime monitoring active (health endpoint checks)

### ✅ Navigation & UI
- [ ] Internal/testing pages hidden (`VITE_ENABLE_INTERNAL_PAGES=false`)
- [ ] No dead links in navigation (all menu items load real pages)
- [ ] No "Coming Soon" placeholders in main nav
- [ ] Mobile responsive (test on iOS/Android)
- [ ] Accessibility (keyboard nav, screen reader friendly)

### ✅ Data & Content
- [ ] Sample/test data cleaned from production database
- [ ] Default fee catalog seeded (if needed)
- [ ] Email templates configured
- [ ] Document templates uploaded
- [ ] MISMO export profiles configured

### ✅ Monitoring & Alerting
- [ ] Sentry configured (frontend + backend errors)
- [ ] Health check endpoint monitored (external service)
- [ ] Error alerts configured (email/Slack)
- [ ] Performance monitoring dashboard accessible

### ✅ Documentation
- [ ] User guides published (LO, Processor, Borrower)
- [ ] API documentation complete (if exposing APIs)
- [ ] Training videos uploaded
- [ ] Knowledge base populated

### ✅ Support Readiness
- [ ] Support email configured (support@loangenius.com)
- [ ] Support hours defined and communicated
- [ ] Escalation contacts identified
- [ ] Known issues list maintained

---

## Launch Sequence (Go-Live Steps)

1. **T-60 minutes**: Final preflight check
2. **T-30 minutes**: Database backup verification
3. **T-15 minutes**: Deploy to production, monitor logs
4. **T-10 minutes**: Smoke test critical journeys
5. **T-5 minutes**: Verify monitoring/alerting active
6. **T-0 (GO)**: Switch DNS to production, announce launch
7. **T+15 minutes**: Monitor error rates, response times
8. **T+1 hour**: Full regression smoke test
9. **T+4 hours**: Check support queue, fix critical issues
10. **T+24 hours**: Post-launch review, update Known Issues

---

## Success Criteria (Must All Be True)

✅ **No P0 Blockers**: Login works, core pages load, no 500 errors  
✅ **Performance**: API p95 < 500ms, page load p95 < 3 seconds  
✅ **Security**: No secrets leaked, IDOR prevention working  
✅ **Data Integrity**: All writes scoped to correct org  
✅ **Monitoring**: Errors surfacing in Sentry within 1 minute  

---

## Known Issues (Documented & Acceptable)

**Non-Blocking Issues (Ship With These):**
1. Advanced analytics dashboard - charts may show placeholder data
2. DocuSign integration - requires manual template setup per org
3. HMDA LAR export - generates but needs manual QA before submission
4. Mobile app - not available (web-only at launch)

**Post-Launch (P1 - Fix Within 7 Days):**
1. Improve Google Sheets error messages (more user-friendly)
2. Add bulk delete for leads
3. Add export to Excel (currently CSV only)

---

**Document Version**: 1.0  
**Last Updated**: 2026-01-20  
**Status**: Ready for Launch Review