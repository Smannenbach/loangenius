# File Upload & Download Security - LoanGenius

## Overview
Security controls for file handling - critical for loan document management.

---

## File Types

### Allowed File Types
| Type | Extensions | Max Size | Use Case |
|------|------------|----------|----------|
| PDF | .pdf | 25 MB | Loan docs, statements |
| Images | .jpg, .jpeg, .png, .gif | 10 MB | ID photos, property |
| Documents | .doc, .docx | 15 MB | Letters, contracts |
| Spreadsheets | .xls, .xlsx | 15 MB | Financial data |
| CSV | .csv | 10 MB | Data import |

### Blocked File Types
```javascript
const BLOCKED_EXTENSIONS = [
  // Executables
  '.exe', '.bat', '.cmd', '.com', '.msi', '.dll',
  // Scripts
  '.js', '.vbs', '.ps1', '.sh', '.php', '.py', '.rb',
  // Archives (unless scanned)
  '.zip', '.rar', '.7z', '.tar', '.gz',
  // Dangerous
  '.scr', '.pif', '.application', '.gadget',
  '.hta', '.cpl', '.msc', '.jar'
];
```

### MIME Type Validation
```javascript
const ALLOWED_MIME_TYPES = {
  'application/pdf': ['.pdf'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/gif': ['.gif'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/vnd.ms-excel': ['.xls'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'text/csv': ['.csv']
};
```

---

## Upload Security

### Upload Validation
```javascript
async function validateUpload(file, context) {
  const errors = [];
  
  // 1. Check file size
  if (file.size > MAX_FILE_SIZE) {
    errors.push(`File exceeds maximum size of ${MAX_FILE_SIZE / 1024 / 1024}MB`);
  }
  
  // 2. Check extension
  const ext = getExtension(file.name).toLowerCase();
  if (BLOCKED_EXTENSIONS.includes(ext)) {
    errors.push('File type not allowed');
  }
  
  // 3. Validate MIME type
  if (!ALLOWED_MIME_TYPES[file.type]) {
    errors.push('Invalid file type');
  }
  
  // 4. Extension matches MIME type
  if (ALLOWED_MIME_TYPES[file.type] && !ALLOWED_MIME_TYPES[file.type].includes(ext)) {
    errors.push('File extension does not match content type');
  }
  
  // 5. Check magic bytes (file signature)
  const isValid = await validateMagicBytes(file);
  if (!isValid) {
    errors.push('File content does not match declared type');
  }
  
  // 6. Filename sanitization
  const sanitizedName = sanitizeFilename(file.name);
  if (sanitizedName !== file.name) {
    // Log suspicious filename
    await logSecurityEvent('SUSPICIOUS_FILENAME', { original: file.name });
  }
  
  if (errors.length > 0) {
    throw new ValidationError(errors.join('; '));
  }
  
  return { sanitizedName, validated: true };
}
```

### Magic Bytes Validation
```javascript
const FILE_SIGNATURES = {
  'application/pdf': [[0x25, 0x50, 0x44, 0x46]], // %PDF
  'image/jpeg': [[0xFF, 0xD8, 0xFF]],
  'image/png': [[0x89, 0x50, 0x4E, 0x47]],
  'image/gif': [[0x47, 0x49, 0x46, 0x38]], // GIF8
};

async function validateMagicBytes(file) {
  const buffer = await file.slice(0, 8).arrayBuffer();
  const bytes = new Uint8Array(buffer);
  
  const signatures = FILE_SIGNATURES[file.type];
  if (!signatures) return true; // No signature check available
  
  return signatures.some(sig => 
    sig.every((byte, i) => bytes[i] === byte)
  );
}
```

### Filename Sanitization
```javascript
function sanitizeFilename(filename) {
  return filename
    // Remove path traversal
    .replace(/\.\./g, '')
    .replace(/[\/\\]/g, '')
    // Remove dangerous characters
    .replace(/[<>:"|?*\x00-\x1f]/g, '')
    // Limit length
    .slice(0, 255)
    // Remove leading/trailing dots and spaces
    .replace(/^[\s.]+|[\s.]+$/g, '');
}
```

---

## Storage Security

### Storage Rules
```
1. Never store in publicly accessible bucket
2. Use random/UUID filenames, not user-provided
3. Store org_id and uploader with file metadata
4. Encrypt at rest
5. Set restrictive permissions
```

### Secure File Path Generation
```javascript
function generateSecureFilePath(orgId, docType, originalName) {
  const uuid = crypto.randomUUID();
  const ext = getExtension(originalName);
  const timestamp = Date.now();
  
  // Format: org_id/doc_type/year/month/uuid.ext
  const year = new Date().getFullYear();
  const month = String(new Date().getMonth() + 1).padStart(2, '0');
  
  return `${orgId}/${docType}/${year}/${month}/${uuid}${ext}`;
}
```

### URL Security
```javascript
// ❌ FORBIDDEN - Guessable URL
const url = `https://storage.example.com/files/${filename}`;

