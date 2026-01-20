/**
 * Config Validator for Backend Functions
 * Validates required secrets exist at runtime
 * Fail-fast with clear error messages (no secret values exposed)
 */

/**
 * Validates that required environment variables exist
 * @param {string[]} requiredVars - Array of required variable names
 * @returns {{valid: boolean, missing: string[]}}
 */
export function validateConfig(requiredVars) {
  const missing = [];
  
  for (const varName of requiredVars) {
    const value = Deno.env.get(varName);
    if (!value || value.trim() === '') {
      missing.push(varName);
    }
  }
  
  return {
    valid: missing.length === 0,
    missing
  };
}

/**
 * Returns a 500 response for missing config
 * @param {string[]} missing - Array of missing variable names
 * @returns {Response}
 */
export function missingConfigResponse(missing) {
  return Response.json({
    error: 'Server configuration error',
    message: `Missing required environment variables: ${missing.join(', ')}`,
    hint: 'Contact administrator to configure these in the deployment settings'
  }, { status: 500 });
}

/**
 * Validates encryption key is configured
 * @returns {{valid: boolean, response?: Response}}
 */
export function validateEncryptionKey() {
  const result = validateConfig(['INTEGRATION_ENCRYPTION_KEY']);
  if (!result.valid) {
    return {
      valid: false,
      response: missingConfigResponse(result.missing)
    };
  }
  return { valid: true };
}

/**
 * Redacts sensitive values from logs
 * Masks anything that looks like a token, key, or secret
 * @param {any} data - Data to redact
 * @returns {any} - Redacted data safe to log
 */
export function redact(data) {
  if (data === null || data === undefined) return data;
  
  // Sensitive field patterns
  const sensitivePatterns = [
    /token/i,
    /secret/i,
    /password/i,
    /api_?key/i,
    /authorization/i,
    /credential/i,
    /auth/i,
    /bearer/i,
    /cookie/i,
    /session/i,
    /private/i,
    /ciphertext/i,
    /encrypted/i
  ];
  
  const isSensitiveKey = (key) => {
    return sensitivePatterns.some(pattern => pattern.test(key));
  };
  
  const redactValue = (val) => {
    if (typeof val === 'string' && val.length > 0) {
      if (val.length <= 8) return '***';
      return val.substring(0, 4) + '...' + val.substring(val.length - 4);
    }
    return '***';
  };
  
  if (typeof data === 'string') {
    // If the string itself looks like a token, redact it
    if (data.length > 20 && /^[A-Za-z0-9+/=_-]+$/.test(data)) {
      return redactValue(data);
    }
    return data;
  }
  
  if (Array.isArray(data)) {
    return data.map(item => redact(item));
  }
  
  if (typeof data === 'object') {
    const result = {};
    for (const [key, value] of Object.entries(data)) {
      if (isSensitiveKey(key)) {
        result[key] = redactValue(value);
      } else if (typeof value === 'object' && value !== null) {
        result[key] = redact(value);
      } else {
        result[key] = value;
      }
    }
    return result;
  }
  
  return data;
}

/**
 * Safe logging helper - automatically redacts sensitive data
 * @param {string} level - Log level (info, warn, error)
 * @param {string} message - Log message
 * @param {any} data - Optional data to log (will be redacted)
 */
export function safeLog(level, message, data = null) {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
  
  if (data) {
    console.log(`${prefix} ${message}`, redact(data));
  } else {
    console.log(`${prefix} ${message}`);
  }
}