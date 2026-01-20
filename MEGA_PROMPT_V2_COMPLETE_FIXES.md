# LoanGenius MEGA PROMPT V2 - Complete Codebase Fixes

## Executive Summary

This comprehensive prompt details ALL ADDITIONAL issues found in a complete second scan of the LoanGenius codebase. This is a supplement to the original MEGA PROMPT covering new findings.

**Analysis Coverage:**
- 90+ pages in `src/pages/`
- 263 components in `src/components/`
- 216 backend functions in `functions/`
- All API integrations, data flow patterns, and UI/UX consistency

**New Issues Identified: 200+**

---

# PART 1: PAGE-LEVEL BUGS AND ISSUES

## 1.1 Pagination & Data Loading Bugs

### Issue: Pagination Allows Navigation to Empty Pages
**File:** `src/pages/Contacts.jsx:196`
```jsx
<Button
  variant="outline"
  onClick={() => setCurrentPage(p => p + 1)}
  disabled={filtered.length < 20}  // WRONG: checks filtered.length, not if MORE pages exist
>
```
**Problem:** Button disabled based on current page items, not total items. Users can navigate to empty pages.
**Fix:**
```jsx
const totalPages = Math.ceil(totalItems / pageSize);
<Button disabled={currentPage >= totalPages}>
```

### Issue: Missing Debounce on Search Inputs
**Files:** `src/pages/Leads.jsx:1057`, `src/pages/Contacts.jsx:77`
```jsx
<Input
  value={searchTerm}
  onChange={(e) => setSearchTerm(e.target.value)}  // NO DEBOUNCE - filters on every keystroke
/>
```
**Fix:**
```jsx
import { useDebouncedCallback } from 'use-debounce';

const debouncedSearch = useDebouncedCallback((value) => {
  setSearchTerm(value);
}, 300);

<Input onChange={(e) => debouncedSearch(e.target.value)} />
```

---

## 1.2 Form Validation Issues

### Issue: Wizard Allows Proceeding Without Validation
**File:** `src/pages/BusinessPurposeApplication.jsx:327-331`
```jsx
const handleNext = () => {
  if (currentStep < STEPS.length) {
    setCurrentStep(currentStep + 1);  // NO VALIDATION before moving forward
    autosaveMutation.mutate(formData);
  }
};
```
**Fix:**
```jsx
const handleNext = () => {
  const errors = validateStep(currentStep, formData);
  if (errors.length > 0) {
    setValidationErrors(errors);
    return;
  }
  setCurrentStep(currentStep + 1);
  autosaveMutation.mutate(formData);
};
```

### Issue: Missing Required Field Indicators
**File:** `src/pages/Leads.jsx:365-407`
```jsx
<Input
  placeholder="First name"
  value={newLead.first_name}
  // Missing: aria-required="true" and visual asterisk indicator
/>
```
**Fix:**
```jsx
<div className="space-y-1">
  <Label>First Name <span className="text-red-500">*</span></Label>
  <Input
    placeholder="First name"
    value={newLead.first_name}
    aria-required="true"
    aria-invalid={!!errors.first_name}
  />
  {errors.first_name && <p className="text-red-500 text-sm">{errors.first_name}</p>}
</div>
```

---

## 1.3 Broken/Fake Data Issues

### Issue: Executive Dashboard Shows Random Fake Data
**File:** `src/pages/ExecutiveDashboard.jsx:131-141`
```jsx
function generateMonthlyData(deals) {
  const months = [];
  for (let i = 11; i >= 0; i--) {
    months.push({
      month: d.toLocaleString('default', { month: 'short' }),
      volume: Math.random() * 5000000  // HARDCODED RANDOM DATA!
    });
  }
  return months;
}
```
**Fix:** Calculate actual monthly volumes from deal data:
```jsx
function generateMonthlyData(deals) {
  const monthlyVolumes = {};
  deals.forEach(deal => {
    const month = new Date(deal.created_date).toISOString().slice(0, 7);
    monthlyVolumes[month] = (monthlyVolumes[month] || 0) + (deal.loan_amount || 0);
  });
  // Convert to sorted array for last 12 months
}
```

### Issue: AdminAgents Metrics Are Random
**File:** `src/pages/AdminAgents.jsx:41-55`
```jsx
const { data: agentMetrics } = useQuery({
  queryFn: async () => ({
    agents: AGENTS.map(a => ({
      uptime: 99.8 + Math.random() * 0.2,  // RANDOM every refresh!
      error_rate: Math.random() * 0.05,
      run_count: Math.floor(Math.random() * 500) + 100
    }))
  }),
});
```
**Fix:** Fetch real metrics from backend function.

