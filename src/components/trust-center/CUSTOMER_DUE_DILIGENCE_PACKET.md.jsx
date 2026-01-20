# Customer Due Diligence Packet - LoanGenius

## Overview

This document describes the contents of the LoanGenius Security Packet available to customers and prospective customers for due diligence purposes.

---

## Packet Contents

The downloadable security packet (ZIP) contains:

### 1. Security_Overview.md
Complete security practices documentation including:
- Authentication and access control
- Encryption practices
- Monitoring and logging
- Vulnerability management
- Backup and disaster recovery
- Incident response

**Source:** `components/trust-center/SECURITY_PAGE_COPY.md`

### 2. Trust_Center_FAQ.md
Frequently asked questions about LoanGenius security:
- SOC 2 alignment status
- Data encryption details
- Incident notification process
- Compliance frameworks
- Vendor management

### 3. DPA_Template.md
Data Processing Agreement template with:
- GDPR Article 28 compliant structure
- Data categories and purposes
- Processor obligations
- Security measures
- Sub-processing terms

**Source:** `components/trust-center/DPA_TEMPLATE.md`

### 4. Subprocessor_List.csv
Current subprocessors in CSV format:
- Vendor name
- Purpose
- Data categories
- Region
- Last review date
- DPA status

**Source:** `components/trust-center/SUBPROCESSORS.csv`

### 5. DR_Summary.md
Disaster recovery summary including:
- RPO/RTO targets
- Backup frequency
- Last successful restore drill date
- Recovery testing schedule

### 6. Vulnerability_Management_Summary.md
Overview of vulnerability management:
- Scanning frequency
- Remediation SLAs
- Patch management process
- Current status

### 7. Contact_Information.md
Security contact details and escalation paths:
- Security email
- Support email
- Incident reporting
- DPA requests

---

## Access Options

### Public Access
- Trust Center pages (/Trust, /Security, /Subprocessors, /Privacy)
- DPA Template
- Subprocessor list

### Gated Access (Requires Authentication or Request)
- Full security packet download
- Detailed DR documentation
- Security questionnaire responses

---

## How to Request Access

### Option 1: Authenticated Customers
Logged-in customers can download the security packet directly from the Trust Center.

### Option 2: Prospective Customers
1. Visit the Trust Center at /Trust
2. Click "Request Security Packet"
3. Complete the request form (name, email, company)
4. Our team will review and provide access within 1 business day

---

## Generation Process

The security packet is generated from source documentation:

```
1. Collect source files:
   - SECURITY_PAGE_COPY.md
   - DPA_TEMPLATE.md
   - SUBPROCESSORS.md
   - SUBPROCESSORS.csv
   - DR summary (from BACKUP_DR_PLAN.md)
   - Vulnerability summary (from VULNERABILITY_MANAGEMENT_POLICY.md)
   - Contact info

2. Generate FAQ from common questions

3. Package as ZIP:
   - LoanGenius_Security_Packet_YYYY-MM-DD.zip

4. Version with date for tracking
```

---

## Update Schedule

- **Monthly:** Review all documents for accuracy
- **Quarterly:** Update DR drill results
- **As needed:** Update for material changes

---

## Questions

For questions about the security packet:
- Email: security@loangenius.io
- Request custom documentation: dpa@loangenius.io