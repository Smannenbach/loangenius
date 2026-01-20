# Trust Center Changelog

## Overview
Tracks all Trust Center content updates and changes.

---

## 2026-01-20: Initial Trust Center Launch

### Pages Created
| Page | Route | Status |
|------|-------|--------|
| Trust Center Hub | /Trust | ✅ Live |
| Security Overview | /Security | ✅ Live |
| Subprocessors | /Subprocessors | ✅ Live |
| Privacy | /Privacy | ✅ Live |
| Status | /Status | ✅ Live (links to status page) |

### Documentation Created
| Document | Path | Purpose |
|----------|------|---------|
| TRUST_CENTER_SPEC.md | components/trust-center/ | Architecture |
| SECURITY_PAGE_COPY.md | components/trust-center/ | Security content |
| DPA_TEMPLATE.md | components/trust-center/ | DPA template |
| SUBPROCESSORS.md | components/trust-center/ | Vendor list |
| SUBPROCESSORS.csv | components/trust-center/ | CSV export |
| CUSTOMER_DUE_DILIGENCE_PACKET.md | components/trust-center/ | Packet contents |
| TRUST_CENTER_CHANGELOG.md | components/trust-center/ | This file |

### Features Implemented
- ✅ Public security overview page
- ✅ Trust Center hub with quick answers
- ✅ Subprocessor list (table format)
- ✅ DPA template download
- ✅ Privacy practices summary
- ✅ Request access form for gated content
- ✅ Security packet download (gated)
- ✅ Contact information and escalation

---

## Content Update Process

### Monthly Updates
1. Review all Trust Center pages for accuracy
2. Update DR drill dates
3. Update subprocessor list if changed
4. Verify all links work
5. Update "Last Updated" dates

### How to Update Content

#### Security Overview
1. Edit `SECURITY_PAGE_COPY.md`
2. Deploy changes
3. Verify rendering on /Security
4. Update this changelog

#### Subprocessors
1. Edit `SUBPROCESSORS.md` (display)
2. Edit `SUBPROCESSORS.csv` (download)
3. Keep both in sync
4. Send notification to subscribers if material change

#### DPA Template
1. Edit `DPA_TEMPLATE.md`
2. Have legal review changes
3. Update version number
4. Deploy

---

## Notification Requirements

### Subprocessor Changes
- Update list 30 days before change takes effect
- Email subscribers
- Note change in this changelog

### Security Practice Changes
- Update documentation immediately
- No advance notice required
- Note change in this changelog

---

## Version History

| Version | Date | Summary |
|---------|------|---------|
| 1.0 | 2026-01-20 | Initial Trust Center launch |

---

## Ownership

| Role | Responsibility |
|------|----------------|
| Security Team | Content accuracy |
| Legal | DPA template |
| DevOps | Page deployment |
| Admin | Subprocessor reviews |