---

## 1.4 Modal/Dialog Issues

### Issue: Upload Dialog Doesn't Reset on Cancel
**File:** `src/pages/Documents.jsx:248-335`
```jsx
<Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
  {/* Form retains previous values if user cancels and reopens */}
```
**Fix:**
```jsx
const handleOpenChange = (open) => {
  if (!open) {
    setUploadData({ name: '', document_type: 'other' });
    setSelectedFile(null);
  }
  setIsUploadOpen(open);
};
```

### Issue: File Input Ref Not Reset After Upload
**File:** `src/pages/Documents.jsx:62-72`
```jsx
onSuccess: () => {
  setSelectedFile(null);  // State reset OK
  // BUT: fileInputRef.current.value = '' is missing
  // Can't re-select same file twice without page refresh
```
**Fix:**
```jsx
onSuccess: () => {
  setSelectedFile(null);
  if (fileInputRef.current) fileInputRef.current.value = '';
  queryClient.invalidateQueries(['documents']);
  setIsUploadOpen(false);
}
```

---

## 1.5 Navigation Issues

### Issue: Full Page Reload Instead of SPA Navigation
**File:** `src/pages/LoanApplication.jsx:76`
```jsx
window.location.href = createPageUrl('Pipeline');  // FULL PAGE RELOAD!
```
**Fix:**
```jsx
import { useNavigate } from 'react-router-dom';
const navigate = useNavigate();
navigate('/Pipeline');  // SPA navigation
```

### Issue: Conditional Rendering Logic Flawed
**File:** `src/pages/Leads.jsx:1150`
```jsx
{!isLoading && !error && leads.length > 0 && viewMode === 'table' ? (
  // table view
) : !isLoading && !error && leads.length > 0 ? (
  // card view
) : null}  // WRONG: empty/error states never display
```
**Fix:**
```jsx
{isLoading && <LoadingSpinner />}
{error && <ErrorMessage error={error} />}
{!isLoading && !error && leads.length === 0 && <EmptyState />}
{!isLoading && !error && leads.length > 0 && (
  viewMode === 'table' ? <TableView /> : <CardView />
)}
```

---

## 1.6 Duplicate API Calls

### Issue: Autosave Fires Every 30 Seconds Even Without Changes
**File:** `src/pages/BusinessPurposeApplication.jsx:262-269`
```jsx
useEffect(() => {
  const interval = setInterval(() => {
    if (orgId && (formData.loan_purpose || formData.applicant.first_name)) {
      autosaveMutation.mutate(formData);  // Fires regardless of changes
    }
  }, 30000);
```
**Fix:**
```jsx
const previousFormDataRef = useRef(formData);

useEffect(() => {
  const interval = setInterval(() => {
    if (JSON.stringify(formData) !== JSON.stringify(previousFormDataRef.current)) {
      autosaveMutation.mutate(formData);
      previousFormDataRef.current = formData;
    }
  }, 30000);
  return () => clearInterval(interval);
}, [formData]);
```

---

## 1.7 Date/Time Formatting Issues

### Issue: Invalid Date Not Handled
**File:** `src/pages/Communications.jsx:302`
```jsx
{log.created_date ? new Date(log.created_date).toLocaleString() : 'Just now'}
// If created_date is invalid string, shows "Invalid Date"
```
**Fix:**
```jsx
const formatDate = (dateStr) => {
  if (!dateStr) return 'Just now';
  const date = new Date(dateStr);
  return isNaN(date.getTime()) ? 'Unknown' : date.toLocaleString();
};
```

---

## 1.8 Missing Confirmations for Destructive Actions

### Issue: No Confirmation Before Changing Loan Status
**File:** `src/pages/Loans.jsx`
**Problem:** Users can accidentally mark loans as "funded" with no confirmation.

**Fix:** Add confirmation modal for status changes:
```jsx
const handleStatusChange = (newStatus) => {
  if (['funded', 'closed', 'denied'].includes(newStatus)) {
    setConfirmDialog({ open: true, status: newStatus });
    return;
  }
  updateStatusMutation.mutate(newStatus);
};
```

---

# PART 2: COMPONENT-LEVEL ISSUES

## 2.1 Missing Key Props in Lists (CRITICAL)

### Issue: Using Array Index as Key
**Files with this issue:**
- `src/components/portal/PortalMessageCenter.jsx:82`
- `src/components/deal-wizard/Step5Borrower.jsx:162`
- `src/components/deal-wizard/BorrowerSelector.jsx:115`
- `src/components/documents/DocumentDataExtractor.jsx:86-90`
- `src/components/onboarding/PreQualificationCheck.jsx:322, 331, 340, 351`

