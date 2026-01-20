/**
 * Encryption helper for sensitive fields (SSN, DOB, EIN)
 * Uses AES-256-GCM with org-specific keys stored in environment
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const ENCRYPTION_KEY = Deno.env.get('ENCRYPTION_KEY'); // 32-byte hex string
const ALGORITHM = 'AES-GCM';
const IV_LENGTH = 12; // bytes for GCM
const AUTH_TAG_LENGTH = 16; // bytes

/**
 * Encrypt a sensitive value using Web Crypto API
 * @param {string} plaintext - Value to encrypt
 * @returns {Promise<string>} - Base64-encoded ciphertext with IV prepended
 */
async function encrypt(plaintext) {
  if (!plaintext || !ENCRYPTION_KEY) return null;
  
  const keyData = hexToBytes(ENCRYPTION_KEY);
  const key = await crypto.subtle.importKey(
    'raw', keyData, { name: ALGORITHM }, false, ['encrypt']
  );
  
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const encoded = new TextEncoder().encode(String(plaintext));
  
  const ciphertext = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv }, key, encoded
  );
  
  // Combine IV + ciphertext
  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(ciphertext), iv.length);
  
  return btoa(String.fromCharCode(...combined));
}

/**
 * Decrypt a sensitive value using Web Crypto API
 * @param {string} encrypted - Base64-encoded ciphertext
 * @returns {Promise<string>} - Decrypted plaintext
 */
async function decrypt(encrypted) {
  if (!encrypted || !ENCRYPTION_KEY) return null;
  
  const keyData = hexToBytes(ENCRYPTION_KEY);
  const key = await crypto.subtle.importKey(
    'raw', keyData, { name: ALGORITHM }, false, ['decrypt']
  );
  
  const combined = Uint8Array.from(atob(encrypted), c => c.charCodeAt(0));
  const iv = combined.slice(0, IV_LENGTH);
  const ciphertext = combined.slice(IV_LENGTH);
  
  const decrypted = await crypto.subtle.decrypt(
    { name: ALGORITHM, iv }, key, ciphertext
  );
  
  return new TextDecoder().decode(decrypted);
}

function hexToBytes(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

/**
 * Mask sensitive field for logging (SSN → ***-**-1234)
 * @param {string} fieldName - Field name
 * @param {string} value - Value to mask
 * @returns {string} - Masked value
 */
function maskSensitiveField(fieldName, value) {
  if (!value) return '[REDACTED]';
  
  const field = fieldName.toLowerCase();
  const str = String(value);
  
  if (field === 'ssn' || field === 'social_security_number') {
    return `***-**-${str.slice(-4)}`;
  }
  if (field === 'ein' || field === 'tax_id') {
    return `**-***${str.slice(-4)}`;
  }
  if (field === 'email') {
    const [local, domain] = str.split('@');
    return `${local[0]}***@${domain}`;
  }
  if (field === 'phone') {
    return str.replace(/\d(?=\d{4})/g, '*');
  }
  if (field === 'password' || field === 'secret' || field === 'token') {
    return '[REDACTED]';
  }
  if (field === 'bank_account' || field === 'account_number') {
    return `****${str.slice(-4)}`;
  }
  
  return value;
}

/**
 * Check if field should be encrypted
 * @param {string} fieldName
 * @returns {boolean}
 */
function shouldEncrypt(fieldName) {
  const sensitiveFields = [
    'ssn', 'social_security_number',
    'dob', 'date_of_birth',
    'ein', 'tax_id',
    'bank_account', 'account_number',
    'credit_card',
    'drivers_license',
    'password', 'secret'
  ];
  return sensitiveFields.includes(fieldName.toLowerCase());
}

// HTTP handler
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { action, data, field_name } = body;

    if (!ENCRYPTION_KEY) {
      return Response.json({ 
        error: 'ENCRYPTION_KEY not configured',
        warning: 'Encryption disabled - set ENCRYPTION_KEY environment variable'
      }, { status: 400 });
    }

    if (action === 'encrypt' && data) {
      const encrypted = await encrypt(data);
      return Response.json({ success: true, encrypted });
    }

    if (action === 'decrypt' && data) {
      const decrypted = await decrypt(data);
      return Response.json({ success: true, decrypted });
    }

    if (action === 'mask' && data && field_name) {
      const masked = maskSensitiveField(field_name, data);
      return Response.json({ success: true, masked });
    }

    if (action === 'check' && field_name) {
      const needsEncryption = shouldEncrypt(field_name);
      return Response.json({ success: true, needs_encryption: needsEncryption });
    }

    return Response.json({ 
      error: 'Invalid action. Use: encrypt, decrypt, mask, or check',
      available_actions: ['encrypt', 'decrypt', 'mask', 'check']
    }, { status: 400 });
  } catch (error) {
    console.error('Error in encryptionHelper:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});