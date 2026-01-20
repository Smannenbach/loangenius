# Supply Chain Security - LoanGenius

## Overview
Software supply chain security including SBOM, dependency management, and build provenance.

---

## SLSA Target

**Current Target: SLSA Level 1**
**Stretch Goal: SLSA Level 2**

| Level | Requirement | Status |
|-------|-------------|--------|
| L1 | Provenance exists | ✅ Target |
| L1 | Build process documented | ✅ Target |
| L2 | Hosted build platform | ⚠️ Stretch |
| L2 | Provenance authenticated | ⚠️ Stretch |

---

## SBOM (Software Bill of Materials)

### Format
- **Standard**: CycloneDX 1.5
- **Format**: JSON
- **Generation**: Per release

### SBOM Contents
```json
{
  "bomFormat": "CycloneDX",
  "specVersion": "1.5",
  "version": 1,
  "metadata": {
    "timestamp": "2026-01-20T00:00:00Z",
    "tools": [{ "name": "npm-sbom-generator" }],
    "component": {
      "name": "loangenius",
      "version": "1.0.0",
      "type": "application"
    }
  },
  "components": [
    {
      "name": "react",
      "version": "18.2.0",
      "type": "library",
      "purl": "pkg:npm/react@18.2.0",
      "licenses": [{ "id": "MIT" }]
    }
    // ... all dependencies
  ]
}
```

### SBOM Generation
```bash
# Generate SBOM for each release
npm run sbom:generate

# Output: sbom/loangenius-1.0.0-2026-01-20.json

# Store with release artifacts
npm run sbom:archive
```

### SBOM Storage
- Location: `sbom/` directory per release
- Retention: Forever (for compliance)
- Access: Read-only after generation

---

## Dependency Management

### Current Dependencies
See `package.json` for full list. Key dependencies:
- React 18.2.0
- Tailwind CSS
- @tanstack/react-query
- @base44/sdk
- Various Radix UI components

### Dependency Graph
```
loangenius
├── react@18.2.0
│   └── react-dom@18.2.0
├── @tanstack/react-query@5.84.1
├── @base44/sdk@0.8.3
├── tailwindcss (dev)
├── @radix-ui/* (UI components)
└── ... (see full SBOM)
```

---

## Vulnerability Management

### Scanning Tools
| Tool | Purpose | Frequency |
|------|---------|-----------|
| npm audit | Known vulnerabilities | Every build |
| Dependabot | Auto-update PRs | Daily |
| Snyk (optional) | Deep analysis | Weekly |

### CI Gate
```yaml
security-scan:
  script:
    - npm audit --audit-level=high
    - npm run deps:check-licenses
  allow_failure: false  # Blocks deploy on high/critical
```

### Vulnerability Response
| Severity | Response Time | Action |
|----------|---------------|--------|
| Critical | 24 hours | Immediate patch |
| High | 7 days | Prioritize patch |
| Medium | 30 days | Scheduled patch |
| Low | 90 days | Next release |

### Vulnerability Tracking
```markdown
## Active Vulnerabilities

| Package | Severity | CVE | Status | ETA |
|---------|----------|-----|--------|-----|
| None currently | - | - | - | - |

## Recently Patched

| Package | Severity | CVE | Patched | Version |
|---------|----------|-----|---------|---------|
| - | - | - | - | - |
```

---

## License Compliance

### Allowed Licenses
```javascript
const ALLOWED_LICENSES = [
  'MIT',
  'Apache-2.0',
  'BSD-2-Clause',
  'BSD-3-Clause',
  'ISC',
  '0BSD',
  'CC0-1.0',
  'Unlicense'
];
```

### Restricted Licenses
```javascript
const RESTRICTED_LICENSES = [
  'GPL-2.0',      // Copyleft
  'GPL-3.0',      // Copyleft
  'AGPL-3.0',     // Network copyleft
  'LGPL-2.0',     // Review required
  'LGPL-3.0',     // Review required
  'CC-BY-NC-*',   // Non-commercial
  'SSPL-1.0'      // Server-side copyleft
];
```