```jsx
{messages.map((msg, idx) => (
  <div key={idx}>  // WRONG: index as key
```
**Fix:**
```jsx
{messages.map((msg) => (
  <div key={msg.id}>  // Use unique ID
```

---

## 2.2 Memory Leaks & Async Issues

### Issue: Fire-and-Forget Mutations in Loop
**File:** `src/components/deal-detail/CommunicationsTab.jsx:210-211`
```jsx
unread.forEach(m => markAsReadMutation.mutate(m.id));  // Multiple mutations without await
```
**Fix:**
```jsx
const markAllAsRead = async () => {
  await Promise.all(unread.map(m => markAsReadMutation.mutateAsync(m.id)));
};
```

### Issue: scrollIntoView Can Throw on Hidden Elements
**File:** `src/components/portal/PortalSecureMessaging.jsx:121-123`
```jsx
useEffect(() => {
  scrollToBottom();  // Can throw if element is hidden
}, [messages]);
```
**Fix:**
```jsx
useEffect(() => {
  try {
    messagesEndRef.current?.scrollIntoView?.({ behavior: 'smooth' });
  } catch (e) {
    // Element not visible, ignore
  }
}, [messages]);
```

---

## 2.3 Dependency Array Issues

### Issue: Object in Dependency Array Causes Infinite Loops
**File:** `src/components/deal-wizard/DealCalculator.jsx:84`
```jsx
useEffect(() => {
  setCalculations(calculateMetrics());
}, [deal, properties, manualInput]);  // manualInput is object - recreated every render
```
**Fix:**
```jsx
useEffect(() => {
  setCalculations(calculateMetrics());
}, [deal, properties, manualInput.rate, manualInput.term, manualInput.amount]);
// Depend on specific fields, not entire object
```

---

## 2.4 File Upload Issues

### Issue: No Null Check on Files Array
**File:** `src/components/portal/PortalDocumentCenter.jsx:290`
```jsx
onChange={(e) => {
  const file = e.target.files[0];  // files could be null
  if (file) handleFileSelect(req.id, file);
}}
```
**Fix:**
```jsx
onChange={(e) => {
  const files = e.target.files;
  if (files && files.length > 0) {
    handleFileSelect(req.id, files[0]);
  }
}}
```

---

## 2.5 Date Mutation Bug

### Issue: Mutating Date Object
**File:** `src/components/portal/PortalDashboard.jsx:86`
```jsx
const getEstimatedClosing = () => {
  const today = new Date();
  return new Date(today.setDate(today.getDate() + days));  // Mutates today!
};
```
**Fix:**
```jsx
const getEstimatedClosing = () => {
  const today = new Date();
  const future = new Date(today.getTime());
  future.setDate(future.getDate() + days);
  return future;
};
```

---

## 2.6 Query Key Invalidation Issues

### Issue: Incomplete Query Invalidation
**File:** `src/components/portal/PortalSecureMessaging.jsx:81`
```jsx
queryClient.invalidateQueries({ queryKey: ['portalMessages'] });  // Missing dealId
```
**Fix:**
```jsx
queryClient.invalidateQueries({ queryKey: ['portalMessages', dealId, sessionId] });
```

---

## 2.7 Alert() Calls to Replace with Toast

**Files requiring changes (12 locations):**

| File | Line | Replace With |
|------|------|--------------|
| `src/components/GoogleSheetsSync.jsx` | 50, 55 | `toast.success/error()` |
| `src/components/CommunicationCenter.jsx` | 57 | `toast.error('Please fill all fields')` |
| `src/pages/AdminWebhooks.jsx` | 55 | `toast.error('Webhook URL required')` |
| `src/pages/BorrowerPortalHome.jsx` | 257, 267, 269 | Toast notifications |
| `src/components/SmartDocumentUploader.jsx` | 82 | `toast.error('Camera access denied')` |
| `src/pages/BrandStudio.jsx` | 86, 88, 116 | Toast for save/upload errors |
| `src/components/deal-detail/SendForSignatureModal.jsx` | 27 | Toast for validation |
| `src/pages/ContactDetail.jsx` | 161, 175 | `toast.warning('No email available')` |
| `src/components/ImportFromGoogleSheets.jsx` | 42, 48, 61, 64, 71 | Toast notifications |
| `src/components/portal/PortalDocumentsTab.jsx` | 62, 68 | Toast for validation |
| `src/components/portal/PortalDocumentUpload.jsx` | 89, 94 | Toast for file errors |

---

# PART 3: BACKEND FUNCTION ISSUES

## 3.1 N+1 Query Problems (CRITICAL PERFORMANCE)

