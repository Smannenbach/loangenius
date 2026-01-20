/**
 * Safe Logger - Prevents PII leakage in logs
 * Use this for ALL backend function logging
 */

// PII patterns to redact (OWASP compliant - no sensitive data in logs)
const PII_PATTERNS = [
  // SSN: XXX-XX-XXXX or XXXXXXXXX
  { pattern: /\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b/g, name: 'SSN', replacement: '[SSN-REDACTED]' },
  // DOB: Various date formats (MM/DD/YYYY, MM-DD-YYYY, YYYY-MM-DD)
  { pattern: /\b(0?[1-9]|1[0-2])[-\/](0?[1-9]|[12]\d|3[01])[-\/](19|20)\d{2}\b/g, name: 'DOB', replacement: '[DOB-REDACTED]' },
  { pattern: /\b(19|20)\d{2}[-\/](0?[1-9]|1[0-2])[-\/](0?[1-9]|[12]\d|3[01])\b/g, name: 'DOB-ISO', replacement: '[DOB-REDACTED]' },
  // Tax ID / EIN: XX-XXXXXXX
  { pattern: /\b\d{2}[-\s]?\d{7}\b/g, name: 'EIN', replacement: '[TAX-ID-REDACTED]' },
  // Bank account numbers (8-17 digits)
  { pattern: /\b\d{8,17}\b/g, name: 'BANK', replacement: '[ACCT-REDACTED]' },
  // Credit card numbers (various formats)
  { pattern: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g, name: 'CC', replacement: '[CC-REDACTED]' },
  { pattern: /\b3[47]\d{13}\b/g, name: 'AMEX', replacement: '[CC-REDACTED]' },
  // Routing numbers (9 digits starting with 0-3)
  { pattern: /\b[0-3]\d{8}\b/g, name: 'ROUTING', replacement: '[ROUTING-REDACTED]' },
  // Email addresses
  { pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/gi, name: 'EMAIL', replacement: '[EMAIL-REDACTED]' },
  // Phone numbers (various formats)
  { pattern: /\b(?:\+1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g, name: 'PHONE', replacement: '[PHONE-REDACTED]' },
  // IP addresses
  { pattern: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g, name: 'IP', replacement: '[IP-REDACTED]' },
  // Bearer tokens and API keys (common patterns)
  { pattern: /Bearer\s+[A-Za-z0-9\-_.~+/]+=*/gi, name: 'TOKEN', replacement: 'Bearer [TOKEN-REDACTED]' },
  { pattern: /\b(sk|pk|api)[-_][a-zA-Z0-9]{20,}\b/gi, name: 'APIKEY', replacement: '[APIKEY-REDACTED]' },
];

// Sensitive field names that should never be logged
const SENSITIVE_FIELDS = new Set([
  'ssn', 'social_security', 'social_security_number', 'ssn_last_four',
  'dob', 'date_of_birth', 'birth_date', 'birthdate',
  'ein', 'tax_id', 'ein_last_four', 'entity_ein',
  'bank_account', 'account_number', 'routing_number',
  'credit_card', 'card_number', 'cvv', 'cvc',
  'password', 'secret', 'api_key', 'access_token', 'refresh_token',
  'api_key_encrypted', 'ciphertext_b64', 'iv_b64',
]);

/**
 * Redact sensitive patterns from a string
 */
function redactString(str) {
  if (typeof str !== 'string') return str;
  
  let result = str;
  for (const { pattern, replacement } of PII_PATTERNS) {
    result = result.replace(pattern, replacement);
  }
  return result;
}

/**
 * Recursively sanitize an object, removing/redacting sensitive fields
 */
function sanitizeObject(obj, depth = 0) {
  if (depth > 10) return '[MAX_DEPTH]';
  if (obj === null || obj === undefined) return obj;
  
  if (typeof obj === 'string') {
    return redactString(obj);
  }
  
  if (Array.isArray(obj)) {
    return obj.slice(0, 20).map(item => sanitizeObject(item, depth + 1));
  }
  
  if (typeof obj === 'object') {
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      const lowerKey = key.toLowerCase();
      
      if (SENSITIVE_FIELDS.has(lowerKey)) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'string') {
        sanitized[key] = redactString(value);
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = sanitizeObject(value, depth + 1);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }
  
  return obj;
}

/**
 * Safe logger that redacts PII
 */
export const safeLog = {
  info: (message, data) => {
    const sanitized = data ? sanitizeObject(data) : undefined;
    console.log(`[INFO] ${message}`, sanitized ? JSON.stringify(sanitized) : '');
  },
  
  warn: (message, data) => {
    const sanitized = data ? sanitizeObject(data) : undefined;
    console.warn(`[WARN] ${message}`, sanitized ? JSON.stringify(sanitized) : '');
  },
  
  error: (message, error, context) => {
    const sanitizedContext = context ? sanitizeObject(context) : undefined;
    const errorMsg = error?.message || String(error);
    console.error(`[ERROR] ${message}:`, redactString(errorMsg), sanitizedContext ? JSON.stringify(sanitizedContext) : '');
  },
  
  debug: (message, data) => {
    // Only log debug in non-production
    if (Deno.env.get('DENO_ENV') === 'production') return;
    const sanitized = data ? sanitizeObject(data) : undefined;
    console.log(`[DEBUG] ${message}`, sanitized ? JSON.stringify(sanitized) : '');
  },
  
  // Utility to create a safe summary for audit logs
  auditSummary: (action, entity, entityId, userId) => ({
    action,
    entity,
    entity_id: entityId,
    user: userId,
    timestamp: new Date().toISOString(),
  }),
};

export default safeLog;