### License Check
```bash
# Check all dependency licenses
npm run deps:check-licenses

# Output:
# ✅ All licenses compliant
# 
# Or:
# ❌ Restricted license found:
#    - some-package@1.0.0: GPL-3.0
#    Action required: Review or replace
```

---

## Build Provenance

### Build Metadata
```json
{
  "builder": {
    "id": "base44-ci"
  },
  "buildType": "npm-build",
  "invocation": {
    "configSource": {
      "uri": "git+https://github.com/org/loangenius",
      "digest": { "sha256": "abc123..." },
      "entryPoint": "package.json"
    }
  },
  "buildConfig": {
    "commands": ["npm ci", "npm run build"]
  },
  "metadata": {
    "buildStartedOn": "2026-01-20T10:00:00Z",
    "buildFinishedOn": "2026-01-20T10:05:00Z",
    "completeness": {
      "parameters": true,
      "environment": true,
      "materials": true
    }
  },
  "materials": [
    {
      "uri": "pkg:npm/react@18.2.0",
      "digest": { "sha256": "..." }
    }
    // ... all dependencies
  ]
}
```

### Provenance Generation
```bash
# Generate provenance attestation
npm run build:provenance

# Output: provenance/build-2026-01-20.json
```

---

## Dependency Update Policy

### Automatic Updates
- **Patch versions**: Auto-merge if tests pass
- **Minor versions**: Auto-PR, manual review
- **Major versions**: Manual PR, thorough review

### Update Workflow
```
1. Dependabot creates PR
2. CI runs tests
3. Security scan runs
4. License check runs
5. If all pass:
   - Patch: Auto-merge
   - Minor/Major: Await review
```

### Lock File
- `package-lock.json` committed
- Updated only via CI
- Changes require review

---

## Integrity Verification

### Package Integrity
```bash
# Verify package integrity
npm ci --ignore-scripts  # Install without running scripts

# Verify checksums
npm audit signatures
```

### Build Reproducibility
```bash
# Clean build
rm -rf node_modules
npm ci
npm run build

# Compare output hash
sha256sum dist/*
```

---

## Third-Party Code Review

### Before Adding Dependency
- [ ] Check npm download stats
- [ ] Check GitHub stars/activity
- [ ] Review maintainer history
- [ ] Check for known vulnerabilities
- [ ] Verify license compatibility
- [ ] Review transitive dependencies
- [ ] Assess necessity (can we do without?)

### Periodic Review
- Quarterly review of all dependencies
- Remove unused dependencies
- Update outdated dependencies
- Re-assess necessity

---

## CI/CD Security

### Build Environment
- Isolated build containers
- No secrets in build logs
- Minimal permissions
- Reproducible builds

### Pipeline Security
```yaml
security-gates:
  - npm-audit
  - license-check
  - sbom-generate
  - provenance-generate
```

### Artifact Signing
```bash
# Sign release artifacts (stretch goal)
cosign sign --key cosign.key dist/app.js
```

---

## Incident Response

### Compromised Dependency Response
1. **Immediate**: Pin to known-good version
2. **Assess**: Determine if compromise affects us
3. **Mitigate**: Remove/replace if affected
4. **Communicate**: Notify stakeholders
5. **Review**: Post-incident analysis

### Supply Chain Attack Indicators
- Unexpected dependency updates
- New maintainers on critical packages
- Unusual postinstall scripts
- Typosquatting packages

---

## Monitoring

### Alerts
| Condition | Alert |
|-----------|-------|
| Critical vulnerability | Immediate |
| High vulnerability | Daily digest |
| License violation | Immediate |
| Unusual dependency change | Review required |

### Dashboard
- Vulnerability count by severity
- License distribution
- Dependency age
- Update velocity

---

## Change Log
- 2026-01-20: Initial supply chain security policy