### Issue: N+1 Loop in MISMO Export
**File:** `functions/exportDealMISMO.ts:59-88`
```typescript
for (const db of dealBorrowers) {
  const borrowers = await base44.asServiceRole.entities.Borrower.filter({ id: db.borrower_id });
  // Then 4 more filter calls per iteration
}
// 10 borrowers = 50+ database queries!
```
**Fix:**
```typescript
// Batch fetch all related data upfront
const borrowerIds = dealBorrowers.map(db => db.borrower_id);
const [allBorrowers, allAssets, allReoProps] = await Promise.all([
  base44.asServiceRole.entities.Borrower.filter({ id: { $in: borrowerIds } }),
  base44.asServiceRole.entities.Asset.filter({ borrower_id: { $in: borrowerIds } }),
  base44.asServiceRole.entities.REOProperty.filter({ borrower_id: { $in: borrowerIds } }),
]);
// Then map locally
```

### Issue: N+1 in Email Sequence Processor
**File:** `functions/emailSequenceProcessor.ts:64-70`
```typescript
for (const enrollment of enrollments) {
  if (enrollment.lead_id) {
    const leads = await base44.asServiceRole.entities.Lead.filter({ id: enrollment.lead_id });
  }
}
```
**Fix:** Same pattern - batch fetch all leads/deals upfront.

### Issue: Fetching All Deals Just to Count
**File:** `functions/createOrUpdateDeal.ts:23`
```typescript
const existingDeals = await base44.entities.Deal.filter({ org_id: orgId });
const sequenceNum = String(existingDeals.length + 1).padStart(4, '0');
// Fetches ALL deals in org when only count needed!
```
**Fix:**
```typescript
const count = await base44.entities.Deal.count({ org_id: orgId });
const sequenceNum = String(count + 1).padStart(4, '0');
```

---

## 3.2 Missing Pagination (CRITICAL - OOM Risk)

### Issue: Audit Log Fetches Everything
**File:** `functions/getAuditLog.ts:29-30`
```typescript
const logs = await base44.asServiceRole.entities.ActivityLog.filter(filters);
const sorted = logs.sort(...).slice(0, limit);
// Fetches ALL logs, then sorts in memory, then limits
```
**Fix:**
```typescript
const logs = await base44.asServiceRole.entities.ActivityLog.filter(filters, {
  order_by: ['-created_at'],
  limit: limit,
  offset: offset
});
```

### Issue: Daily Reminders No Limit
**File:** `functions/sendDailyReminders.ts:14-16`
```typescript
const requirements = await base44.asServiceRole.entities.DealDocumentRequirement.filter({
  status: 'requested'
});
// Could return millions of records!
```
**Fix:** Add pagination and process in batches.

---

## 3.3 Mock/Incomplete Implementations (PRODUCTION BROKEN)

### Issue: SMS Never Actually Sent
**File:** `functions/sendCommunication.ts:31-33`
```typescript
} else if (channel === 'sms') {
  // SMS would use Twilio integration
  result = { sent: true, message: 'SMS queued' };  // FAKE SUCCESS!
}
```
**Fix:** Implement actual Twilio integration:
```typescript
} else if (channel === 'sms') {
  const twilioResponse = await base44.functions.invoke('twilioSMS', { to, body });
  result = { sent: twilioResponse.success, sid: twilioResponse.sid };
}
```

### Issue: Income Verification is Placeholder
**File:** `functions/enrichBorrowerData.ts:87-104`
```typescript
const incomeResult = await verifyIncome(borrower, org_id, deal_id, user, base44);
// Returns: { success: true, status: 'pending' }
// Actually does nothing - just logs!
```

### Issue: Broker Rate Card is Hardcoded
**File:** `functions/brokerChannelManager.ts:12-32`
```typescript
const rateCard = [
  { dscr_band: '1.25+', pi_coupon: 0.064, ... }
];
// Returns hardcoded mock rates - not connected to real pricing engine
```

### Issue: OTP Exposed in Production Response
**File:** `functions/sendSMSOTP.ts:24-36`
```typescript
return Response.json({
  success: true,
  // Remove this in production:
  otp_for_testing: otp,  // SECURITY: Remove this!
});
```
**Fix:** Remove `otp_for_testing` field immediately.

### Issue: Workflow Orchestrator Returns Fake Data
**File:** `functions/orchestratorGetStatus.ts:12-14`
```typescript
// For MVP, return a simulated workflow status with events
const simulatedStatus = { ... };  // All fake data
```

---

## 3.4 IDOR Vulnerabilities (SECURITY)