// ✅ CORRECT - Signed URL with expiry
async function getSecureDownloadUrl(fileId, userId) {
  // Verify authorization first
  const canAccess = await verifyFileAccess(fileId, userId);
  if (!canAccess) throw new ForbiddenError();
  
  // Generate signed URL
  const signedUrl = await generateSignedUrl(fileId, {
    expiresIn: 15 * 60, // 15 minutes
    action: 'read'
  });
  
  return signedUrl;
}
```

---

## Download Authorization

### Authorization Check
```javascript
async function authorizeDownload(fileId, userId, userOrgId) {
  // 1. Get file metadata
  const file = await getFileMetadata(fileId);
  if (!file) {
    return { authorized: false, reason: 'not_found' };
  }
  
  // 2. Check org ownership
  if (file.org_id !== userOrgId) {
    await logSecurityEvent('CROSS_ORG_FILE_ACCESS', {
      fileId, userId, attemptedOrg: file.org_id
    });
    return { authorized: false, reason: 'wrong_org' };
  }
  
  // 3. Check user role permissions
  const canAccess = await checkFilePermission(userId, file);
  if (!canAccess) {
    return { authorized: false, reason: 'insufficient_permission' };
  }
  
  // 4. Log access
  await logAuditEvent('FILE_DOWNLOAD', {
    fileId, userId, filename: file.original_name
  });
  
  return { authorized: true, file };
}
```

### Download Endpoint
```javascript
async function handleDownload(req) {
  const { fileId } = await req.json();
  const { user, org_id } = await getAuthContext(req);
  
  // Authorization check
  const { authorized, file, reason } = await authorizeDownload(fileId, user.id, org_id);
  
  if (!authorized) {
    if (reason === 'not_found') {
      return Response.json({ error: 'File not found' }, { status: 404 });
    }
    return Response.json({ error: 'Access denied' }, { status: 403 });
  }
  
  // Generate signed URL
  const downloadUrl = await getSecureDownloadUrl(file.storage_path);
  
  return Response.json({ url: downloadUrl, expiresIn: 900 });
}
```

---

## Virus/Malware Scanning

### Scanning Strategy
```
Upload Flow:
1. File uploaded to quarantine storage
2. Scan queued
3. File scanned by AV service
4. If clean: Move to permanent storage
5. If infected: Delete + alert
6. User notified of result
```

### Scan Integration
```javascript
async function scanFile(fileBuffer, filename) {
  // Option 1: ClamAV API
  // Option 2: Cloud AV service (e.g., VirusTotal)
  // Option 3: Platform-provided scanning
  
  const scanResult = await avService.scan({
    data: fileBuffer,
    filename: filename
  });
  
  if (scanResult.infected) {
    await logSecurityEvent('MALWARE_DETECTED', {
      filename,
      threat: scanResult.threatName
    });
    
    // Delete file
    await deleteQuarantinedFile(fileId);
    
    throw new SecurityError('File contains malware');
  }
  
  return { clean: true, scannedAt: new Date().toISOString() };
}
```

### Scanning Policy
| File Type | Scan Required | Max Scan Time |
|-----------|---------------|---------------|
| All uploads | Yes | 30 seconds |
| Images | Yes (steganography) | 10 seconds |
| PDFs | Yes (embedded scripts) | 20 seconds |
| Office docs | Yes (macros) | 30 seconds |

---

## Content Security

### PDF Security
```javascript
// Check for JavaScript in PDFs
async function validatePdfContent(fileBuffer) {
  const text = await extractPdfText(fileBuffer);
  
  // Check for JavaScript
  if (/\/JavaScript|\/JS\s/i.test(text)) {
    throw new SecurityError('PDF contains JavaScript');
  }
  
  // Check for embedded files
  if (/\/EmbeddedFile/i.test(text)) {
    // Log but may allow
    await logSecurityEvent('PDF_EMBEDDED_FILE', {});
  }
  
  return true;
}
```

### Image Security
```javascript
// Validate image doesn't contain embedded data
async function validateImageContent(fileBuffer, mimeType) {
  // Check actual dimensions
  const dimensions = await getImageDimensions(fileBuffer);
  if (dimensions.width > 10000 || dimensions.height > 10000) {
    throw new ValidationError('Image dimensions too large');
  }
  
  // Strip EXIF data (privacy)
  const cleaned = await stripExifData(fileBuffer);
  
  return cleaned;
}
```

---

## Audit Trail

### File Events to Log
| Event | Data Logged |
|-------|-------------|
| UPLOAD | user, filename, size, type, deal_id |
| DOWNLOAD | user, filename, deal_id |
| DELETE | user, filename, reason |
| SHARE | user, filename, shared_with |
| SCAN_RESULT | filename, result, threat |

---

## File Security Checklist

### Upload
- [ ] File type allowed
- [ ] Extension matches MIME
- [ ] Magic bytes validated
- [ ] Size within limit
- [ ] Filename sanitized
- [ ] Virus scan passed
- [ ] Stored with org_id
- [ ] Stored with random name

### Download
- [ ] User authenticated
- [ ] Org ownership verified
- [ ] Role permission checked
- [ ] Signed URL used
- [ ] Access logged

---

## Change Log
- 2026-01-20: Initial file security policy