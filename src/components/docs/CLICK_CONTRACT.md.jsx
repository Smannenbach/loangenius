# Click Contract - Interactive Element Guidelines

## Overview
Every interactive element in the app must follow these rules to prevent "dead clicks" - situations where users click something that looks interactive but nothing happens.

## Button Types

### A) Navigation Buttons
Navigate to another page. Use `<Link>` or `<Button asChild><Link/></Button>`:

```jsx
// Direct link
<Link to={createPageUrl('PageName')}>Go to Page</Link>

// Styled as button
<Button asChild>
  <Link to={createPageUrl('PageName')}>Go to Page</Link>
</Button>
```

### B) Action Buttons
Perform an action. Must have `onClick`:

```jsx
<Button onClick={handleAction} data-testid="cta:PageName:ActionName">
  Do Something
</Button>
```

### C) Submit Buttons
Submit a form. Must have `type="submit"`:

```jsx
<Button type="submit" data-testid="cta:FormName:Submit">
  Submit Form
</Button>
```

### D) Disabled Buttons
Intentionally non-interactive. Must have `disabled` with explanation:

```jsx
<Tooltip content="Connect your account first">
  <Button disabled>Feature Not Available</Button>
</Tooltip>
```

### E) Trigger Buttons
Open dropdowns/modals. Wrapped by Radix trigger components:

```jsx
<DropdownMenuTrigger asChild>
  <Button>Open Menu</Button>
</DropdownMenuTrigger>
```

## Data Test IDs

Every primary CTA must have a data-testid following this pattern:
```
data-testid="cta:<PageName>:<ActionName>"
```

Examples:
- `data-testid="cta:Leads:Import"`
- `data-testid="cta:Dashboard:NewDeal"`
- `data-testid="cta:Settings:Save"`

## Button Type Default

Our Button component defaults to `type="button"` to prevent accidental form submissions.
Only use `type="submit"` for actual form submit buttons.

## Feedback Requirements

Every action button must provide user feedback:
1. **Loading state**: Show spinner while action is in progress
2. **Success**: Toast notification on success
3. **Error**: Toast notification or error message on failure

```jsx
const [isLoading, setIsLoading] = useState(false);

const handleAction = async () => {
  setIsLoading(true);
  try {
    await doSomething();
    toast.success('Action completed!');
  } catch (error) {
    toast.error('Action failed: ' + error.message);
  } finally {
    setIsLoading(false);
  }
};

<Button onClick={handleAction} disabled={isLoading}>
  {isLoading ? <Loader2 className="animate-spin" /> : null}
  Do Something
</Button>
```

## Adding New Routes

1. Create the page file in `pages/PageName.jsx`
2. Add to Layout sidebar if needed
3. Use `createPageUrl('PageName')` for navigation
4. Never hardcode routes as strings

## QA Audit

Run the QA Audit page (`/QAAudit`) to check for:
- Missing backend functions
- Dead buttons
- Broken routes
- Silent mutations (no toast feedback)

## Exempt Patterns (Not Dead Clicks)

These patterns are intentionally "no-op" and should not be flagged:
1. **Trigger buttons**: Inside `*Trigger` components (Dialog, Dropdown, Popover, etc.)
2. **Card click patterns**: Button inside clickable card (parent handles click)
3. **Disabled buttons**: Intentionally non-interactive
4. **Loading buttons**: Disabled during async operations