### Issue: No Authorization Check on Deal Access
**File:** `functions/portalStatusTracker.ts:24-27`
```typescript
const deal = await base44.entities.Deal.filter({
  id: session.dealId,
  org_id: session.orgId,
});
// sessionId not validated! Attacker can guess sessionId
```
**Fix:**
```typescript
// Verify session token matches expected hash
const session = await validatePortalSession(req.headers.get('Authorization'));
if (!session) return Response.json({ error: 'Invalid session' }, { status: 401 });
```

### Issue: Any User Can Update Any Deal
**File:** `functions/applicationAutosave.ts:20-24`
```typescript
await base44.entities.Deal.update(deal_id, {
  wizard_data_json: wizard_data,
});
// deal_id from request without ownership verification!
```
**Fix:**
```typescript
// Verify user has access to this deal
const deal = await base44.entities.Deal.filter({ id: deal_id, org_id: user.org_id });
if (deal.length === 0) return Response.json({ error: 'Not found' }, { status: 404 });
```

---

## 3.5 Missing Webhook Signature Verification

### Issue: Twilio Webhook Accepts Any Request
**File:** `functions/twilioSMSWebhook.ts:1-108`
```typescript
// No signature verification - anyone can inject fake webhooks
```
**Fix:**
```typescript
import { validateTwilioSignature } from './_shared/twilio.ts';

const signature = req.headers.get('X-Twilio-Signature');
if (!validateTwilioSignature(signature, req.url, await req.text())) {
  return Response.json({ error: 'Invalid signature' }, { status: 403 });
}
```

---

## 3.6 XSS in Email Templates

### Issue: Unsanitized User Data in HTML Email
**File:** `functions/sendgridEmail.ts:116-124`
```typescript
welcome: `
  <h2>Welcome to LoanGenius</h2>
  <p>Dear ${data.borrower_name || 'Borrower'},</p>
  <a href="${data.portal_url}">Access Your Portal</a>
`,
// borrower_name not escaped - XSS risk
// portal_url not validated - could be javascript: URL
```
**Fix:**
```typescript
import { escapeHtml, isValidUrl } from './_shared/sanitize.ts';

welcome: `
  <p>Dear ${escapeHtml(data.borrower_name || 'Borrower')},</p>
  <a href="${isValidUrl(data.portal_url) ? data.portal_url : '#'}">Access Portal</a>
`,
```

---

## 3.7 Race Conditions

