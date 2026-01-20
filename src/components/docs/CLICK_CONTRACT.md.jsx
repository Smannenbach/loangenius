# Click Contract - Interactive Element Guidelines

## Overview
This document defines the "Click Contract" for LoanGenius - a set of rules ensuring every interactive element provides meaningful feedback to users.

## Core Principle
**No Dead Clicks**: Every clickable element must result in one of:
- Navigation (page change or external link)
- Action (data mutation, API call)
- Modal/Dialog/Dropdown opening
- Loading state visible to user
- Error toast if something fails
- Disabled state with explanation

---

## Button Types & Patterns

### 1. Navigation Buttons
```jsx
// ✅ CORRECT: Using Link with asChild
<Button asChild>
  <Link to={createPageUrl('Dashboard')}>Go to Dashboard</Link>
</Button>

// ✅ CORRECT: Direct Link styling
<Link to={createPageUrl('Settings')} className="...">Settings</Link>
```

### 2. Action Buttons
```jsx
// ✅ CORRECT: With onClick handler
<Button 
  onClick={() => handleSave()} 
  data-testid="cta:Settings:Save"
>
  Save Changes
</Button>

// ✅ CORRECT: With loading state
<Button 
  onClick={() => mutation.mutate()}
  disabled={mutation.isPending}
  data-testid="cta:Leads:Import"
>
  {mutation.isPending ? <Loader2 className="animate-spin" /> : null}
  Import Leads
</Button>
```

### 3. Submit Buttons (Forms)
```jsx
// ✅ CORRECT: Explicit type="submit" in form
<form onSubmit={handleSubmit}>
  <Button type="submit" data-testid="cta:Login:Submit">
    Sign In
  </Button>
</form>

// ⚠️ IMPORTANT: Non-submit buttons in forms need type="button"
// (Our Button component defaults to type="button" so this is handled)
```

### 4. Trigger Buttons (Radix UI)
```jsx
// ✅ CORRECT: Inside trigger wrapper (exempt from onClick requirement)
<DropdownMenuTrigger asChild>
  <Button variant="ghost">
    <MoreVertical />
  </Button>
</DropdownMenuTrigger>

<DialogTrigger asChild>
  <Button>Open Dialog</Button>
</DialogTrigger>
```

### 5. Disabled Buttons
```jsx
// ✅ CORRECT: Disabled with explanation
<Tooltip>
  <TooltipTrigger asChild>
    <span>
      <Button disabled>Submit to Lenders</Button>
    </span>
  </TooltipTrigger>
  <TooltipContent>
    Complete all required documents before submitting
  </TooltipContent>
</Tooltip>

// ✅ CORRECT: Coming soon feature
<Button disabled className="opacity-50">
  AI Analysis (Coming Soon)
</Button>
```

---

## Data Test ID Convention

Every primary CTA should have a `data-testid` attribute:

```
data-testid="cta:<PageName>:<ActionName>"
```

Examples:
- `data-testid="cta:Dashboard:CreateDeal"`
- `data-testid="cta:Leads:Import"`
- `data-testid="cta:DealDetail:SubmitToLenders"`
- `data-testid="cta:Settings:Save"`

---

## Mutation Feedback Requirements

Every data mutation MUST show feedback:

```jsx
// ✅ CORRECT: Toast on success/error
const mutation = useMutation({
  mutationFn: (data) => base44.entities.Lead.create(data),
  onSuccess: () => {
    toast.success('Lead created successfully');
    queryClient.invalidateQueries(['leads']);
  },
  onError: (error) => {
    toast.error('Failed to create lead: ' + error.message);
  }
});
```

---

## Adding a New Route Safely

1. **Add to routes.js**:
```js
// components/routes.js
export const routes = {
  ...
  MyNewPage: 'MyNewPage',
};
```

2. **Create the page file**: `pages/MyNewPage.jsx`

3. **Add to Layout sidebar** (if needed):
```jsx
// Layout.js - add to appropriate nav section
{ name: 'My New Page', href: '/MyNewPage', icon: SomeIcon },
```

4. **Update QAAudit SIDEBAR_PAGES** (if in sidebar):
```js
// pages/QAAudit.jsx
const SIDEBAR_PAGES = [..., 'MyNewPage'];
```

5. **Test**: Run QAAudit to verify no broken routes

---

## QA Audit Detection

The QAAudit page (`/QAAudit`) automatically detects:

### TRUE Dead Buttons (Must Fix)
- `<Button>` without onClick, type="submit", or asChild
- Not inside a Radix trigger wrapper
- Not inside a clickable parent container

### Exempt Patterns (Valid, No Fix Needed)
- Inside `DropdownMenuTrigger`, `DialogTrigger`, etc.
- Inside clickable parent (Card with onClick, Link)
- Disabled buttons
- Buttons with mutation patterns in context

---

## Common Mistakes to Avoid

```jsx
// ❌ WRONG: Button with no handler
<Button>Do Something</Button>

// ❌ WRONG: Button that does console.log only
<Button onClick={() => console.log('clicked')}>Test</Button>

// ❌ WRONG: Fake button (looks interactive, does nothing)
<div className="bg-blue-500 cursor-pointer p-2">Click Me</div>

// ❌ WRONG: Silent mutation (no toast)
await base44.entities.Lead.delete(id);
// User has no idea if it worked or failed
```

---

## Checklist for PRs

- [ ] All new buttons have onClick, type="submit", or asChild
- [ ] Primary CTAs have `data-testid="cta:Page:Action"`
- [ ] Mutations show toast on success AND error
- [ ] Loading states visible during async operations
- [ ] Disabled buttons have tooltips explaining why
- [ ] New routes added to `components/routes.js`
- [ ] QAAudit shows 0 TRUE dead buttons

---

## Error Handling

All UI errors are caught by the ErrorBoundary:
- Friendly fallback UI shown
- Debug details available (copy button)
- Route context logged (no PII)
- Option to retry or navigate home

---

*Last updated: 2026-01-20*