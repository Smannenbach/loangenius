# Vendor Management Policy - LoanGenius

**Version:** 1.0  
**Effective Date:** 2026-01-20  
**Owner:** Administration  
**Review Frequency:** Annual

---

## Purpose
Establish requirements for managing third-party vendors and their access to LoanGenius data.

---

## Scope
All third-party vendors, service providers, and integrations that:
- Process LoanGenius data
- Have access to systems
- Provide critical services

---

## Vendor Categories

| Category | Risk Tier | Examples |
|----------|-----------|----------|
| Data Processors | High | Cloud providers, analytics |
| Authentication | High | Google SSO |
| Communications | Medium | SendGrid, Twilio |
| AI Services | Medium | OpenAI, Anthropic |
| Integrations | Medium | Google Sheets, Calendar |
| Development Tools | Low | GitHub, npm |

---

## Risk Tiers

| Tier | Criteria | Due Diligence |
|------|----------|---------------|
| High | PII access, critical service | Full assessment |
| Medium | Limited data, non-critical | Standard assessment |
| Low | No data access | Basic assessment |

---

## Vendor Selection

### Due Diligence Requirements

#### High Risk Vendors
- [ ] Security certifications (SOC 2, ISO 27001)
- [ ] Data processing agreement
- [ ] Incident response capabilities
- [ ] Business continuity plan
- [ ] Insurance coverage
- [ ] Reference checks

#### Medium Risk Vendors
- [ ] Security documentation review
- [ ] Terms of service review
- [ ] Data handling practices
- [ ] Support capabilities

#### Low Risk Vendors
- [ ] Terms of service review
- [ ] Reputation check

---

## Contracting Requirements

### Required Terms
- Data processing agreement (high/medium)
- Confidentiality obligations
- Security requirements
- Incident notification (24-48 hours)
- Audit rights
- Termination provisions
- Data return/deletion

### Data Processing Agreement Elements
- Purpose of processing
- Data types processed
- Processing locations
- Subprocessor requirements
- Security measures
- Breach notification

---

## Access Management

### Vendor Access Principles
- Least privilege
- Time-limited where possible
- Separate credentials
- Monitored access
- Documented purpose

### Access Provisioning
1. Business justification
2. Scope definition
3. Admin approval
4. Access granted
5. Access documented
6. Review scheduled

### Access Removal
- Upon contract end
- Upon breach of terms
- Upon security incident
- During offboarding

---

## Ongoing Monitoring

### Review Schedule
| Tier | Frequency |
|------|-----------|
| High | Quarterly |
| Medium | Semi-annually |
| Low | Annually |

### Review Checklist
- [ ] Service still needed
- [ ] Performance acceptable
- [ ] Security posture maintained
- [ ] Contract current
- [ ] Access appropriate
- [ ] Incidents reviewed

---

## Vendor Register

Required fields for vendor register:
- Vendor name
- Service description
- Data access (Y/N, types)
- Risk tier
- Contract start/end
- Review date
- Owner
- Security certifications
- Notes

---

## Security Requirements

### For High-Risk Vendors
- SOC 2 Type II or equivalent
- Encryption in transit and at rest
- Access controls
- Audit logging
- Incident response plan
- Regular security testing

### For Medium-Risk Vendors
- Security documentation
- Encryption in transit
- Access controls
- Incident notification

### For Low-Risk Vendors
- Basic security practices
- Terms of service compliance

---

## Incident Management

### Vendor Incident Response
1. Vendor notifies us within 24-48 hours
2. We assess impact
3. Coordinate response
4. Document incident
5. Review vendor relationship

### Our Responsibilities
- Monitor for vendor breaches
- Assess impact on our data
- Notify affected parties if needed
- Document and learn

---

## Offboarding

### Vendor Termination Process
1. Decision to terminate
2. Review data held by vendor
3. Request data return/deletion
4. Revoke access
5. Verify access removed
6. Update vendor register
7. Archive documentation

### Data Return/Deletion
- Request in writing
- Verify completion
- Obtain certification if needed

---

## Current Vendors

### Critical Vendors (Tier: High)
| Vendor | Service | Data Access |
|--------|---------|-------------|
| Base44 | Platform hosting | All data |
| Google | SSO Authentication | User identity |

### Communication Vendors (Tier: Medium)
| Vendor | Service | Data Access |
|--------|---------|-------------|
| SendGrid | Email delivery | Email addresses, content |
| Twilio | SMS delivery | Phone numbers, content |

### AI Vendors (Tier: Medium)
| Vendor | Service | Data Access |
|--------|---------|-------------|
| OpenAI | AI processing | Query content |
| Anthropic | AI processing | Query content |

### Integration Vendors (Tier: Medium)
| Vendor | Service | Data Access |
|--------|---------|-------------|
| Google Workspace | Sheets, Calendar, Drive | Connected data |

---

## Compliance

### Related Standards
- SOC 2 CC9.1
- GLBA Safeguards Rule
- NIST vendor management

---

## Change Log
| Date | Version | Change |
|------|---------|--------|
| 2026-01-20 | 1.0 | Initial policy |