### Issue: Deal Number Collision
**File:** `functions/createOrUpdateDeal.ts:21-26`
```typescript
const sequenceNum = String(existingDeals.length + 1).padStart(4, '0');
dealData.deal_number = `LG-${yearMonth}-${sequenceNum}`;
// Race condition: two concurrent requests = same deal number!
```
**Fix:**
```typescript
// Use database sequence or UUID-based deal numbers
const dealNumber = `LG-${yearMonth}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
```

### Issue: Subscription Status Race
**File:** `functions/stripeWebhook.ts:231-235`
```typescript
if (accounts[0].status === 'past_due') {
  await base44.asServiceRole.entities.BillingAccount.update(accounts[0].id, {
    status: 'active',
  });
}
// Another webhook could mark it past_due again simultaneously
```

---

## 3.8 Missing Idempotency

### Issue: Deal Creation Without Duplicate Check
**File:** `functions/applicationService.ts:170-198`
```typescript
const deal = await base44.asServiceRole.entities.Deal.create({ ... });
// No check if application already converted to deal
// Could create duplicate deals if called twice
```
**Fix:**
```typescript
// Check for existing deal first
const existing = await base44.asServiceRole.entities.Deal.filter({
  application_id: application_id
});
if (existing.length > 0) {
  return Response.json({ deal: existing[0], already_existed: true });
}
```

---

## 3.9 Error Messages Exposing Internal Details

**27+ files return raw error.message to client:**

```typescript
return Response.json({ error: error.message }, { status: 500 });
// Could expose: "Cannot read property 'id' of undefined at line 45"
```

**Fix:** Create sanitized error responses:
```typescript
const safeError = (error, userMessage = 'An error occurred') => {
  console.error('Internal error:', error);  // Log full error
  return Response.json({
    error: userMessage,
    code: 'INTERNAL_ERROR'
  }, { status: 500 });
};
```

---

## 3.10 Hardcoded Values

### Issue: Org ID Hardcoded to 'default'
**File:** `functions/twilioSMSWebhook.ts:52, 91`
```typescript
org_id: 'default'  // All SMS opt-outs go to wrong org!
```

### Issue: Development URLs in Production
**File:** `functions/sendDailyReminders.ts:79, 82`
```typescript
from_address: 'noreply@loangenius.local',
body: `...https://portal.loangenius.local/login...`
// Borrowers receive invalid links!
```
**Fix:** Load URLs from environment variables.

---

## 3.11 DOMParser Not Available in Deno

### Issue: Browser API Used in Server
**File:** `functions/mismoImportOrchestrator.ts:34-35`
```typescript
const parser = new DOMParser();
const xmlDoc = parser.parseFromString(xml_content, 'text/xml');
// DOMParser is browser-only - will fail in Deno!
```
**Fix:**
```typescript
import { parse } from 'https://deno.land/x/xml@2.1.1/mod.ts';
const xmlDoc = parse(xml_content);
```

---

# PART 4: DATA FLOW & STATE MANAGEMENT

## 4.1 Inconsistent Cache Keys

**Current inconsistent patterns:**
- `['deal', dealId]` in DealDetail.jsx
- `['deal-edit', dealId]` in DealWizard.jsx (different key for same entity!)
- `['deal-fees', dealId]` in FeesTab.jsx
- `[entityName, 'org', orgId, JSON.stringify(filters)]` in useOrgId.jsx (too complex)

**Fix:** Standardize cache key factory:
```javascript
// src/lib/queryKeys.js
export const queryKeys = {
  deals: {
    all: ['deals'],
    list: (orgId) => ['deals', 'list', orgId],
    detail: (id) => ['deals', 'detail', id],
    fees: (id) => ['deals', 'detail', id, 'fees'],
  },
  // ... other entities
};
```

---

## 4.2 Over-Fetching (CRITICAL)

### Issue: Fetching ALL Records Then Filtering Client-Side
**Files:** `src/pages/Deals.jsx:63-67`, `src/pages/Documents.jsx:80`
```jsx
const allDeals = await base44.entities.Deal.list();
return allDeals.filter(d => !d.is_deleted);
// Fetches thousands of records when user needs 20!
```
**Fix:**
```jsx
const deals = await base44.entities.Deal.filter({
  org_id: orgId,
  is_deleted: false
}, {
  limit: 50,
  offset: page * 50
});
```

---

## 4.3 Under-Fetching (Waterfall Loading)

### Issue: DealDetail Makes 6 Separate Queries
**File:** `src/pages/DealDetail.jsx:60-144`
```jsx
const { data: deal } = useQuery(...);        // Query 1
const { data: properties } = useQuery(...);  // Query 2 (waits for query 1)
const { data: borrowers } = useQuery(...);   // Query 3
const { data: documents } = useQuery(...);   // Query 4
const { data: conditions } = useQuery(...);  // Query 5
const { data: tasks } = useQuery(...);       // Query 6
```
**Fix:** Create batched backend endpoint:
```typescript
// functions/getDealWithRelations.ts
const [deal, properties, borrowers, documents, conditions, tasks] = await Promise.all([...]);
return Response.json({ deal, properties, borrowers, documents, conditions, tasks });
```

---

## 4.4 Missing Optimistic Updates

**Only 2 places implement optimistic updates out of 150+ mutations:**
- `src/pages/AIAssistant.jsx:61`
- `src/components/portal/PortalChatWidget.jsx:53`

**Fix:** Add optimistic updates to critical mutations:
```jsx
const updateDealMutation = useMutation({
  mutationFn: (data) => base44.entities.Deal.update(dealId, data),
  onMutate: async (newData) => {
    await queryClient.cancelQueries(['deals', 'detail', dealId]);
    const previous = queryClient.getQueryData(['deals', 'detail', dealId]);
    queryClient.setQueryData(['deals', 'detail', dealId], { ...previous, ...newData });
    return { previous };
  },
  onError: (err, newData, context) => {
    queryClient.setQueryData(['deals', 'detail', dealId], context.previous);
  },
});
```

---

## 4.5 URL State Not Synced

### Issue: All Pages Use window.location Instead of useSearchParams
**Files:** `src/pages/DealDetail.jsx:53`, `src/pages/DealWizard.jsx:17`, `src/pages/LoanApplicationWizard.jsx:101`
```jsx
const urlParams = new URLSearchParams(window.location.search);
const dealId = urlParams.get('id');
// URL doesn't update when filters change - breaks back button and sharing
```
**Fix:**
```jsx
import { useSearchParams } from 'react-router-dom';
const [searchParams, setSearchParams] = useSearchParams();
const dealId = searchParams.get('id');

