# Trust Center Specification - LoanGenius

## Overview
Customer-facing Trust Center for security transparency and due diligence.

---

## Routes

| Route | Page | Access | Purpose |
|-------|------|--------|---------|
| /Security | Security Overview | Public | Security controls summary |
| /Trust | Trust Center Hub | Public | Central hub for all trust info |
| /Subprocessors | Subprocessor List | Public | Vendor transparency |
| /Privacy | Privacy Summary | Public | Privacy practices |
| /Status | System Status | Public | Uptime/status (link) |

---

## Information Architecture

### /Trust (Hub)
```
Trust Center
├── Quick Answers
│   ├── Are you SOC 2 compliant?
│   ├── How is data encrypted?
│   └── How do you handle incidents?
├── Security Overview → /Security
├── Privacy Practices → /Privacy
├── Subprocessors → /Subprocessors
├── System Status → /Status
└── Due Diligence
    ├── Download Security Packet (gated)
    └── Request DPA
```

### /Security
```
Security Overview
├── Authentication & Access Control
├── Encryption
├── Monitoring & Logging
├── Vulnerability Management
├── Backup & Recovery
└── Incident Response
```

---

## Gating Rules

| Resource | Access Level | Method |
|----------|--------------|--------|
| Security Overview | Public | None |
| Trust Center Hub | Public | None |
| Subprocessor List | Public | None |
| Privacy Summary | Public | None |
| Security Packet Download | Gated | Auth or Request Form |
| DPA Template | Public | Direct download |
| DR Details | Gated | Auth or Request Form |

---

## Components

### TrustCenterLayout
- Consistent header with LoanGenius branding
- Navigation between trust pages
- Footer with contact info

### SecurityOverview
- Renders security practices
- Uses markdown from evidence files
- Shows last updated date

### SubprocessorTable
- Lists all vendors
- Filterable by category
- Shows last review date

### RequestAccessForm
- For gated content
- Collects name, email, company
- Creates access request record
- Notifies admin

### DownloadPacketButton
- Generates ZIP with security docs
- Requires auth or approved request

---

## Content Sources

| Content | Source File |
|---------|-------------|
| Security practices | SECURITY_PAGE_COPY.md |
| Subprocessors | SUBPROCESSORS.md |
| DPA template | DPA_TEMPLATE.md |
| Privacy | From policies |

---

## Update Process

1. Edit markdown source files
2. Deploy changes
3. Version tag updated automatically
4. "Last updated" reflects file modification

---

## Version Control

- All content versioned in repo
- Changes tracked in TRUST_CENTER_CHANGELOG.md
- Last updated shown on each page