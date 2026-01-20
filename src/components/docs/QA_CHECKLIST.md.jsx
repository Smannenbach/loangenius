# LoanGenius QA Checklist

## Navigation Test Checklist

### Main Navigation
- [ ] Dashboard - Loads with KPIs and activity feed
- [ ] Pipeline - Shows deal stages kanban board
- [ ] Leads - Lists leads with search/filter
- [ ] Loans - Shows loan portfolio table
- [ ] Contacts - Lists contacts with type filters

### Tools Navigation
- [ ] Quote Generator - Opens quote creation form
- [ ] AI Hub - Shows AI assistant interface
- [ ] Communications - Lists email/SMS history
- [ ] Email Sequences - Shows automation center
- [ ] Reports - Displays analytics and report list

### Admin Navigation
- [ ] Users & Permissions - Lists team members
- [ ] Lender Partners - Shows lender integrations
- [ ] Borrower Portal - Portal settings page
- [ ] Smoke Tests - Test runner interface
- [ ] Testing Hub - Validation tools
- [ ] QA Audit - Code quality scanner
- [ ] Underwriting - Deal approval center
- [ ] Compliance - Audit logs dashboard
- [ ] MISMO Profiles - Export profile manager
- [ ] MISMO Import/Export - MISMO tools
- [ ] Integrations - Integration config page
- [ ] Settings - App settings

---

## CRUD Operations Checklist

### Leads
- [ ] Create lead via "Add Lead" button
- [ ] Edit lead - changes persist after refresh
- [ ] Delete lead - removed from list
- [ ] Import leads from Google Sheets
- [ ] Export leads to CSV
- [ ] Search/filter leads
- [ ] Generate quote for lead

### Deals
- [ ] Create deal via wizard
- [ ] Edit deal details
- [ ] Change deal stage
- [ ] View deal detail page
- [ ] Add documents to deal
- [ ] Add conditions to deal

### Contacts
- [ ] Create contact
- [ ] View contact details
- [ ] Edit contact
- [ ] Link contact to deal

---

## Integration Checks

### Google Sheets
- [ ] Connect Google Sheets integration
- [ ] Import leads from sheet
- [ ] Verify lead data mapping
- [ ] Check import history

### AI Providers
- [ ] Configure AI provider
- [ ] Test connection
- [ ] Use AI assistant
- [ ] Generate document with AI

### Email/SMS
- [ ] Send test email
- [ ] Send test SMS (if Twilio configured)
- [ ] Check communication logs

---

## Permissions Test Matrix

| Action | Admin | Manager | Loan Officer | Processor | Viewer |
|--------|-------|---------|--------------|-----------|--------|
| View Dashboard | ✅ | ✅ | ✅ | ✅ | ✅ |
| Create Lead | ✅ | ✅ | ✅ | ❌ | ❌ |
| Create Deal | ✅ | ✅ | ✅ | ❌ | ❌ |
| Edit Deal | ✅ | ✅ | ✅ | ✅ | ❌ |
| Delete Lead | ✅ | ✅ | ❌ | ❌ | ❌ |
| Invite Users | ✅ | ❌ | ❌ | ❌ | ❌ |
| Manage Settings | ✅ | ❌ | ❌ | ❌ | ❌ |
| View QA Audit | ✅ | ❌ | ❌ | ❌ | ❌ |
| Run Smoke Tests | ✅ | ❌ | ❌ | ❌ | ❌ |

---

## Error Handling Checks

- [ ] Invalid route shows 404 page
- [ ] API error shows toast notification
- [ ] Loading states show skeletons/spinners
- [ ] Empty states show helpful messages
- [ ] Form validation prevents bad data

---

## Security Checks

- [ ] No API keys in frontend code
- [ ] Admin pages require admin role
- [ ] Entity queries filter by org_id
- [ ] Backend functions validate authentication
- [ ] Encryption key configured for integrations

---

## Mobile Responsiveness

- [ ] Dashboard responsive on mobile
- [ ] Sidebar collapses on mobile
- [ ] Tables scroll horizontally
- [ ] Forms usable on touch devices
- [ ] Bottom nav appears on mobile

---

## Post-Import Verification

After importing leads from Google Sheets:
1. [ ] Check lead count matches expected
2. [ ] Verify field mapping is correct
3. [ ] Confirm status field populated
4. [ ] Check for duplicate handling
5. [ ] Verify import run logged

---

## Pre-Release Checklist

- [ ] All smoke tests pass
- [ ] QA Audit shows 0 missing functions
- [ ] QA Audit shows 0 broken routes
- [ ] No console errors on any page
- [ ] All primary buttons wired
- [ ] Secrets configured in platform

---

*Last Updated: 2026-01-20*