// When changing filters:
setSearchParams({ id: dealId, tab: 'documents' });
```

---

## 4.6 Form State Lost on Navigation

### Issue: Multi-Step Form Uses Local State Only
**File:** `src/pages/LoanApplicationWizard.jsx:35-81`
```jsx
const [formData, setFormData] = useState({ borrowers: [], ... });
// Lost on page refresh, can't navigate away and back
```
**Fix:** Persist to sessionStorage or backend draft:
```jsx
const [formData, setFormData] = useState(() => {
  const saved = sessionStorage.getItem('loanApplication');
  return saved ? JSON.parse(saved) : initialFormData;
});

useEffect(() => {
  sessionStorage.setItem('loanApplication', JSON.stringify(formData));
}, [formData]);
```

---

## 4.7 No Real-Time Updates

**Current:** Polling with 5-10 second intervals (inefficient)
- `src/components/deal-detail/CommunicationsTab.jsx:36` - 10s poll
- `src/components/portal/PortalMessageCenter.jsx:27` - 5s poll
- `src/components/portal/PortalSecureMessaging.jsx:47` - 8s poll

**Fix:** Implement WebSocket for real-time:
```jsx
// src/hooks/useRealtimeMessages.js
export function useRealtimeMessages(dealId) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const ws = new WebSocket(`wss://api.loangenius.com/ws/deals/${dealId}/messages`);
    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      queryClient.setQueryData(['messages', dealId], (old) => [...old, message]);
    };
    return () => ws.close();
  }, [dealId]);
}
```

---

# PART 5: UI/UX CONSISTENCY ISSUES

## 5.1 Duplicate Components

### Issue: Two Different KPICard Components
- `src/components/analytics/KPICard.jsx` - Uses gradient backgrounds
- `src/components/dashboard/KPICard.jsx` - Uses white background

**Fix:** Consolidate into single configurable component.

---

## 5.2 Inconsistent Focus States

**5 different focus patterns found:**
1. `focus-visible:ring-1` (Button, Input)
2. `focus:ring-2 focus:ring-offset-2` (Badge, Dialog)
3. `focus-visible:ring-2` (Switch, Sidebar)
4. `focus:bg-accent` no ring (Dropdown)
5. No focus styling (some custom components)

**Fix:** Create standard focus utility:
```css
/* In globals.css */
.focus-ring {
  @apply focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2;
}
```

---

## 5.3 Inconsistent Spacing

**Table cell padding varies:**
- `p-2` in Table.jsx
- `px-4 py-3` in ResponsiveTable.jsx
- `px-8 py-4` in LoadingSkeletons.jsx

**Fix:** Define spacing tokens and use consistently.

---

## 5.4 Inconsistent Page Titles

**Current:**
- Dashboard: `text-3xl font-bold`
- Deals: `text-2xl font-semibold`

**Fix:** Create PageHeader component:
```jsx
export const PageHeader = ({ title, subtitle, actions }) => (
  <div className="flex justify-between items-center mb-6">
    <div>
      <h1 className="text-2xl font-semibold text-gray-900">{title}</h1>
      {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
    </div>
    {actions && <div className="flex gap-2">{actions}</div>}
  </div>
);
```

---

## 5.5 Missing Breadcrumbs

Breadcrumb component exists at `src/components/ui/breadcrumb.jsx` but is NOT USED anywhere.

**Fix:** Add breadcrumbs to all detail/nested pages:
```jsx
<Breadcrumb>
  <BreadcrumbList>
    <BreadcrumbItem><BreadcrumbLink href="/Dashboard">Home</BreadcrumbLink></BreadcrumbItem>
    <BreadcrumbSeparator />
    <BreadcrumbItem><BreadcrumbLink href="/Deals">Deals</BreadcrumbLink></BreadcrumbItem>
    <BreadcrumbSeparator />
    <BreadcrumbItem><BreadcrumbPage>{deal.deal_number}</BreadcrumbPage></BreadcrumbItem>
  </BreadcrumbList>
</Breadcrumb>
```

---

## 5.6 Missing Empty States

No standardized empty state component. Different pages show different empty UI.

**Fix:** Create EmptyState component:
```jsx
export const EmptyState = ({ icon: Icon, title, description, action }) => (
  <div className="flex flex-col items-center justify-center py-12 text-center">
    {Icon && <Icon className="h-12 w-12 text-gray-400 mb-4" />}
    <h3 className="text-lg font-medium text-gray-900">{title}</h3>
    <p className="text-sm text-gray-500 mt-1 max-w-sm">{description}</p>
    {action && <div className="mt-4">{action}</div>}
  </div>
);
```

---

## 5.7 Missing Print Styles

No `@media print` rules in entire codebase.

**Fix:** Add print styles:
```css
@media print {
  .no-print, nav, aside, button { display: none !important; }
  .print-only { display: block !important; }
  body { font-size: 12pt; }
  @page { margin: 1in; }
}
```

---

## 5.8 Incomplete Dark Mode

Only minimal dark mode support:
- Alert: `dark:border-destructive`
- Dialog overlay: hardcoded `bg-black/80`

**Fix:** Add comprehensive dark mode to all components using CSS variables.

---

# PART 6: "COMING SOON" FEATURES TO IMPLEMENT

These features show toast "Coming soon" but have no implementation:

| File | Feature | Line |
|------|---------|------|
| `src/pages/AgentKnowledgeBase.jsx` | Edit document | 125 |
| `src/pages/AgentKnowledgeBase.jsx` | Delete document | 128 |
| `src/pages/AdminAgents.jsx` | Metrics dashboard | 179 |
| `src/pages/AdminAgents.jsx` | Agent configuration | 187 |
| `src/pages/DealDetail.jsx` | PDF export | 319 |
| `src/pages/DealDetail.jsx` | Document upload | 468 |
| `src/pages/DealDetail.jsx` | Add condition | 515 |
| `src/pages/DealDetail.jsx` | Portal preview | 736 |
| `src/pages/PortalSettings.jsx` | Template editor | 346 |

---

# PART 7: CONSOLE.LOG STATEMENTS TO REMOVE

**40+ console.log/error statements in production code:**

**High Priority (auth/security):**
- `src/lib/AuthContext.jsx:49, 80, 99`
- `src/components/OTPVerification.jsx:130, 328, 337`
- `src/components/useOrgId.jsx:63, 122, 156`

**Medium Priority (user-facing):**
- `src/pages/QuoteGenerator.jsx:44, 339`
- `src/pages/Lenders.jsx:304`
- `src/pages/LoanApplication.jsx:70, 200`
- `src/pages/Users.jsx:84`

**Low Priority (observability):**
- `src/components/observability/Telemetry.jsx:49, 154, 212, 246`
- `src/components/observability/ErrorCapture.jsx:186, 229`

**Fix:** Replace with proper logging or remove entirely.

---

# IMPLEMENTATION PRIORITY ORDER

## Phase 1: Critical Security & Data Loss (Week 1)
1. Remove OTP from response in `sendSMSOTP.ts`
2. Fix IDOR vulnerabilities in portal functions
3. Add webhook signature verification
4. Fix N+1 queries in MISMO export
5. Add pagination to audit log queries
6. Implement actual SMS sending (not mock)

## Phase 2: Performance & Stability (Week 2)
1. Fix over-fetching (`.list()` to `.filter()`)
2. Add debounce to all search inputs
3. Fix memory leaks (event listeners, intervals)
4. Fix infinite loop risks in useEffect dependencies
5. Create batched data fetch endpoints

## Phase 3: Data Integrity (Week 3)
1. Fix race conditions in deal number generation
2. Add idempotency to deal creation
3. Standardize React Query cache keys
4. Fix query invalidation patterns
5. Implement optimistic updates

## Phase 4: User Experience (Week 4)
1. Fix form validation in wizards
2. Fix modal reset on close
3. Replace alert() with toast
4. Add proper empty states
5. Fix navigation to use SPA routing

## Phase 5: UI Consistency (Week 5)
1. Consolidate duplicate components
2. Standardize focus states
3. Standardize spacing tokens
4. Add breadcrumbs to detail pages
5. Create consistent page headers

## Phase 6: Complete Features (Week 6+)
1. Implement "Coming Soon" features
2. Add proper dark mode support
3. Add print styles
4. Implement WebSocket real-time updates
5. Remove all console.log statements

---

# SUMMARY STATISTICS

| Category | Issues Found | Severity |
|----------|-------------|----------|
| N+1 Queries | 4 | CRITICAL |
| Missing Pagination | 3 | CRITICAL |
| IDOR Vulnerabilities | 3 | CRITICAL |
| Mock Implementations | 6 | CRITICAL |
| Over-fetching | 15+ | HIGH |
| Missing Key Props | 6 | HIGH |
| Memory Leaks | 5 | HIGH |
| Race Conditions | 3 | HIGH |
| XSS Vulnerabilities | 3 | HIGH |
| Missing Validation | 10+ | MEDIUM |
| Alert() Calls | 12 | MEDIUM |
| Console.log | 40+ | LOW |
| UI Inconsistencies | 25 categories | MEDIUM |
| Coming Soon Features | 9 | LOW |
| **TOTAL NEW ISSUES** | **200+** | |

---

**END OF MEGA PROMPT V2**

*Generated: 2026-01-20*
*Codebase: LoanGenius Loan Origination Platform*
*This supplements the original MEGA PROMPT with additional findings.*
