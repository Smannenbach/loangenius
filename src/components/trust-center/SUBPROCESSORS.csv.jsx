
# Subprocessor List - LoanGenius

**Last Updated:** January 20, 2026  
**Version:** 1.0

---

## Overview

This page lists the third-party service providers (subprocessors) that LoanGenius uses to process data on behalf of our customers. We are committed to transparency about our vendor relationships.

---

## Current Subprocessors

| Vendor | Purpose | Data Categories | Region | Last Reviewed | DPA Status |
|--------|---------|-----------------|--------|---------------|------------|
| **Base44** | Platform hosting | All application data | United States | 2026-01-20 | In place |
| **Google Cloud** | SSO Authentication | User identity, email | United States, Global | 2026-01-20 | In place |
| **SendGrid (Twilio)** | Email delivery | Email addresses, email content | United States | 2026-01-20 | In place |
| **Twilio** | SMS notifications | Phone numbers, SMS content | United States | 2026-01-20 | In place |
| **OpenAI** | AI-assisted processing | Query content | United States | 2026-01-20 | In place |
| **Anthropic** | AI-assisted processing | Query content | United States | 2026-01-20 | In place |
| **Google Workspace** | Document integrations | Connected data | United States, Global | 2026-01-20 | In place |
| **Cloudflare** | CDN, DNS, DDoS protection | Traffic metadata | Global | 2026-01-20 | In place |

---

## Data Categories Explained

| Category | Description |
|----------|-------------|
| All application data | Complete data stored in the platform |
| User identity | Name, email for authentication |
| Email addresses, content | Recipient addresses and message bodies |
| Phone numbers, SMS content | Recipient numbers and message text |
| Query content | Text sent to AI services (we avoid PII in AI queries) |
| Traffic metadata | IP addresses, request headers (anonymized) |

---

## Security Requirements for Subprocessors

All subprocessors must meet our security requirements:
- Encryption in transit and at rest
- Access controls
- Incident notification
- Data processing agreements in place
- Regular security reviews

---

## Subprocessor Change Notification

### How We Notify You
When we add or change a subprocessor:
1. This page is updated
2. Email notification sent to customers who have subscribed
3. 30-day notice before material changes take effect

### Subscribe to Updates
To receive notifications about subprocessor changes:
- Email: dpa@loangenius.io with subject "Subscribe to Subprocessor Updates"
- Include your company name and contact email

---

## Questions?

For questions about our subprocessors or data processing:
- **Email:** privacy@loangenius.io
- **Security inquiries:** security@loangenius.io

---

## Change Log

| Date | Change |
|------|--------|
| 2026-01-20 | Initial subprocessor list published |
